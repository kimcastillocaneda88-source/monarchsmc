import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { bool, nullableStr, oneOf, requireMillis, str, toMillis } from "./serialize";
import { NEWS_CATEGORIES, type NewsArticle, type NewsCategory, type Page } from "@/types";

export const NEWS = "news";

export function mapArticle(doc: QueryDocumentSnapshot): NewsArticle {
  const d = doc.data();
  return {
    id: doc.id,
    title: str(d.title, "Untitled"),
    slug: str(d.slug, doc.id),
    excerpt: str(d.excerpt),
    body: str(d.body),
    coverImagePath: nullableStr(d.coverImagePath),
    coverImageUrl: nullableStr(d.coverImageUrl),
    coverImageAlt: nullableStr(d.coverImageAlt),
    authorId: str(d.authorId),
    authorName: str(d.authorName, "MONARCHS MC"),
    category: oneOf<NewsCategory>(d.category, NEWS_CATEGORIES, "Club News"),
    published: bool(d.published),
    publishedAt: toMillis(d.publishedAt),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
    seoTitle: nullableStr(d.seoTitle),
    seoDescription: nullableStr(d.seoDescription),
    ogImageUrl: nullableStr(d.ogImageUrl),
  };
}

/** Published articles only. Drafts are never reachable from a public path. */
export async function listPublishedNews(options?: {
  limit?: number;
  cursor?: number | null;
  category?: NewsCategory;
}): Promise<Page<NewsArticle>> {
  const take = clampLimit(options?.limit, 9);
  return withDb<Page<NewsArticle>>({ items: [], nextCursor: null }, async (database) => {
    let q = database.collection(NEWS).where("published", "==", true);
    if (options?.category) q = q.where("category", "==", options.category);
    q = q.orderBy("publishedAt", "desc");
    if (options?.cursor) q = q.startAfter(new Date(options.cursor));

    const snap = await q.limit(take + 1).get();
    const docs = snap.docs.slice(0, take);
    const items = docs.map(mapArticle);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: snap.docs.length > take && last?.publishedAt ? String(last.publishedAt) : null,
    };
  });
}

export async function getPublishedArticleBySlug(slug: string): Promise<NewsArticle | null> {
  return withDb<NewsArticle | null>(null, async (database) => {
    const snap = await database
      .collection(NEWS)
      .where("slug", "==", slug)
      .where("published", "==", true)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    return doc ? mapArticle(doc) : null;
  });
}

export async function listPublishedNewsSlugs(max = 300): Promise<Array<{ slug: string; updatedAt: number }>> {
  return withDb<Array<{ slug: string; updatedAt: number }>>([], async (database) => {
    const snap = await database
      .collection(NEWS)
      .where("published", "==", true)
      .orderBy("publishedAt", "desc")
      .limit(max)
      .get();
    return snap.docs.map((doc) => ({
      slug: str(doc.data().slug, doc.id),
      updatedAt: requireMillis(doc.data().updatedAt, Date.now()),
    }));
  });
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  return withDb<NewsArticle | null>(null, async (database) => {
    const doc = await database.collection(NEWS).doc(id).get();
    return doc.exists ? mapArticle(doc as QueryDocumentSnapshot) : null;
  });
}

export async function listAllNews(limit = 40): Promise<NewsArticle[]> {
  return withDb<NewsArticle[]>([], async (database) => {
    const snap = await database
      .collection(NEWS)
      .orderBy("updatedAt", "desc")
      .limit(clampLimit(limit, 40))
      .get();
    return snap.docs.map(mapArticle);
  });
}

export async function countUnpublishedNews(): Promise<number> {
  return withDb<number>(0, async (database) => {
    const snap = await database.collection(NEWS).where("published", "==", false).count().get();
    return snap.data().count;
  });
}
