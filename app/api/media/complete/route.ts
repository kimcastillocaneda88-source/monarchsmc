import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminBucket, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { requireUploader } from "@/lib/auth/guards";
import { AppError } from "@/lib/auth/errors";
import { recordAudit } from "@/lib/data/audit";
import { MEDIA, MEDIA_UPLOADS } from "@/lib/data/media";
import { detectDocument, detectImage, detectVideo } from "@/lib/storage/validate";
import { STORAGE_PREFIXES } from "@/lib/storage/paths";
import { mediaCompleteSchema, fieldErrorsOf } from "@/lib/validation/schemas";
import type { MediaKind } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Enough bytes for every signature this application recognises. */
const SNIFF_BYTES = 64;

/**
 * Confirms that what is in Cloud Storage is what the ticket authorised.
 *
 * The bytes bypassed this application on the way up, so this is the first
 * moment the server can see them — and it does look, rather than take the
 * browser's word for it. The stored object is read back far enough to identify
 * it from its leading bytes and checked against both the ticket and its real
 * size. Anything that does not line up is deleted rather than recorded, so a
 * signed URL cannot be used to park an arbitrary file in the bucket.
 *
 * On the face blur: the blurring happens in the browser, before the bytes are
 * ever sent, which is the point — an unblurred frame never leaves the
 * uploader's device and never reaches the club's storage. The consequence is
 * that the reported blur status is the browser's claim, and this route cannot
 * independently verify it. That is why nothing published here is trusted on
 * that claim alone: every item lands unapproved and an officer sees the blur
 * status next to it before deciding.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { message: "That request could not be read." });
  }

  const parsed = mediaCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return json(422, {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  const { uploadId, title, caption, faceBlur, facesBlurred } = parsed.data;

  const db = adminDb();
  const ticketRef = db.collection(MEDIA_UPLOADS).doc(uploadId);

  /**
   * Claim the ticket before doing any work with it.
   *
   * Checking `consumed` and then writing it separately is a race: two requests
   * carrying the same upload id — a double-tap, a retry after a slow
   * response — would both read it unspent and both record the item. The
   * transaction makes the claim atomic, so exactly one request proceeds.
   */
  let ticket: FirebaseFirestore.DocumentData;
  try {
    ticket = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ticketRef);
      if (!snap.exists) throw new AppError("not_found", "That upload has expired. Please try again.", 404);

      const data = snap.data() ?? {};
      if (data.uid !== user.uid) {
        throw new AppError("forbidden", "That upload does not belong to you.", 403);
      }
      if (data.consumed === true) {
        throw new AppError("conflict", "That upload was already saved.", 409);
      }

      const expires = data.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : 0;
      if (expires && Date.now() > expires) {
        throw new AppError("gone", "That upload took too long. Please try again.", 410);
      }

      tx.update(ticketRef, { consumed: true });
      return data;
    });
  } catch (error) {
    if (error instanceof AppError) return json(error.status, { message: error.message });
    return json(503, { message: "We could not complete that upload. Please try again." });
  }

  const kind = ticket.kind as MediaKind;
  const path = String(ticket.path ?? "");
  const maxBytes = Number(ticket.maxBytes ?? 0);

  /**
   * The path was written by /api/media/upload-url, so it should already be
   * confined to this account's own folder. It is re-checked anyway: this value
   * decides which object gets read and, on rejection, deleted, and a stored
   * value is never a good enough reason to skip bounding it.
   */
  const expectedPrefix = `${STORAGE_PREFIXES.media}/${user.uid}/`;
  if (!kind || !path.startsWith(expectedPrefix) || path.includes("..")) {
    await ticketRef.delete().catch(() => {});
    return json(400, { message: "That upload could not be completed." });
  }

  const file = adminBucket().file(path);

  /**
   * Removes the object and the claimed ticket when the upload turns out not to
   * be acceptable, so nothing unverified is left in the bucket and the caller
   * can start again cleanly.
   */
  async function reject(status: number, message: string) {
    await file.delete({ ignoreNotFound: true }).catch(() => {});
    await ticketRef.delete().catch(() => {});
    return json(status, { message });
  }

  let actualSize: number;
  let head: Buffer;
  try {
    const [exists] = await file.exists();
    if (!exists) {
      await ticketRef.delete().catch(() => {});
      return json(400, { message: "That file did not finish uploading." });
    }

    const [metadata] = await file.getMetadata();
    actualSize = Number(metadata.size ?? 0);

    // Read only the leading bytes — enough to identify the file, without
    // pulling a 500 MB video through a serverless function.
    const chunks: Buffer[] = [];
    for await (const chunk of file.createReadStream({ start: 0, end: SNIFF_BYTES - 1 })) {
      chunks.push(chunk as Buffer);
    }
    head = Buffer.concat(chunks);
  } catch {
    return json(503, { message: "We could not verify that upload. Please try again." });
  }

  if (actualSize === 0) return reject(400, "That file is empty.");
  if (maxBytes > 0 && actualSize > maxBytes) {
    return reject(413, "That file is larger than the limit for its type.");
  }

  // What the file actually is, decided from its bytes rather than its name,
  // its extension or the type the browser declared.
  const detected =
    kind === "image"
      ? detectImage(head)
      : kind === "video"
        ? detectVideo(head)
        : detectDocument(head, String(ticket.contentType ?? ""));

  if (!detected) {
    return reject(415, `That file is not a valid ${kind}.`);
  }

  try {
    const ref = await db.collection(MEDIA).add({
      title,
      caption,
      kind,
      storagePath: path,
      contentType: detected.mime,
      sizeBytes: actualSize,
      fileName: String(ticket.fileName ?? "file"),
      faceBlur,
      facesBlurred,
      uploadedBy: user.uid,
      uploaderName: user.displayName || user.username || "Member",
      // Nothing is visible to the club until an officer approves it.
      approved: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await ticketRef.update({ mediaId: ref.id });

    await recordAudit(user, "media.upload", "media", ref.id, {
      kind,
      bytes: actualSize,
      mime: detected.mime,
      faceBlur,
      facesBlurred,
    });

    return json(201, {
      ok: true,
      id: ref.id,
      message: "Uploaded. A club officer will review it before it appears in the library.",
    });
  } catch {
    return reject(503, "We could not save that upload. Please try again.");
  }
}
