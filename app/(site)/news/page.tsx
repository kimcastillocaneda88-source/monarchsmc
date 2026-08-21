import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { EditorialCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Eyebrow, Meta } from "@/components/ui/Typography";
import { Reveal } from "@/components/site/Reveal";
import { listPublishedNews } from "@/lib/data/news";
import { NEWS_CATEGORIES, type NewsCategory } from "@/types";
import { formatMillis, readingTimeMinutes, siteUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "News",
  description:
    "Club news, ride reports, member stories and announcements from MONARCHS MC.",
  alternates: { canonical: siteUrl("/news") },
  openGraph: { title: "News · MONARCHS MC", url: siteUrl("/news") },
};

function parseCategory(value: string | undefined): NewsCategory | undefined {
  if (!value) return undefined;
  return (NEWS_CATEGORIES as readonly string[]).includes(value) ? (value as NewsCategory) : undefined;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; cursor?: string }>;
}) {
  const { category, cursor } = await searchParams;
  const parsed = parseCategory(category);

  const page = await listPublishedNews({
    limit: 9,
    category: parsed,
    cursor: cursor ? Number(cursor) : null,
  });

  const base = parsed ? `/news?category=${encodeURIComponent(parsed)}&` : "/news?";

  return (
    <>
      <PageHero
        eyebrow="Journal"
        title="News & ride reports"
        lede="What the club has been doing, written by the people who were there."
      />

      <Section>
        <Container>
          <nav aria-label="Article categories" className="flex flex-wrap gap-px bg-ash">
            <Link
              href="/news"
              aria-current={!parsed ? "true" : undefined}
              className={cn(
                "min-h-11 bg-ink px-5 py-3 font-display text-[0.625rem] tracking-[0.2em] uppercase transition-colors",
                !parsed ? "bg-gold text-ink" : "text-mist hover:text-gold",
              )}
            >
              All
            </Link>
            {NEWS_CATEGORIES.map((item) => (
              <Link
                key={item}
                href={`/news?category=${encodeURIComponent(item)}`}
                aria-current={parsed === item ? "true" : undefined}
                className={cn(
                  "min-h-11 bg-ink px-5 py-3 font-display text-[0.625rem] tracking-[0.2em] uppercase transition-colors",
                  parsed === item ? "bg-gold text-ink" : "text-mist hover:text-gold",
                )}
              >
                {item}
              </Link>
            ))}
          </nav>

          {page.items.length === 0 ? (
            <EmptyState
              className="mt-12"
              title={parsed ? "Nothing in this category yet" : "No articles published"}
              description="Ride reports, club news and member stories appear here once an editor publishes them."
            />
          ) : (
            <div className="mt-12 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
              {page.items.map((article, i) => (
                <Reveal key={article.id} delay={i * 60} className="bg-ink">
                  <EditorialCard
                    className="h-full border-0"
                    href={`/news/${article.slug}`}
                    imageUrl={article.coverImageUrl}
                    imageAlt={article.coverImageAlt ?? article.title}
                    imageLabel="Article cover"
                    priority={i === 0}
                    eyebrow={<Eyebrow>{article.category}</Eyebrow>}
                    title={article.title}
                    meta={
                      <Meta>
                        {formatMillis(article.publishedAt)} · {readingTimeMinutes(article.body)} min read
                      </Meta>
                    }
                    description={article.excerpt}
                  />
                </Reveal>
              ))}
            </div>
          )}

          {page.nextCursor ? (
            <div className="mt-12 flex justify-center">
              <Link
                href={`${base}cursor=${encodeURIComponent(page.nextCursor)}`}
                className="inline-flex min-h-12 items-center gap-2 border border-iron px-8 font-display text-[0.6875rem] tracking-[0.2em] text-mist uppercase transition hover:border-gold hover:text-gold"
              >
                Older articles <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
