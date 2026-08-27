/**
 * Server-side file validation.
 *
 * The browser controls the filename, the declared MIME type and the extension,
 * so none of them can be trusted. Every upload is checked against the actual
 * leading bytes of the file, and the extension we store is derived from that
 * check rather than from anything the client sent.
 */

export interface FileKind {
  mime: string;
  extension: string;
}

const IMAGE_SIGNATURES: Array<{ mime: string; extension: string; test: (b: Uint8Array) => boolean }> = [
  {
    mime: "image/jpeg",
    extension: "jpg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    extension: "png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a,
  },
  {
    mime: "image/webp",
    extension: "webp",
    // "RIFF" .... "WEBP"
    test: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  {
    mime: "image/avif",
    extension: "avif",
    // ....ftypavif
    test: (b) =>
      b[4] === 0x66 &&
      b[5] === 0x74 &&
      b[6] === 0x79 &&
      b[7] === 0x70 &&
      b[8] === 0x61 &&
      b[9] === 0x76 &&
      b[10] === 0x69 &&
      b[11] === 0x66,
  },
];

/**
 * Video container signatures.
 *
 * MP4 and QuickTime are both ISO base media files: bytes 4..7 are "ftyp" and
 * the brand that follows says which. WebM is a Matroska container and starts
 * with the EBML magic number.
 */
const VIDEO_SIGNATURES: Array<{ mime: string; extension: string; test: (b: Uint8Array) => boolean }> = [
  {
    mime: "video/webm",
    extension: "webm",
    test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  },
  {
    mime: "video/quicktime",
    extension: "mov",
    test: (b) => isFtyp(b) && brandOf(b) === "qt  ",
  },
  {
    mime: "video/mp4",
    extension: "mp4",
    // Everything else carrying an ftyp box is treated as MP4; the common
    // brands (isom, mp42, avc1, iso5, dash) are all MP4 in practice.
    test: (b) => isFtyp(b),
  },
];

function isFtyp(b: Uint8Array): boolean {
  return b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
}

function brandOf(b: Uint8Array): string {
  return String.fromCharCode(b[8] ?? 0, b[9] ?? 0, b[10] ?? 0, b[11] ?? 0);
}

const DOCUMENT_SIGNATURES: Array<{ mime: string; extension: string; test: (b: Uint8Array) => boolean }> = [
  {
    mime: "application/pdf",
    extension: "pdf",
    test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
  {
    // DOCX/XLSX are ZIP containers; the specific type is refined by the
    // declared MIME once the container itself has been confirmed.
    mime: "application/zip",
    extension: "zip",
    test: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  },
];

const OOXML_TYPES: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export function detectImage(bytes: Uint8Array): FileKind | null {
  if (bytes.length < 16) return null;
  const match = IMAGE_SIGNATURES.find((signature) => signature.test(bytes));
  return match ? { mime: match.mime, extension: match.extension } : null;
}

export function detectVideo(bytes: Uint8Array): FileKind | null {
  if (bytes.length < 16) return null;
  // AVIF is also an ftyp container, so it must be excluded before the
  // catch-all MP4 rule claims it as video.
  if (detectImage(bytes)) return null;
  const match = VIDEO_SIGNATURES.find((signature) => signature.test(bytes));
  return match ? { mime: match.mime, extension: match.extension } : null;
}

export function detectDocument(bytes: Uint8Array, declaredMime: string): FileKind | null {
  if (bytes.length < 8) return null;

  // Plain text has no signature; accept it only when declared as text/plain and
  // the leading bytes contain no control characters other than whitespace.
  if (declaredMime === "text/plain") {
    const printable = bytes
      .slice(0, 512)
      .every((byte) => byte === 0x09 || byte === 0x0a || byte === 0x0d || byte >= 0x20);
    return printable ? { mime: "text/plain", extension: "txt" } : null;
  }

  const match = DOCUMENT_SIGNATURES.find((signature) => signature.test(bytes));
  if (!match) return null;

  if (match.mime === "application/zip") {
    const extension = OOXML_TYPES[declaredMime];
    if (!extension) return null;
    return { mime: declaredMime, extension };
  }

  return { mime: match.mime, extension: match.extension };
}

/**
 * Produces a safe storage object name.
 * Nothing from the client's filename is reused except a slug of its stem, so
 * path separators and traversal sequences cannot survive it.
 */
export function safeObjectName(originalName: string, extension: string): string {
  const stem = originalName
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stem || "file"}-${unique}.${extension}`;
}
