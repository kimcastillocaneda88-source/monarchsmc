import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { SmartImage } from "@/components/ui/SmartImage";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { renderMarkdown } from "@/lib/markdown";
import { getPageContent, section } from "@/lib/data/settings";
import { listApprovedGallery } from "@/lib/data/gallery";
import { BROTHERHOOD_SECTIONS, PRINCIPLES } from "@/lib/content/defaults";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Brotherhood",
  description:
    "Brotherhood, riding culture, responsibility and respect — what membership of MONARCHS MC asks of a rider.",
  alternates: { canonical: siteUrl("/brotherhood") },
  openGraph: { title: "Brotherhood · MONARCHS MC", url: siteUrl("/brotherhood") },
};

function fb(key: string): string {
  return BROTHERHOOD_SECTIONS.find((s) => s.key === key)?.fallback ?? "";
}

export default async function BrotherhoodPage() {
  const [page, gallery] = await Promise.all([
    getPageContent("brotherhood"),
    listApprovedGallery({ limit: 6, category: "brotherhood" }),
  ]);

  const images = gallery.items;

  const blocks = [
    { key: "responsibilityBody", index: "01", title: "Responsibility" },
    { key: "respectBody", index: "02", title: "Respect" },
    { key: "cultureBody", index: "03", title: "Riding culture" },
  ] as const;

  return (
    <>
      <PageHero
        eyebrow="Brotherhood"
        title="What we owe each other"
        imageUrl={page?.heroImageUrl ?? null}
        imageAlt={page?.heroImageAlt ?? null}
        imageLabel="Brotherhood page photograph"
      />

      {/* Opening statement, set large. */}
      <Section>
        <Container size="prose">
          <Reveal>
            <div className="font-display text-[clamp(1.375rem,3.6vw,2.25rem)] leading-[1.15] tracking-[0.01em] text-bone uppercase">
              {section(page, "lede", fb("lede"))}
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Image-led storytelling: text and plates alternate. */}
      {blocks.map((block, i) => {
        const image = images[i];
        const reversed = i % 2 === 1;
        return (
          <Section key={block.key} tone={reversed ? "ink" : "charcoal"}>
            <Container>
              <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
                <Reveal className={reversed ? "lg:order-2 lg:col-span-6" : "lg:col-span-6"}>
                  <SmartImage
                    src={image?.imageUrl ?? null}
                    alt={image?.altText ?? ""}
                    ratio={reversed ? "editorial" : "portrait"}
                    sizes="half"
                    label="Brotherhood photograph"
                    className="border border-ash"
                  />
                </Reveal>
                <Reveal
                  delay={120}
                  className={reversed ? "lg:order-1 lg:col-span-6" : "lg:col-span-6"}
                >
                  <Eyebrow index={block.index}>{block.title}</Eyebrow>
                  <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">
                    {block.title}
                  </SectionHeading>
                  <div className="mt-7">{renderMarkdown(section(page, block.key, fb(block.key)))}</div>
                </Reveal>
              </div>
            </Container>
          </Section>
        );
      })}

      {/* The four principles restated as a plain list. */}
      <Section>
        <Container>
          <Eyebrow index="04">The standard</Eyebrow>
          <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">
            Held without exception
          </SectionHeading>
          <ol className="mt-12 divide-y divide-ash border-y border-ash">
            {PRINCIPLES.map((principle) => (
              <li key={principle.title} className="grid gap-3 py-8 sm:grid-cols-12 sm:gap-8">
                <span className="font-display text-[0.625rem] tracking-[0.28em] text-gold/60 sm:col-span-1">
                  {principle.index}
                </span>
                <h3 className="font-display text-2xl tracking-[0.04em] text-bone uppercase sm:col-span-3">
                  {principle.title}
                </h3>
                <p className="text-sm leading-relaxed text-mist sm:col-span-8">{principle.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 flex flex-wrap gap-4">
            <ButtonLink href="/join" withArrow>
              Apply to join
            </ButtonLink>
            <ButtonLink href="/rides" variant="secondary">
              See the rides
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
