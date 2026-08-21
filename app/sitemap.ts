import type { MetadataRoute } from "next";
import { listPublicRideSlugs } from "@/lib/data/rides";
import { listPublicEventSlugs } from "@/lib/data/events";
import { listPublishedNewsSlugs } from "@/lib/data/news";
import { siteUrl } from "@/lib/utils";

/**
 * Public routes only.
 *
 * Member and admin routes, the auth pages and the API are deliberately absent —
 * they are also disallowed in robots.txt and carry noindex metadata.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: siteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: siteUrl("/brotherhood"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: siteUrl("/rides"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: siteUrl("/events"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: siteUrl("/gallery"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: siteUrl("/news"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: siteUrl("/join"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: siteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: siteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [rides, events, news] = await Promise.all([
    listPublicRideSlugs(200),
    listPublicEventSlugs(200),
    listPublishedNewsSlugs(300),
  ]);

  return [
    ...staticRoutes,
    ...rides.map((item) => ({
      url: siteUrl(`/rides/${item.slug}`),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...events.map((item) => ({
      url: siteUrl(`/events/${item.slug}`),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...news.map((item) => ({
      url: siteUrl(`/news/${item.slug}`),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
