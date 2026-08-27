"use client";

import type { FaceBlurStatus } from "@/types";

/**
 * Automatic face blurring, in the browser, before anything is uploaded.
 *
 * Why here and not on the server: the point of the feature is that an
 * identifiable face never leaves the device it was taken on. Blurring after
 * upload would mean the club's storage had held the unblurred original, however
 * briefly, and that a copy existed somewhere it could be recovered from. Doing
 * it here means the original is never transmitted at all — the bytes that go up
 * are the blurred ones, and the untouched file stays on the uploader's machine.
 *
 * The cost of that choice is honest and worth stating: this runs on the
 * uploader's hardware, so a modified client could skip it. That is why the
 * server records what the browser reported rather than believing it, and why
 * every upload lands unapproved for an officer to look at. The blur is a strong
 * default, not an enforcement boundary.
 *
 * Detection uses the TinyFaceDetector model, served from /models on this origin
 * rather than a public CDN, so no third party sees what is being uploaded.
 */

/** Everything face-api needs, resolved once and shared. */
interface Detector {
  detect: (input: HTMLCanvasElement | HTMLVideoElement) => Promise<FaceBox[]>;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlurResult {
  blob: Blob;
  status: FaceBlurStatus;
  facesBlurred: number;
  contentType: string;
  fileName: string;
}

let detectorPromise: Promise<Detector | null> | null = null;

/**
 * Loads the detector once per page.
 *
 * face-api pulls in TensorFlow.js and is well over a megabyte, so it is
 * imported dynamically: someone who never uploads anything never downloads it.
 */
async function getDetector(): Promise<Detector | null> {
  detectorPromise ??= (async () => {
    try {
      const faceapi = await import("@vladmandic/face-api");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      const options = new faceapi.TinyFaceDetectorOptions({
        // 416 is the accuracy/speed balance that keeps video processing close
        // to real time while still finding faces well back in a group shot.
        inputSize: 416,
        scoreThreshold: 0.35,
      });

      return {
        async detect(input) {
          const found = await faceapi.detectAllFaces(input, options);
          return found.map((face) => ({
            x: face.box.x,
            y: face.box.y,
            width: face.box.width,
            height: face.box.height,
          }));
        },
      };
    } catch {
      // A blocked model file, an unsupported browser, no WebGL. The caller
      // decides what to do; this must never throw into an upload.
      return null;
    }
  })();

  return detectorPromise;
}

/** True when face detection can run at all in this browser. */
export async function isFaceBlurAvailable(): Promise<boolean> {
  return (await getDetector()) !== null;
}

/**
 * Widens a detected box before blurring it.
 *
 * The detector returns a tight crop of the facial features, which leaves hair,
 * jawline and ears — all of them recognisable — outside the blur. Padding is
 * generous on purpose: over-blurring costs a little of the photograph, while
 * under-blurring costs the anonymity the feature exists to provide.
 */
function padBox(box: FaceBox, width: number, height: number, factor = 0.45): FaceBox {
  const padX = box.width * factor;
  const padY = box.height * factor;
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  return {
    x,
    y,
    width: Math.min(width - x, box.width + padX * 2),
    height: Math.min(height - y, box.height + padY * 2),
  };
}

/**
 * Blurs one region of a canvas.
 *
 * Two passes, deliberately. A heavy stack blur hides the features; pixelating
 * on top of it destroys the fine detail that blur-inversion techniques can
 * sometimes recover. Neither pass alone is as hard to undo as both together.
 */
function blurRegion(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  box: FaceBox,
  sourceWidth: number,
  sourceHeight: number,
) {
  const x = Math.round(box.x);
  const y = Math.round(box.y);
  const w = Math.round(box.width);
  const h = Math.round(box.height);
  if (w <= 0 || h <= 0) return;

  const radius = Math.max(8, Math.round(Math.min(w, h) / 4));

  ctx.save();
  // An ellipse reads as a deliberate treatment rather than a rectangle stuck
  // on the photograph, and covers the head shape more closely.
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.filter = "none";

  // Pixelate: shrink the blurred region to a few pixels, then scale it back.
  const cells = 6;
  const scratch = document.createElement("canvas");
  scratch.width = cells;
  scratch.height = cells;
  const scratchCtx = scratch.getContext("2d");
  if (scratchCtx) {
    scratchCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, cells, cells);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scratch, 0, 0, cells, cells, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  }

  ctx.restore();
}

/** Longest edge an uploaded still is scaled down to. */
const MAX_IMAGE_EDGE = 2560;

/**
 * Blurs every face in a photograph.
 *
 * Returns the re-encoded image. The file that comes back is always a JPEG,
 * because re-encoding is what guarantees the original pixels — and any EXIF
 * location data that came with them — are gone rather than merely covered.
 */
export async function blurFacesInImage(file: File): Promise<BlurResult> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That image could not be read.");

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process images.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const detector = await getDetector();
  let status: FaceBlurStatus = "unavailable";
  let facesBlurred = 0;

  if (detector) {
    const boxes = await detector.detect(canvas);
    // Blur from a clean copy so each region is drawn from the unmodified
    // frame rather than from a neighbour's already-blurred pixels.
    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    source.getContext("2d")?.drawImage(canvas, 0, 0);

    for (const box of boxes) {
      blurRegion(ctx, source, padBox(box, width, height), width, height);
      facesBlurred += 1;
    }
    status = facesBlurred > 0 ? "applied" : "no_faces";
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("That image could not be processed.");

  return {
    blob,
    status,
    facesBlurred,
    contentType: "image/jpeg",
    fileName: `${file.name.replace(/\.[^.]+$/, "")}.jpg`,
  };
}

/** Longest edge a processed video is scaled down to. */
const MAX_VIDEO_EDGE = 1280;
/** How often faces are re-detected while a video plays. */
const DETECT_INTERVAL_MS = 120;

export interface VideoBlurProgress {
  /** 0–1, by playback position. */
  progress: number;
  facesInFrame: number;
}

/**
 * Blurs faces throughout a video.
 *
 * The video is played once, each frame is drawn to a canvas with the faces
 * blurred, and the canvas is recorded to a new file. Playing it rather than
 * seeking frame by frame keeps the audio track, which is captured from the
 * source element and muxed into the recording.
 *
 * Detection does not run on every frame — it cannot, and keep up with playback.
 * It runs on a short interval and the boxes found are reused for the frames in
 * between, which is why {@link padBox} is generous: the padding has to cover
 * however far a head moves between detections.
 *
 * The result is always WebM, the format MediaRecorder is guaranteed to produce.
 */
export async function blurFacesInVideo(
  file: File,
  onProgress?: (progress: VideoBlurProgress) => void,
  signal?: AbortSignal,
): Promise<BlurResult> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot process video. Try a recent Chrome, Edge or Firefox.");
  }

  const detector = await getDetector();

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("That video could not be read."));
    });

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("That video could not be read.");
    }

    const scale = Math.min(1, MAX_VIDEO_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot process video.");

    const stream = canvas.captureStream(30);

    // Carry the original audio across. captureStream on the element is not
    // available everywhere, and a video with no audio track has nothing to
    // carry, so neither case is treated as a failure.
    try {
      const elementStream = (
        video as HTMLVideoElement & { captureStream?: () => MediaStream }
      ).captureStream?.();
      for (const track of elementStream?.getAudioTracks() ?? []) {
        stream.addTrack(track);
      }
    } catch {
      // Recording continues without audio.
    }

    const mimeType = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error("This browser cannot record processed video.");

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    let boxes: FaceBox[] = [];
    let peakFaces = 0;
    let detecting = false;
    let lastDetectAt = 0;
    let frameHandle = 0;

    /** Clean copy of the current frame, used as the source for each blur. */
    const scratch = document.createElement("canvas");
    scratch.width = width;
    scratch.height = height;
    const scratchCtx = scratch.getContext("2d");

    /**
     * A second clean copy, kept solely for the detector.
     *
     * Detection cannot read the output canvas: it is asynchronous, and the
     * frames drawn while it is in flight are already blurred. Feeding it those
     * would mean detecting faces in an image whose faces have been hidden —
     * the boxes would come back empty, the blur would stop following the
     * subject, and the feature would quietly fail part-way through a clip.
     *
     * This canvas is written only when no detection is running (`detecting`
     * stays true until the promise settles), so the pixels cannot change
     * underneath a detection in progress.
     */
    const detectCanvas = document.createElement("canvas");
    detectCanvas.width = width;
    detectCanvas.height = height;
    const detectCtx = detectCanvas.getContext("2d");

    function renderFrame() {
      ctx!.drawImage(video, 0, 0, width, height);

      // Snapshot the clean frame before anything is blurred over it.
      scratchCtx?.drawImage(canvas, 0, 0);

      const now = performance.now();
      if (detector && detectCtx && !detecting && now - lastDetectAt >= DETECT_INTERVAL_MS) {
        detecting = true;
        lastDetectAt = now;
        detectCtx.drawImage(scratch, 0, 0);
        // Deliberately not awaited: detection runs alongside playback and the
        // frames in between reuse the previous boxes until it resolves.
        detector
          .detect(detectCanvas)
          .then((found) => {
            boxes = found;
            if (found.length > peakFaces) peakFaces = found.length;
          })
          .catch(() => {
            // One failed detection must not stop the recording; the previous
            // boxes stay in force.
          })
          .finally(() => {
            detecting = false;
          });
      }

      if (boxes.length > 0 && scratchCtx) {
        for (const box of boxes) {
          blurRegion(ctx!, scratch, padBox(box, width, height), width, height);
        }
      }

      onProgress?.({
        progress: video.duration ? Math.min(1, video.currentTime / video.duration) : 0,
        facesInFrame: boxes.length,
      });

      frameHandle = requestAnimationFrame(renderFrame);
    }

    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.onerror = () => reject(new Error("That video could not be processed."));
    });

    function stop() {
      cancelAnimationFrame(frameHandle);
      if (recorder.state !== "inactive") recorder.stop();
      for (const track of stream.getTracks()) track.stop();
    }

    video.onended = stop;
    signal?.addEventListener("abort", stop, { once: true });

    recorder.start(1000);
    renderFrame();

    try {
      await video.play();
    } catch {
      // Autoplay was refused, or the file cannot be decoded here. Tear the
      // recorder and its tracks down rather than leaving them running.
      stop();
      throw new Error("This browser would not play that video, so it could not be processed.");
    }

    const blob = await finished;

    if (signal?.aborted) throw new Error("Upload cancelled.");
    if (blob.size === 0) throw new Error("That video could not be processed.");

    return {
      blob,
      status: detector ? (peakFaces > 0 ? "applied" : "no_faces") : "unavailable",
      facesBlurred: peakFaces,
      contentType: "video/webm",
      fileName: `${file.name.replace(/\.[^.]+$/, "")}.webm`,
    };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
