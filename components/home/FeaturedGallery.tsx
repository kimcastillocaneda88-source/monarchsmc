import Link from "next/link";
import { EmptyState } from "@/components/ui/States";
import { SmartImage } from "@/components/ui/SmartImage";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { Reveal } from "@/components/site/Reveal";
import type { GalleryItem } from "@/types";

/**
 * Featured, approved gallery images. Asymmetric composition: the first image
 * takes a tall column, the rest fall into a staggered grid.
 */
export function FeaturedGallery({ items }: { items: GalleryItem[] }) {
  const [lead, ...rest] = items;

  return (
    <section className="border-t border-ash bg-ink py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <Eyebrow index="04">From the road</Eyebrow>
            <SectionHeading>The gallery</SectionHeading>
          </div>
          <Link
            href="/gallery"
            className="u-underline-grow font-display text-[0.6875rem] tracking-[0.22em] text-gold uppercase"
          >
            View all photographs →
          </Link>
        </div>

        {items.length === 0 ? (
          <EmptyState
            className="mt-14"
            title="The gallery is empty"
            description="Approved photographs appear here. An administrator can upload and feature images from the admin area."
          />
        ) : (
          <div className="mt-14 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-4">
            {lead ? (
              <Reveal className="bg-ink sm:col-span-2 sm:row-span-2">
                <Link href="/gallery" className="group block">
                  <SmartImage
                    src={lead.imageUrl}
                    alt={lead.altText}
                    ratio="square"
                    sizes="half"
                    overlay="soft"
                    imageClassName="transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <span className="sr-only">Open the gallery</span>
                </Link>
              </Reveal>
            ) : null}

            {rest.map((item, i) => (
              <Reveal key={item.id} delay={i * 70} className="bg-ink">
                <Link href={`/gallery?category=${item.category}`} className="group block">
                  <SmartImage
                    src={item.imageUrl}
                    alt={item.altText}
                    ratio="square"
                    sizes="quarter"
                    overlay="soft"
                    imageClassName="transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <span className="sr-only">View {item.category} photographs</span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
