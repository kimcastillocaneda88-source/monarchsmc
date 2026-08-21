import "server-only";

import { cache } from "react";
import { withDb } from "./client";
import { bool, nullableStr, requireMillis, str } from "./serialize";
import type { PageContent, SiteSettings } from "@/types";

export const SETTINGS = "settings";
export const PAGES = "pages";

/**
 * Defaults are intentionally factual and generic.
 * No founding dates, chapters, member counts, officers, locations or social
 * profiles are invented — those fields stay empty until the club fills them in
 * through the admin area, and the UI hides whatever is empty.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  clubName: "MONARCHS MC",
  tagline: "Ride with purpose. Ride as one.",
  contactEmail: null,
  contactPhone: null,
  locationLabel: null,
  social: { instagram: null, facebook: null, youtube: null, tiktok: null },
  applicationsOpen: true,
  updatedAt: 0,
};

async function loadSettings(): Promise<SiteSettings> {
  return withDb<SiteSettings>(DEFAULT_SETTINGS, async (database) => {
    const doc = await database.collection(SETTINGS).doc("site").get();
    if (!doc.exists) return DEFAULT_SETTINGS;
    const d = doc.data() ?? {};
    const social = (d.social ?? {}) as Record<string, unknown>;
    return {
      clubName: str(d.clubName, DEFAULT_SETTINGS.clubName),
      tagline: nullableStr(d.tagline) ?? DEFAULT_SETTINGS.tagline,
      contactEmail: nullableStr(d.contactEmail),
      contactPhone: nullableStr(d.contactPhone),
      locationLabel: nullableStr(d.locationLabel),
      social: {
        instagram: nullableStr(social.instagram),
        facebook: nullableStr(social.facebook),
        youtube: nullableStr(social.youtube),
        tiktok: nullableStr(social.tiktok),
      },
      applicationsOpen: bool(d.applicationsOpen, true),
      updatedAt: requireMillis(d.updatedAt),
    };
  });
}

export const getSiteSettings = cache(loadSettings);

async function loadPage(pageId: string): Promise<PageContent | null> {
  return withDb<PageContent | null>(null, async (database) => {
    const doc = await database.collection(PAGES).doc(pageId).get();
    if (!doc.exists) return null;
    const d = doc.data() ?? {};
    const raw = (d.sections ?? {}) as Record<string, unknown>;
    const sections: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "string") sections[key] = value;
    }
    return {
      id: doc.id,
      sections,
      heroImagePath: nullableStr(d.heroImagePath),
      heroImageUrl: nullableStr(d.heroImageUrl),
      heroImageAlt: nullableStr(d.heroImageAlt),
      updatedAt: requireMillis(d.updatedAt),
      updatedBy: nullableStr(d.updatedBy),
    };
  });
}

export const getPageContent = cache(loadPage);

/**
 * Reads one editable block, falling back to the shipped default copy.
 * Structural UI stays in code; only genuinely editable prose lives in Firestore.
 */
export function section(page: PageContent | null, key: string, fallback: string): string {
  const value = page?.sections?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}
