"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/data/client";
import { requireClubManager, requireContentManager } from "@/lib/auth/guards";
import { toUserMessage } from "@/lib/auth/errors";
import { recordAudit } from "@/lib/data/audit";
import {
  announcementSchema,
  eventSchema,
  fieldErrorsOf,
  newsSchema,
  rideSchema,
} from "@/lib/validation/schemas";
import { RIDES } from "@/lib/data/rides";
import { EVENTS } from "@/lib/data/events";
import { NEWS } from "@/lib/data/news";
import { ANNOUNCEMENTS } from "@/lib/data/announcements";
import { MEMBERS } from "@/lib/data/members";
import type { FormState } from "../form-state";

const ok = (message: string): FormState => ({ status: "success", message, fieldErrors: {} });
const err = (message: string, fieldErrors: Record<string, string> = {}): FormState => ({
  status: "error",
  message,
  fieldErrors,
});

/**
 * Ensures a slug is unique within a collection, ignoring the document being
 * edited. Slugs are part of public URLs, so a collision would silently shadow
 * an existing item.
 */
async function slugTaken(collection: string, slug: string, ignoreId?: string): Promise<boolean> {
  const snap = await db().collection(collection).where("slug", "==", slug).limit(2).get();
  return snap.docs.some((doc) => doc.id !== ignoreId);
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function checkbox(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true";
}

/* ---------------------------------------------------------------- rides */

export async function saveRide(rideId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  try {
    // Rides are club operations, not editorial content: admin and above.
    const user = await requireClubManager();

    const parsed = rideSchema.safeParse({
      title: formValue(formData, "title"),
      slug: formValue(formData, "slug"),
      description: formValue(formData, "description"),
      requirements: formValue(formData, "requirements"),
      routeInfo: formValue(formData, "routeInfo"),
      coverImagePath: formValue(formData, "coverImagePath"),
      coverImageUrl: formValue(formData, "coverImageUrl"),
      coverImageAlt: formValue(formData, "coverImageAlt"),
      date: formValue(formData, "date"),
      startTime: formValue(formData, "startTime"),
      meetingPoint: formValue(formData, "meetingPoint"),
      destination: formValue(formData, "destination"),
      distanceKm: formValue(formData, "distanceKm"),
      roadCaptainId: formValue(formData, "roadCaptainId"),
      status: formValue(formData, "status"),
      visibility: formValue(formData, "visibility"),
      published: checkbox(formData, "published"),
    });

    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    if (await slugTaken(RIDES, parsed.data.slug, rideId ?? undefined)) {
      return err("That web address is already used by another ride.", { slug: "Choose a different slug." });
    }

    // Denormalise the road captain's name so the public page needs one read.
    let roadCaptainName: string | null = null;
    if (parsed.data.roadCaptainId) {
      const captain = await db().collection(MEMBERS).doc(parsed.data.roadCaptainId).get();
      roadCaptainName = captain.exists ? String(captain.data()?.displayName ?? "") || null : null;
    }

    const payload = {
      ...parsed.data,
      roadCaptainName,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (rideId) {
      await db().collection(RIDES).doc(rideId).update(payload);
      await recordAudit(user, "ride.update", "ride", rideId, { title: parsed.data.title });
    } else {
      const ref = await db()
        .collection(RIDES)
        .add({ ...payload, createdAt: FieldValue.serverTimestamp() });
      await recordAudit(user, "ride.create", "ride", ref.id, { title: parsed.data.title });
    }

    revalidatePath("/admin/rides");
    revalidatePath("/rides");
    revalidatePath(`/rides/${parsed.data.slug}`);
    revalidatePath("/");

    return ok(rideId ? "Ride updated." : "Ride created.");
  } catch (error) {
    return err(toUserMessage(error, "We could not save that ride."));
  }
}

export async function deleteRide(rideId: string): Promise<FormState> {
  try {
    const user = await requireClubManager();
    const doc = await db().collection(RIDES).doc(rideId).get();
    if (!doc.exists) return err("That ride no longer exists.");

    // Remove the RSVP subcollection first so no orphaned documents remain.
    const rsvps = await db().collection(RIDES).doc(rideId).collection("rsvps").limit(500).get();
    const batch = db().batch();
    rsvps.docs.forEach((rsvp) => batch.delete(rsvp.ref));
    batch.delete(doc.ref);
    await batch.commit();

    await recordAudit(user, "ride.delete", "ride", rideId, {
      title: String(doc.data()?.title ?? ""),
      rsvpsRemoved: rsvps.size,
    });

    revalidatePath("/admin/rides");
    revalidatePath("/rides");
    revalidatePath("/");
    return ok("Ride deleted.");
  } catch (error) {
    return err(toUserMessage(error, "We could not delete that ride."));
  }
}

/* --------------------------------------------------------------- events */

export async function saveEvent(
  eventId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireClubManager();

    const parsed = eventSchema.safeParse({
      title: formValue(formData, "title"),
      slug: formValue(formData, "slug"),
      description: formValue(formData, "description"),
      coverImagePath: formValue(formData, "coverImagePath"),
      coverImageUrl: formValue(formData, "coverImageUrl"),
      coverImageAlt: formValue(formData, "coverImageAlt"),
      date: formValue(formData, "date"),
      startTime: formValue(formData, "startTime"),
      endTime: formValue(formData, "endTime"),
      location: formValue(formData, "location"),
      organizer: formValue(formData, "organizer"),
      status: formValue(formData, "status"),
      visibility: formValue(formData, "visibility"),
    });

    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    if (await slugTaken(EVENTS, parsed.data.slug, eventId ?? undefined)) {
      return err("That web address is already used by another event.", {
        slug: "Choose a different slug.",
      });
    }

    const publishing = parsed.data.status === "published";
    const payload: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (eventId) {
      const existing = await db().collection(EVENTS).doc(eventId).get();
      const alreadyPublished = Boolean(existing.data()?.publishedAt);
      if (publishing && !alreadyPublished) payload.publishedAt = FieldValue.serverTimestamp();
      if (!publishing) payload.publishedAt = existing.data()?.publishedAt ?? null;
      await db().collection(EVENTS).doc(eventId).update(payload);
      await recordAudit(user, "event.update", "event", eventId, { title: parsed.data.title });
    } else {
      const ref = await db()
        .collection(EVENTS)
        .add({
          ...payload,
          publishedAt: publishing ? FieldValue.serverTimestamp() : null,
          createdAt: FieldValue.serverTimestamp(),
        });
      await recordAudit(user, "event.create", "event", ref.id, { title: parsed.data.title });
    }

    revalidatePath("/admin/events");
    revalidatePath("/events");
    revalidatePath(`/events/${parsed.data.slug}`);
    return ok(eventId ? "Event updated." : "Event created.");
  } catch (error) {
    return err(toUserMessage(error, "We could not save that event."));
  }
}

export async function deleteEvent(eventId: string): Promise<FormState> {
  try {
    const user = await requireClubManager();
    const doc = await db().collection(EVENTS).doc(eventId).get();
    if (!doc.exists) return err("That event no longer exists.");
    await doc.ref.delete();
    await recordAudit(user, "event.delete", "event", eventId, {
      title: String(doc.data()?.title ?? ""),
    });
    revalidatePath("/admin/events");
    revalidatePath("/events");
    return ok("Event deleted.");
  } catch (error) {
    return err(toUserMessage(error, "We could not delete that event."));
  }
}

/* ----------------------------------------------------------------- news */

export async function saveArticle(
  articleId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    // Editorial content: editors and above.
    const user = await requireContentManager();

    const parsed = newsSchema.safeParse({
      title: formValue(formData, "title"),
      slug: formValue(formData, "slug"),
      excerpt: formValue(formData, "excerpt"),
      body: formValue(formData, "body"),
      coverImagePath: formValue(formData, "coverImagePath"),
      coverImageUrl: formValue(formData, "coverImageUrl"),
      coverImageAlt: formValue(formData, "coverImageAlt"),
      category: formValue(formData, "category"),
      published: checkbox(formData, "published"),
      seoTitle: formValue(formData, "seoTitle"),
      seoDescription: formValue(formData, "seoDescription"),
      ogImageUrl: formValue(formData, "ogImageUrl"),
    });

    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    if (await slugTaken(NEWS, parsed.data.slug, articleId ?? undefined)) {
      return err("That web address is already used by another article.", {
        slug: "Choose a different slug.",
      });
    }

    const payload: Record<string, unknown> = {
      ...parsed.data,
      authorId: user.uid,
      authorName: user.displayName ?? "MONARCHS MC",
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (articleId) {
      const existing = await db().collection(NEWS).doc(articleId).get();
      const wasPublished = Boolean(existing.data()?.published);
      // Keep the original publication date on re-publish.
      payload.publishedAt =
        parsed.data.published && !existing.data()?.publishedAt
          ? FieldValue.serverTimestamp()
          : (existing.data()?.publishedAt ?? null);
      // Preserve the original author rather than reassigning on every edit.
      payload.authorId = existing.data()?.authorId ?? user.uid;
      payload.authorName = existing.data()?.authorName ?? user.displayName ?? "MONARCHS MC";

      await db().collection(NEWS).doc(articleId).update(payload);

      if (parsed.data.published !== wasPublished) {
        await recordAudit(
          user,
          parsed.data.published ? "news.publish" : "news.unpublish",
          "news",
          articleId,
          { title: parsed.data.title },
        );
      } else {
        await recordAudit(user, "news.update", "news", articleId, { title: parsed.data.title });
      }
    } else {
      const ref = await db()
        .collection(NEWS)
        .add({
          ...payload,
          publishedAt: parsed.data.published ? FieldValue.serverTimestamp() : null,
          createdAt: FieldValue.serverTimestamp(),
        });
      await recordAudit(user, "news.create", "news", ref.id, { title: parsed.data.title });
    }

    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath(`/news/${parsed.data.slug}`);
    revalidatePath("/");
    return ok(articleId ? "Article saved." : "Article created.");
  } catch (error) {
    return err(toUserMessage(error, "We could not save that article."));
  }
}

export async function setArticlePublished(articleId: string, published: boolean): Promise<FormState> {
  try {
    const user = await requireContentManager();
    const ref = db().collection(NEWS).doc(articleId);
    const doc = await ref.get();
    if (!doc.exists) return err("That article no longer exists.");

    await ref.update({
      published,
      publishedAt: published ? (doc.data()?.publishedAt ?? FieldValue.serverTimestamp()) : doc.data()?.publishedAt ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await recordAudit(user, published ? "news.publish" : "news.unpublish", "news", articleId, {
      title: String(doc.data()?.title ?? ""),
    });

    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath("/");
    return ok(published ? "Article published." : "Article unpublished.");
  } catch (error) {
    return err(toUserMessage(error, "We could not change that article."));
  }
}

export async function deleteArticle(articleId: string): Promise<FormState> {
  try {
    const user = await requireContentManager();
    const doc = await db().collection(NEWS).doc(articleId).get();
    if (!doc.exists) return err("That article no longer exists.");
    await doc.ref.delete();
    await recordAudit(user, "news.delete", "news", articleId, {
      title: String(doc.data()?.title ?? ""),
    });
    revalidatePath("/admin/news");
    revalidatePath("/news");
    return ok("Article deleted.");
  } catch (error) {
    return err(toUserMessage(error, "We could not delete that article."));
  }
}

/* -------------------------------------------------------- announcements */

export async function saveAnnouncement(
  announcementId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireClubManager();

    const parsed = announcementSchema.safeParse({
      title: formValue(formData, "title"),
      body: formValue(formData, "body"),
      priority: formValue(formData, "priority"),
      published: checkbox(formData, "published"),
    });

    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    const payload = {
      ...parsed.data,
      authorId: user.uid,
      authorName: user.displayName ?? "MONARCHS MC",
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (announcementId) {
      await db().collection(ANNOUNCEMENTS).doc(announcementId).update(payload);
      await recordAudit(user, "announcement.update", "announcement", announcementId, {
        title: parsed.data.title,
      });
    } else {
      const ref = await db()
        .collection(ANNOUNCEMENTS)
        .add({ ...payload, createdAt: FieldValue.serverTimestamp() });
      await recordAudit(user, "announcement.create", "announcement", ref.id, {
        title: parsed.data.title,
      });
    }

    revalidatePath("/admin/announcements");
    revalidatePath("/member/announcements");
    revalidatePath("/member/dashboard");
    return ok(announcementId ? "Announcement updated." : "Announcement posted.");
  } catch (error) {
    return err(toUserMessage(error, "We could not save that announcement."));
  }
}

export async function deleteAnnouncement(announcementId: string): Promise<FormState> {
  try {
    const user = await requireClubManager();
    const doc = await db().collection(ANNOUNCEMENTS).doc(announcementId).get();
    if (!doc.exists) return err("That announcement no longer exists.");
    await doc.ref.delete();
    await recordAudit(user, "announcement.delete", "announcement", announcementId, {
      title: String(doc.data()?.title ?? ""),
    });
    revalidatePath("/admin/announcements");
    revalidatePath("/member/announcements");
    return ok("Announcement deleted.");
  } catch (error) {
    return err(toUserMessage(error, "We could not delete that announcement."));
  }
}
