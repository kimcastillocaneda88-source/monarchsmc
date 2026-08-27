import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminBucket, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { requireUploader } from "@/lib/auth/guards";
import { AppError } from "@/lib/auth/errors";
import { consumeRateLimit } from "@/lib/data/rate-limit";
import { MEDIA_UPLOADS } from "@/lib/data/media";
import { buildStoragePath } from "@/lib/storage/paths";
import { safeObjectName } from "@/lib/storage/validate";
import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  maxBytesForKind,
  mediaUploadTicketSchema,
} from "@/lib/validation/schemas";
import type { MediaKind } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long the browser has to finish sending the bytes. */
const TICKET_TTL_MS = 30 * 60 * 1000;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const ALLOWED_TYPES: Record<MediaKind, readonly string[]> = {
  image: ALLOWED_IMAGE_TYPES,
  video: ALLOWED_VIDEO_TYPES,
  file: ALLOWED_DOCUMENT_TYPES,
};

/** The extension the object is stored under, derived from the declared type. */
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};

/**
 * Authorises one upload and hands back a signed URL for it.
 *
 * Media goes straight from the browser to Cloud Storage rather than through
 * this application. That is not a shortcut: a serverless function may only
 * receive a 4.5 MB request body, which any video worth uploading exceeds. A
 * signed URL moves the bytes without that ceiling while keeping the decision
 * here.
 *
 * What the signed URL cannot do is just as important as what it can. It is
 * valid for one object path this route chose, one content type, one HTTP
 * method, and half an hour. It cannot be used to read anything, to overwrite
 * somebody else's object, or to write outside the caller's own folder.
 *
 * The declared content type is not trusted as proof of anything — it only
 * decides the extension and pins the signature. What the file actually is gets
 * settled in /api/media/complete by reading the stored object's leading bytes.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return json(503, { message: "Uploads are not available on this deployment." });
  }

  let user;
  try {
    user = await requireUploader();
  } catch (error) {
    if (error instanceof AppError) return json(error.status, { message: error.message });
    return json(500, { message: "We could not check your permissions. Please try again." });
  }

  try {
    await consumeRateLimit({
      key: "media-upload",
      subject: user.uid,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
  } catch {
    return json(429, { message: "Upload limit reached. Please try again later." });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { message: "That request could not be read." });
  }

  const parsed = mediaUploadTicketSchema.safeParse(body);
  if (!parsed.success) return json(400, { message: "That upload request was not valid." });

  const { kind, fileName, contentType, sizeBytes } = parsed.data;

  if (!ALLOWED_TYPES[kind].includes(contentType)) {
    return json(415, { message: `That file type cannot be uploaded as a ${kind}.` });
  }

  const maxBytes = maxBytesForKind(kind);
  if (sizeBytes > maxBytes) {
    return json(413, {
      message: `That file is too large. The limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    });
  }

  try {
    const objectName = safeObjectName(fileName, EXTENSIONS[contentType] ?? "bin");
    const path = buildStoragePath("media", objectName, user.uid);
    const expiresAt = Date.now() + TICKET_TTL_MS;

    const [uploadUrl] = await adminBucket()
      .file(path)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: expiresAt,
        // Binds the signature to this exact type, so the browser cannot send
        // the bytes as something else.
        contentType,
      });

    const ticket = await adminDb()
      .collection(MEDIA_UPLOADS)
      .add({
        uid: user.uid,
        kind,
        path,
        contentType,
        declaredSizeBytes: sizeBytes,
        maxBytes,
        fileName: fileName.slice(0, 200),
        consumed: false,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(expiresAt),
      });

    return json(200, { uploadId: ticket.id, uploadUrl, contentType, expiresAt });
  } catch {
    return json(503, { message: "We could not start that upload. Please try again." });
  }
}
