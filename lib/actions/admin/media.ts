"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/data/client";
import { adminBucket } from "@/lib/firebase/admin";
import { requireActiveMember, requireClubManager, requireContentManager } from "@/lib/auth/guards";
import { toUserMessage } from "@/lib/auth/errors";
import { recordAudit } from "@/lib/data/audit";
import { documentMetadataSchema, fieldErrorsOf, galleryMetadataSchema } from "@/lib/validation/schemas";
import { GALLERY } from "@/lib/data/gallery";
import { DOCUMENTS } from "@/lib/data/documents";
import { MEMBERS } from "@/lib/data/members";
import { STORAGE_PREFIXES } from "@/lib/storage/paths";
import type { FormState } from "../form-state";

const ok = (message: string): FormState => ({ status: "success", message, fieldErrors: {} });
const err = (message: string, fieldErrors: Record<string, string> = {}): FormState => ({
  status: "error",
  message,
  fieldErrors,
});

function value(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

/**
 * Guards a storage path before deleting it.
 *
 * Paths are stored in Firestore, so a compromised document could otherwise
 * point at an arbitrary object. Deletion is confined to the expected prefix and
 * traversal sequences are rejected.
 */
function isPathWithin(path: string, prefix: string): boolean {
  if (!path || path.includes("..") || path.startsWith("/")) return false;
  return path.startsWith(`${prefix}/`);
}

/* -------------------------------------------------------------- gallery */

/** Creates the gallery record for a file already uploaded via /api/admin/upload. */
export async function createGalleryItem(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireContentManager();

    const storagePath = value(formData, "storagePath");
    const imageUrl = value(formData, "imageUrl");
    if (!isPathWithin(storagePath, STORAGE_PREFIXES.gallery) || !imageUrl) {
      return err("Upload an image before saving.");
    }

    const parsed = galleryMetadataSchema.safeParse({
      title: value(formData, "title"),
      caption: value(formData, "caption"),
      altText: value(formData, "altText"),
      category: value(formData, "category"),
      rideId: value(formData, "rideId"),
      eventId: value(formData, "eventId"),
      approved: formData.get("approved") === "on",
      featured: formData.get("featured") === "on",
    });
    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    const ref = await db()
      .collection(GALLERY)
      .add({
        ...parsed.data,
        storagePath,
        imageUrl,
        width: null,
        height: null,
        uploadedBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    await recordAudit(user, "gallery.upload", "gallery", ref.id, { title: parsed.data.title });

    revalidatePath("/admin/gallery");
    revalidatePath("/gallery");
    revalidatePath("/");
    return ok("Photograph added.");
  } catch (error) {
    return err(toUserMessage(error, "We could not save that photograph."));
  }
}

export async function updateGalleryItem(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireContentManager();

    const parsed = galleryMetadataSchema.safeParse({
      title: value(formData, "title"),
      caption: value(formData, "caption"),
      altText: value(formData, "altText"),
      category: value(formData, "category"),
      rideId: value(formData, "rideId"),
      eventId: value(formData, "eventId"),
      approved: formData.get("approved") === "on",
      featured: formData.get("featured") === "on",
    });
    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    await db()
      .collection(GALLERY)
      .doc(itemId)
      .update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });

    await recordAudit(user, "gallery.update", "gallery", itemId, {
      approved: parsed.data.approved,
      featured: parsed.data.featured,
    });

    revalidatePath("/admin/gallery");
    revalidatePath("/gallery");
    revalidatePath("/");
    return ok("Photograph updated.");
  } catch (error) {
    return err(toUserMessage(error, "We could not update that photograph."));
  }
}

export async function setGalleryApproval(itemId: string, approved: boolean): Promise<FormState> {
  try {
    const user = await requireContentManager();
    const ref = db().collection(GALLERY).doc(itemId);
    const snap = await ref.get();
    if (!snap.exists) return err("That photograph no longer exists.");

    await ref.update({
      approved,
      // Unapproving must also unfeature — a featured-but-unapproved image would
      // otherwise be invisible in the gallery yet queued for the homepage.
      ...(approved ? {} : { featured: false }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await recordAudit(user, "gallery.approve", "gallery", itemId, { approved });
    revalidatePath("/admin/gallery");
    revalidatePath("/gallery");
    revalidatePath("/");
    return ok(approved ? "Photograph approved." : "Photograph unpublished.");
  } catch (error) {
    return err(toUserMessage(error, "We could not update that photograph."));
  }
}

export async function setGalleryFeatured(itemId: string, featured: boolean): Promise<FormState> {
  try {
    const user = await requireContentManager();
    const ref = db().collection(GALLERY).doc(itemId);
    const snap = await ref.get();
    if (!snap.exists) return err("That photograph no longer exists.");
    if (featured && snap.data()?.approved !== true) {
      return err("Approve the photograph before featuring it.");
    }

    await ref.update({ featured, updatedAt: FieldValue.serverTimestamp() });
    await recordAudit(user, "gallery.update", "gallery", itemId, { featured });
    revalidatePath("/admin/gallery");
    revalidatePath("/");
    return ok(featured ? "Photograph featured." : "Removed from featured.");
  } catch (error) {
    return err(toUserMessage(error, "We could not update that photograph."));
  }
}

export async function deleteGalleryItem(itemId: string): Promise<FormState> {
  try {
    const user = await requireContentManager();
    const ref = db().collection(GALLERY).doc(itemId);
    const snap = await ref.get();
    if (!snap.exists) return err("That photograph no longer exists.");

    const storagePath = String(snap.data()?.storagePath ?? "");
    await ref.delete();

    if (isPathWithin(storagePath, STORAGE_PREFIXES.gallery)) {
      // The record is the source of truth; a failed object delete must not
      // leave the item visible, so this runs after and is tolerated failing.
      await adminBucket().file(storagePath).delete({ ignoreNotFound: true });
    }

    await recordAudit(user, "gallery.delete", "gallery", itemId, { storagePath });
    revalidatePath("/admin/gallery");
    revalidatePath("/gallery");
    revalidatePath("/");
    return ok("Photograph deleted.");
  } catch (error) {
    return err(toUserMessage(error, "We could not delete that photograph."));
  }
}

/* ------------------------------------------------------------ documents */

export async function createDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireClubManager();

    const storagePath = value(formData, "storagePath");
    if (!isPathWithin(storagePath, STORAGE_PREFIXES.documents)) {
      return err("Upload a file before saving.");
    }

    const parsed = documentMetadataSchema.safeParse({
      title: value(formData, "title"),
      description: value(formData, "description"),
      category: value(formData, "category"),
      requiredRole: value(formData, "requiredRole"),
    });
    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    const sizeBytes = Number(value(formData, "sizeBytes")) || 0;

    const ref = await db()
      .collection(DOCUMENTS)
      .add({
        ...parsed.data,
        storagePath,
        fileName: value(formData, "fileName") || "document",
        contentType: value(formData, "contentType") || "application/octet-stream",
        sizeBytes,
        uploadedBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    await recordAudit(user, "document.upload", "document", ref.id, { title: parsed.data.title });

    revalidatePath("/admin/documents");
    revalidatePath("/member/documents");
    return ok("Document added.");
  } catch (error) {
    return err(toUserMessage(error, "We could not save that document."));
  }
}

export async function deleteDocument(documentId: string): Promise<FormState> {
  try {
    const user = await requireClubManager();
    const ref = db().collection(DOCUMENTS).doc(documentId);
    const snap = await ref.get();
    if (!snap.exists) return err("That document no longer exists.");

    const storagePath = String(snap.data()?.storagePath ?? "");
    await ref.delete();

    if (isPathWithin(storagePath, STORAGE_PREFIXES.documents)) {
      await adminBucket().file(storagePath).delete({ ignoreNotFound: true });
    }

    await recordAudit(user, "document.delete", "document", documentId, { storagePath });
    revalidatePath("/admin/documents");
    revalidatePath("/member/documents");
    return ok("Document deleted.");
  } catch (error) {
    return err(toUserMessage(error, "We could not delete that document."));
  }
}

/* ------------------------------------------------------- member photos */

/** Attaches an uploaded photograph to the signed-in member's own profile. */
export async function setOwnMemberPhoto(storagePath: string): Promise<FormState> {
  try {
    const user = await requireActiveMember();

    // The path must be inside this member's own folder — not merely inside
    // members/, which would let one member claim another's file.
    if (!isPathWithin(storagePath, `${STORAGE_PREFIXES.members}/${user.uid}`)) {
      return err("That file could not be attached to your profile.");
    }

    await db()
      .collection(MEMBERS)
      .doc(user.uid)
      .set(
        {
          photoPath: storagePath,
          photoUrl: `/api/media/member/${user.uid}`,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    revalidatePath("/member/profile");
    revalidatePath("/member/directory");
    return ok("Photograph updated.");
  } catch (error) {
    return err(toUserMessage(error, "We could not update your photograph."));
  }
}
