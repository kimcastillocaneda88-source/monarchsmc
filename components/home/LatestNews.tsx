import Link from "next/link";
import { EditorialCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Eyebrow, Meta, SectionHeading } from "@/components/ui/Typography";
import { Reveal } from "@/components/site/Reveal";
import { formatMillis, readingTimeMinutes } from "@/lib/utils";
import type { NewsArticle } from "@/types";

export function LatestNews({ articles }: { articles: NewsArticle[] }) {
  return (
    <section className="border-t border-ash bg-charcoal py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <Eyebrow index="05">Journal</Eyebrow>
            <SectionHeading>Latest from the club</SectionHeading>
          </div>
          <Link
            href="/news"
            className="u-underline-grow font-display text-[0.6875rem] tracking-[0.22em] text-gold uppercase"
          >
            All articles →
          </Link>
        </div>

        {articles.length === 0 ? (
          <EmptyState
            className="mt-14"
            title="Nothing published yet"
            description="Ride reports, club news and member stories will appear here once an editor publishes the first article."
          />
        ) : (
          <div className="mt-14 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, i) => (
              <Reveal key={article.id} delay={i * 80} className="bg-ink">
                <EditorialCard
                  className="h-full border-0"
                  href={`/news/${article.slug}`}
                  imageUrl={article.coverImageUrl}
                  imageAlt={article.coverImageAlt ?? article.title}
                  imageLabel="Article cover"
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
      </div>
    </section>
  );
}
