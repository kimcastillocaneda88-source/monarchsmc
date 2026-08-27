"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextArea, TextInput } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import {
  blurFacesInImage,
  blurFacesInVideo,
  isFaceBlurAvailable,
  type BlurResult,
} from "@/lib/media/face-blur";
import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  maxBytesForKind,
} from "@/lib/validation/schemas";
import type { FaceBlurStatus, MediaKind } from "@/types";

const ACCEPT = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES].join(",");

type Phase = "idle" | "processing" | "uploading" | "saving" | "done";

interface Prepared extends BlurResult {
  kind: MediaKind;
  originalName: string;
}

/** What kind of thing the browser thinks this is, by declared type. */
function kindOf(file: File): MediaKind | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return "video";
  if (ALLOWED_DOCUMENT_TYPES.includes(file.type)) return "file";
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const BLUR_SUMMARY: Record<FaceBlurStatus, string> = {
  applied: "Faces found and blurred.",
  no_faces: "No faces were found in this file.",
  unsupported: "Face blurring does not apply to this kind of file.",
  unavailable: "Face blurring could not run in this browser.",
};

/**
 * The member upload form.
 *
 * The order of operations is the security-relevant part. A photograph or video
 * is processed *first*, entirely on this device, and only the processed result
 * is ever sent. Nothing asks the server for permission to upload until there is
 * a blurred file to upload, so an unblurred original is never transmitted even
 * if the upload is later abandoned or fails.
 *
 * Uploading then goes straight to Cloud Storage through a signed URL the server
 * issues for one specific object. The server checks the caller's permission
 * before issuing it, and reads the stored bytes back afterwards to confirm the
 * file is what was authorised.
 */
export function MediaUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [blurSupported, setBlurSupported] = useState<boolean | null>(null);

  useEffect(() => {
    isFaceBlurAvailable().then(setBlurSupported).catch(() => setBlurSupported(false));
  }, []);

  // Object URLs for the preview are revoked when they are replaced and when the
  // component goes away, so a large video is not pinned in memory.
  const setPreview = useCallback((blob: Blob | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = blob ? URL.createObjectURL(blob) : null;
    setPreviewUrl(previewRef.current);
  }, []);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  function reset() {
    setPrepared(null);
    setPreview(null);
    setProgress(0);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setNotice(null);
    setPrepared(null);
    setPreview(null);
    setProgress(0);

    const kind = kindOf(file);
    if (!kind) {
      setError("That file type is not accepted. Upload a photo, a video, a PDF, a Word or Excel file, or plain text.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const limit = maxBytesForKind(kind);
    if (file.size > limit) {
      setError(`That file is too large. The limit for a ${kind} is ${Math.round(limit / (1024 * 1024))} MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setPhase("processing");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let result: BlurResult;

      if (kind === "image") {
        result = await blurFacesInImage(file);
      } else if (kind === "video") {
        result = await blurFacesInVideo(
          file,
          ({ progress: p }) => setProgress(p),
          controller.signal,
        );
      } else {
        // A document has no faces to find; it is uploaded as it is.
        result = {
          blob: file,
          status: "unsupported",
          facesBlurred: 0,
          contentType: file.type,
          fileName: file.name,
        };
      }

      // Processing a video re-encodes it, and the result can exceed the ceiling
      // even when the source did not.
      const processedLimit = maxBytesForKind(kind);
      if (result.blob.size > processedLimit) {
        setError(
          `The processed file is ${formatBytes(result.blob.size)}, over the ${Math.round(processedLimit / (1024 * 1024))} MB limit. Try a shorter clip.`,
        );
        setPhase("idle");
        return;
      }

      setPrepared({ ...result, kind, originalName: file.name });
      if (kind !== "file") setPreview(result.blob);
      setPhase("idle");
      setProgress(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That file could not be processed.");
      setPhase("idle");
    } finally {
      abortRef.current = null;
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prepared) return;

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const caption = String(form.get("caption") ?? "").trim();

    if (title.length < 2) {
      setError("Give this a title of at least 2 characters.");
      return;
    }

    setError(null);
    setPhase("uploading");

    try {
      // 1. Ask permission for this exact file. The server decides the path.
      const ticketResponse = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: prepared.kind,
          fileName: prepared.fileName,
          contentType: prepared.contentType,
          sizeBytes: prepared.blob.size,
        }),
      });
      const ticket = (await ticketResponse.json().catch(() => ({}))) as {
        uploadId?: string;
        uploadUrl?: string;
        message?: string;
      };
      if (!ticketResponse.ok || !ticket.uploadUrl || !ticket.uploadId) {
        throw new Error(ticket.message ?? "That upload was not authorised.");
      }

      // 2. Send the processed bytes straight to storage. The Content-Type must
      //    match the one the signature was issued for.
      const put = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": prepared.contentType },
        body: prepared.blob,
      });
      if (!put.ok) throw new Error("The upload did not complete. Please try again.");

      // 3. Have the server verify the stored object and record it.
      setPhase("saving");
      const completion = await fetch("/api/media/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: ticket.uploadId,
          title,
          caption,
          faceBlur: prepared.status,
          facesBlurred: prepared.facesBlurred,
        }),
      });
      const saved = (await completion.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!completion.ok) throw new Error(saved.message ?? "That upload could not be saved.");

      setNotice(saved.message ?? "Uploaded.");
      setPhase("done");
      reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That upload failed. Please try again.");
      setPhase("idle");
    }
  }

  const busy = phase !== "idle" && phase !== "done";

  return (
    <div className="space-y-6">
      {blurSupported === false ? (
        <FormMessage tone="error" title="Face blurring is unavailable">
          This browser cannot run the face detector, so photos and videos would upload without faces
          being blurred. Use a recent Chrome, Edge, Firefox or Safari before uploading anything with
          people in it.
        </FormMessage>
      ) : null}

      {error ? (
        <FormMessage tone="error" title="Not uploaded">
          {error}
        </FormMessage>
      ) : null}

      {notice ? (
        <FormMessage tone="success" title="Uploaded">
          {notice}
        </FormMessage>
      ) : null}

      <div className="space-y-3">
        <label
          htmlFor="media-file"
          className="block font-display text-[0.6875rem] tracking-[0.2em] text-mist uppercase"
        >
          Choose a file
        </label>
        <input
          ref={inputRef}
          id="media-file"
          type="file"
          accept={ACCEPT}
          onChange={handleFile}
          disabled={busy}
          className={cn(
            "block w-full text-sm text-mist",
            "file:mr-4 file:min-h-10 file:cursor-pointer file:border file:border-iron file:bg-transparent",
            "file:px-4 file:font-display file:text-[0.625rem] file:tracking-[0.18em] file:text-bone file:uppercase",
            "hover:file:border-gold hover:file:text-gold",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          )}
        />
        <p className="text-xs leading-relaxed text-smoke">
          Photos up to {Math.round(maxBytesForKind("image") / (1024 * 1024))} MB, video up to{" "}
          {Math.round(maxBytesForKind("video") / (1024 * 1024))} MB, documents up to{" "}
          {Math.round(maxBytesForKind("file") / (1024 * 1024))} MB. Faces in photos and video are
          blurred on this device before anything is sent.
        </p>
      </div>

      {phase === "processing" ? (
        <div className="border border-ash bg-charcoal/60 p-5">
          <p className="flex items-center gap-2.5 font-display text-[0.6875rem] tracking-[0.2em] text-gold uppercase">
            <Spinner /> Blurring faces on this device
          </p>
          {progress > 0 ? (
            <>
              <div
                className="mt-4 h-1 w-full bg-ash"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-label="Processing video"
              >
                <div className="h-full bg-gold" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-smoke">
                Video is processed as it plays, so this takes about as long as the clip itself.
                Leave this tab open.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      {prepared ? (
        <form onSubmit={handleSubmit} className="space-y-6 border border-ash bg-charcoal/40 p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="w-full max-w-64 shrink-0">
              {prepared.kind === "image" && previewUrl ? (
                // A local object URL for a file this member just processed;
                // next/image would add nothing here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview of the processed upload, with faces blurred"
                  className="w-full border border-ash object-cover"
                />
              ) : prepared.kind === "video" && previewUrl ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="w-full border border-ash"
                  aria-label="Preview of the processed video, with faces blurred"
                />
              ) : (
                <div className="u-hatch flex min-h-28 items-center justify-center border border-dashed border-ash px-3 text-center">
                  <span className="font-display text-[0.5625rem] tracking-[0.16em] text-gold uppercase">
                    {prepared.originalName}
                  </span>
                </div>
              )}
            </div>

            <dl className="min-w-0 flex-1 space-y-2 text-xs leading-relaxed">
              <div className="flex flex-wrap gap-2">
                <dt className="text-smoke">Face blur</dt>
                <dd
                  className={cn(
                    prepared.status === "applied" || prepared.status === "no_faces"
                      ? "text-success"
                      : prepared.status === "unavailable"
                        ? "text-danger"
                        : "text-mist",
                  )}
                >
                  {BLUR_SUMMARY[prepared.status]}
                  {prepared.status === "applied"
                    ? ` (${prepared.facesBlurred} ${prepared.facesBlurred === 1 ? "face" : "faces"})`
                    : ""}
                </dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-smoke">Ready to send</dt>
                <dd className="text-mist">{formatBytes(prepared.blob.size)}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-smoke">Original</dt>
                <dd className="break-all text-mist">{prepared.originalName}</dd>
              </div>
            </dl>
          </div>

          {prepared.status === "unavailable" ? (
            <FormMessage tone="error" title="Faces were not blurred">
              The detector could not run, so this file is unchanged. Upload it only if you are
              certain no identifiable faces appear in it.
            </FormMessage>
          ) : null}

          <TextInput
            id="title"
            label="Title"
            type="text"
            required
            maxLength={140}
            defaultValue={prepared.originalName.replace(/\.[^.]+$/, "")}
          />

          <TextArea id="caption" label="Caption" rows={3} maxLength={600} />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy} size="lg" withArrow={!busy}>
              {busy ? <Spinner /> : null}
              {phase === "uploading" ? "Uploading…" : phase === "saving" ? "Saving…" : "Upload"}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={reset} disabled={busy}>
              Discard
            </Button>
          </div>

          <p className="border-t border-ash pt-5 text-xs leading-relaxed text-smoke">
            Uploads are reviewed by a club officer before anyone else can see them.
          </p>
        </form>
      ) : null}
    </div>
  );
}
