import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section } from "@/components/site/PageHero";
import { SmartImage } from "@/components/ui/SmartImage";
import { Eyebrow } from "@/components/ui/Typography";
import { renderMarkdown } from "@/lib/markdown";
import { getPublishedArticleBySlug, listPublishedNewsSlugs } from "@/lib/data/news";
import { formatMillis, readingTimeMinutes, siteUrl, truncate } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listPublishedNewsSlugs(50);
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return { title: "Article not found", robots: { index: false, follow: false } };

  const url = siteUrl(`/news/${article.slug}`);
  const description =
    article.seoDescription ?? truncate(article.excerpt.replace(/\s+/g, " "), 160);
  const image = article.ogImageUrl ?? article.coverImageUrl;

  return {
    title: article.seoTitle ?? article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.seoTitle ?? article.title,
      description,
      url,
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      authors: [article.authorName],
      ...(image ? { images: [{ url: image, alt: article.coverImageAlt ?? article.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle ?? article.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seoDescription ?? article.excerpt,
    articleSection: article.category,
    author: { "@type": "Organization", name: article.authorName },
    publisher: { "@type": "Organization", name: "MONARCHS MC", url: siteUrl("/") },
    mainEntityOfPage: siteUrl(`/news/${article.slug}`),
    ...(article.publishedAt ? { datePublished: new Date(article.publishedAt).toISOString() } : {}),
    dateModified: new Date(article.updatedAt).toISOString(),
    ...(article.coverImageUrl ? { image: [article.coverImageUrl] } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd).replace(/</g, "\\u003c") }}
      />

      <article>
        <header className="border-b border-ash bg-ink pt-16 pb-12 sm:pt-24 sm:pb-16">
          <Container size="prose">
            <nav aria-label="Breadcrumb" className="mb-8">
              <Link
                href="/news"
                className="font-display text-[0.625rem] tracking-[0.24em] text-gold uppercase transition hover:text-goldbright"
              >
                ← All articles
              </Link>
            </nav>

            <Eyebrow>{article.category}</Eyebrow>
            <h1 className="u-display-tight mt-6 text-[clamp(2rem,6.5vw,4.25rem)] text-bone uppercase">
              {article.title}
            </h1>

            <p className="mt-7 font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase">
              {article.authorName} · {formatMillis(article.publishedAt)} ·{" "}
              {readingTimeMinutes(article.body)} min read
            </p>
          </Container>
        </header>

        {article.coverImageUrl ? (
          <div className="border-b border-ash bg-ink">
            <Container className="py-0">
              <SmartImage
                src={article.coverImageUrl}
                alt={article.coverImageAlt ?? article.title}
                ratio="wide"
                sizes="full"
                priority
              />
            </Container>
          </div>
        ) : null}

        <Section>
          <Container size="prose">
            <p className="border-l-2 border-gold/60 pl-5 text-lg leading-relaxed text-bone">
              {article.excerpt}
            </p>
            <div className="mt-10">{renderMarkdown(article.body)}</div>

            <footer className="mt-16 border-t border-ash pt-8">
              <p className="text-sm text-smoke">
                Written by {article.authorName} for MONARCHS MC.
              </p>
              <Link
                href="/news"
                className="mt-6 inline-flex font-display text-[0.6875rem] tracking-[0.22em] text-gold uppercase"
              >
                ← More from the journal
              </Link>
            </footer>
          </Container>
        </Section>
      </article>
    </>
  );
}
