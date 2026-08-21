"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/data/client";
import { requireClubManager, requireContentManager, requireSuperadmin } from "@/lib/auth/guards";
import { toUserMessage } from "@/lib/auth/errors";
import { recordAudit } from "@/lib/data/audit";
import { fieldErrorsOf, messageStatusSchema, siteSettingsSchema } from "@/lib/validation/schemas";
import { SECTION_REGISTRY } from "@/lib/content/defaults";
import { PAGES, SETTINGS } from "@/lib/data/settings";
import { CONTACT_MESSAGES } from "@/lib/data/messages";
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

/** Global site configuration. Superadmin only. */
export async function updateSiteSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireSuperadmin();

    const parsed = siteSettingsSchema.safeParse({
      clubName: value(formData, "clubName"),
      tagline: value(formData, "tagline"),
      contactEmail: value(formData, "contactEmail"),
      contactPhone: value(formData, "contactPhone"),
      locationLabel: value(formData, "locationLabel"),
      instagram: value(formData, "instagram"),
      facebook: value(formData, "facebook"),
      youtube: value(formData, "youtube"),
      tiktok: value(formData, "tiktok"),
      applicationsOpen: formData.get("applicationsOpen") === "on",
    });

    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    const { instagram, facebook, youtube, tiktok, ...rest } = parsed.data;

    await db()
      .collection(SETTINGS)
      .doc("site")
      .set(
        {
          ...rest,
          social: { instagram, facebook, youtube, tiktok },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await recordAudit(user, "settings.update", "settings", "site", {
      applicationsOpen: parsed.data.applicationsOpen,
    });

    // Settings appear in the header and footer of every page.
    revalidatePath("/", "layout");
    return ok("Settings saved.");
  } catch (error) {
    return err(toUserMessage(error, "We could not save those settings."));
  }
}

/**
 * Editable page copy.
 *
 * Only keys declared in the section registry are accepted, so the CMS cannot be
 * used to write arbitrary fields into the pages collection.
 */
export async function updatePageContent(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireContentManager();

    const pageId = value(formData, "pageId");
    const registry = SECTION_REGISTRY[pageId];
    if (!registry) return err("Unknown page.");

    const sections: Record<string, string> = {};
    for (const definition of registry) {
      const raw = value(formData, `section.${definition.key}`);
      if (raw.length > 20000) {
        return err("One of those sections is too long.", {
          [`section.${definition.key}`]: "Shorten this section.",
        });
      }
      sections[definition.key] = raw;
    }

    const heroImagePath = value(formData, "heroImagePath");
    const heroImageUrl = value(formData, "heroImageUrl");
    const heroImageAlt = value(formData, "heroImageAlt");

    await db()
      .collection(PAGES)
      .doc(pageId)
      .set(
        {
          sections,
          heroImagePath: heroImagePath || null,
          heroImageUrl: heroImageUrl || null,
          heroImageAlt: heroImageAlt || null,
          updatedBy: user.uid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await recordAudit(user, "page.update", "page", pageId, {});

    revalidatePath(pageId === "home" ? "/" : `/${pageId}`);
    revalidatePath("/admin/settings");
    return ok("Page content saved.");
  } catch (error) {
    return err(toUserMessage(error, "We could not save that page."));
  }
}

/* ------------------------------------------------------------- messages */

export async function updateMessageStatus(messageId: string, status: string): Promise<FormState> {
  try {
    const user = await requireClubManager();

    const parsed = messageStatusSchema.safeParse({ messageId, status });
    if (!parsed.success) return err("That status was not recognised.");

    const ref = db().collection(CONTACT_MESSAGES).doc(parsed.data.messageId);
    const snap = await ref.get();
    if (!snap.exists) return err("That message no longer exists.");

    await ref.update({
      status: parsed.data.status,
      handledBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await recordAudit(user, "message.update", "message", parsed.data.messageId, {
      status: parsed.data.status,
    });

    revalidatePath("/admin/messages");
    revalidatePath("/admin");
    return ok("Message updated.");
  } catch (error) {
    return err(toUserMessage(error, "We could not update that message."));
  }
}
