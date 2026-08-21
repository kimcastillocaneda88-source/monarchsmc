import { NextResponse } from "next/server";
import { adminBucket, isAdminConfigured } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/session";
import { canManageClub, canManageContent, isActiveMember } from "@/lib/auth/roles";
import { detectDocument, detectImage, safeObjectName } from "@/lib/storage/validate";
import { buildStoragePath, isPublicArea, publicUrlFor, STORAGE_PREFIXES } from "@/lib/storage/paths";
import type { StorageArea } from "@/lib/storage/paths";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/validation/schemas";
import { consumeRateLimit } from "@/lib/data/rate-limit";
import { recordAudit } from "@/lib/data/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Authenticated upload endpoint.
 *
 * Validation happens in this order, and every step is server-side:
 *   1. session → active membership → the role required for the target area
 *   2. per-user rate limit
 *   3. byte-length ceiling
 *   4. magic-byte content sniffing; the declared MIME type is only ever used to
 *      disambiguate OOXML containers, never to authorise
 *   5. a generated object name — the client's filename never becomes a path
 *
 * Files in public areas are made public deliberately. Files under members/ and
 * documents/ stay private and are reachable only through an authorising route.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return json(503, { message: "Uploads are not available on this deployment." });
  }

  const user = await getSessionUser();
  if (!user) return json(401, { message: "Sign in to upload." });
  if (!isActiveMember(user)) return json(403, { message: "Your membership is not active." });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { message: "That upload could not be read." });
  }

  const areaRaw = String(form.get("area") ?? "");
  if (!(areaRaw in STORAGE_PREFIXES)) return json(400, { message: "Unknown upload target." });
  const area = areaRaw as StorageArea;

  // Authorisation per area. A member may only ever write their own photo.
  const scopeRaw = form.get("scope");
  let scope: string | undefined;

  if (area === "documents") {
    if (!canManageClub(user)) return json(403, { message: "You cannot upload documents." });
  } else if (area === "members") {
    const target = typeof scopeRaw === "string" && scopeRaw.length > 0 ? scopeRaw : user.uid;
    if (target !== user.uid && !canManageClub(user)) {
      return json(403, { message: "You cannot change another member's photograph." });
    }
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(target)) return json(400, { message: "Invalid target." });
    scope = target;
  } else if (!canManageContent(user)) {
    return json(403, { message: "You cannot upload media." });
  }

  try {
    await consumeRateLimit({
      key: "upload",
      subject: user.uid,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
  } catch {
    return json(429, { message: "Upload limit reached. Please try again later." });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json(400, { message: "No file was provided." });

  const isDocument = area === "documents";
  const maxBytes = isDocument ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (file.size === 0) return json(400, { message: "That file is empty." });
  if (file.size > maxBytes) {
    return json(413, {
      message: `That file is too large. The limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Re-check after reading: Content-Length can lie.
  if (buffer.byteLength > maxBytes) return json(413, { message: "That file is too large." });

  const declaredMime = file.type || "application/octet-stream";
  const kind = isDocument
    ? ALLOWED_DOCUMENT_TYPES.includes(declaredMime)
      ? detectDocument(buffer, declaredMime)
      : null
    : detectImage(buffer);

  if (!kind) {
    return json(415, {
      message: isDocument
        ? "That file type is not accepted. Upload a PDF, Word, Excel or text file."
        : "That file is not a supported image. Upload a JPEG, PNG, WebP or AVIF.",
    });
  }

  try {
    const objectName = safeObjectName(file.name || "upload", kind.extension);
    const path = buildStoragePath(area, objectName, scope);
    const bucket = adminBucket();
    const target = bucket.file(path);

    await target.save(buffer, {
      contentType: kind.mime,
      resumable: false,
      metadata: {
        contentType: kind.mime,
        cacheControl: isPublicArea(area) ? "public, max-age=31536000, immutable" : "private, max-age=0",
        metadata: { uploadedBy: user.uid, originalName: file.name.slice(0, 120) },
      },
    });

    let url: string | null = null;
    if (isPublicArea(area)) {
      await target.makePublic();
      url = publicUrlFor(bucket.name, path);
    } else if (area === "members") {
      // Served through an authorising route, never directly.
      url = `/api/media/member/${scope}`;
    }

    await recordAudit(user, isDocument ? "document.upload" : "gallery.upload", area, path, {
      bytes: buffer.byteLength,
      mime: kind.mime,
    });

    return json(200, {
      ok: true,
      path,
      url,
      contentType: kind.mime,
      sizeBytes: buffer.byteLength,
      fileName: file.name.slice(0, 120),
    });
  } catch {
    return json(500, { message: "We could not store that file. Please try again." });
  }
}
