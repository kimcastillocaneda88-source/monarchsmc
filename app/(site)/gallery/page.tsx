import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { EmptyState } from "@/components/ui/States";
import { GalleryFilter, GalleryGrid } from "@/components/gallery/GalleryGrid";
import { listApprovedGallery } from "@/lib/data/gallery";
import { GALLERY_CATEGORIES, type GalleryCategory } from "@/types";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photography from MONARCHS MC — rides, events, machines and the people behind the club.",
  alternates: { canonical: siteUrl("/gallery") },
  openGraph: { title: "Gallery · MONARCHS MC", url: siteUrl("/gallery") },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "rides", label: "Rides" },
  { value: "events", label: "Events" },
  { value: "brotherhood", label: "Brotherhood" },
  { value: "machines", label: "Machines" },
  { value: "community", label: "Community" },
];

function parseCategory(value: string | undefined): GalleryCategory | undefined {
  if (!value) return undefined;
  return (GALLERY_CATEGORIES as readonly string[]).includes(value)
    ? (value as GalleryCategory)
    : undefined;
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; cursor?: string }>;
}) {
  const { category, cursor } = await searchParams;
  const parsed = parseCategory(category);

  // One bounded page at a time — never the whole collection.
  const page = await listApprovedGallery({
    limit: 24,
    category: parsed,
    cursor: cursor ? Number(cursor) : null,
  });

  const activeFilter = parsed ?? "all";
  const basePath = parsed ? `/gallery?category=${parsed}&` : "/gallery?";

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="The record"
        lede="Photographs from the road, the workshop and the gatherings in between. Every image here has been approved by the club."
      />

      <Section>
        <Container>
          <GalleryFilter categories={FILTERS} active={activeFilter} />

          <div className="mt-10">
            {page.items.length === 0 ? (
              <EmptyState
                title={parsed ? "No photographs in this category" : "The gallery is empty"}
                description={
                  parsed
                    ? "Try another category, or check back once more photographs have been approved."
                    : "Approved photographs appear here. An administrator can upload and approve images from the admin area."
                }
              />
            ) : (
              <GalleryGrid items={page.items} category={activeFilter} />
            )}
          </div>

          {page.nextCursor ? (
            <nav aria-label="Gallery pagination" className="mt-12 flex justify-center">
              <a
                href={`${basePath}cursor=${encodeURIComponent(page.nextCursor)}`}
                className="inline-flex min-h-12 items-center gap-2 border border-iron px-8 font-display text-[0.6875rem] tracking-[0.2em] text-mist uppercase transition hover:border-gold hover:text-gold"
              >
                Load more photographs <span aria-hidden="true">→</span>
              </a>
            </nav>
          ) : null}

          {cursor ? (
            <p className="mt-10 text-center">
              <a
                href={parsed ? `/gallery?category=${parsed}` : "/gallery"}
                className="font-display text-[0.625rem] tracking-[0.22em] text-gold uppercase"
              >
                ← Back to the start of the gallery
              </a>
            </p>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
