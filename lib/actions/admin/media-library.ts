"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/data/client";
import { adminBucket } from "@/lib/firebase/admin";
import { requireActiveMember, requireContentManager } from "@/lib/auth/guards";
import { toUserMessage } from "@/lib/auth/errors";
import { recordAudit } from "@/lib/data/audit";
import { MEDIA } from "@/lib/data/media";
import { STORAGE_PREFIXES } from "@/lib/storage/paths";
import { canAccessAdminArea, type Principal } from "@/lib/auth/roles";
import type { FormState } from "../form-state";

const ok = (message: string): FormState => ({ status: "success", message, fieldErrors: {} });
const err = (message: string): FormState => ({ status: "error", message, fieldErrors: {} });

/**
 * Guards a storage path before deleting it.
 * Paths live in Firestore, so a tampered document must not be able to point the
 * delete at an arbitrary object.
 */
function isMediaPath(path: string): boolean {
  if (!path || path.includes("..") || path.startsWith("/")) return false;
  return path.startsWith(`${STORAGE_PREFIXES.media}/`);
}

function revalidateMediaViews() {
  revalidatePath("/admin/media");
  revalidatePath("/member/uploads");
  revalidatePath("/member/media");
}

/**
 * Publishes an item to the club, or withdraws it again.
 *
 * Every upload arrives unapproved. That is what makes the automatic face blur
 * safe to rely on: the blur runs in the uploader's browser and this server
 * cannot verify it happened, so a person looks at each item — with its reported
 * blur status shown beside it — before anybody else can see it.
 */
export async function setMediaApproval(mediaId: string, approved: boolean): Promise<FormState> {
  try {
    const actor = await requireContentManager();
    const ref = db().collection(MEDIA).doc(mediaId);
    const snap = await ref.get();
    if (!snap.exists) return err("That item no longer exists.");

    await ref.update({ approved, updatedAt: FieldValue.serverTimestamp() });
    await recordAudit(actor, "media.approve", "media", mediaId, { approved });

    revalidateMediaViews();
    return ok(approved ? "Published to the library." : "Withdrawn from the library.");
  } catch (error) {
    return err(toUserMessage(error, "We could not update that item."));
  }
}

/**
 * Deletes an item and the object behind it.
 *
 * A member may delete their own contribution; an editor or above may delete
 * anyone's. The Firestore record goes first, because it is what makes the item
 * visible — if the object delete then fails, the result is an orphaned file in
 * the bucket rather than an item still on display.
 */
export async function deleteMediaItem(mediaId: string): Promise<FormState> {
  try {
    const actor = await requireActiveMember();
    const ref = db().collection(MEDIA).doc(mediaId);
    const snap = await ref.get();
    if (!snap.exists) return err("That item no longer exists.");

    const data = snap.data() ?? {};
    const isOwner = data.uploadedBy === actor.uid;
    if (!isOwner && !canAccessAdminArea(actor as Principal)) {
      return err("You can only delete your own uploads.");
    }

    const storagePath = String(data.storagePath ?? "");
    await ref.delete();

    if (isMediaPath(storagePath)) {
      await adminBucket().file(storagePath).delete({ ignoreNotFound: true });
    }

    await recordAudit(actor, "media.delete", "media", mediaId, { storagePath, ownDelete: isOwner });

    revalidateMediaViews();
    return ok("Deleted.");
  } catch (error) {
    return err(toUserMessage(error, "We could not delete that item."));
  }
}
