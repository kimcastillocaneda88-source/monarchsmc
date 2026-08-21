import { ButtonLink } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/SmartImage";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { Reveal } from "@/components/site/Reveal";

/**
 * Asymmetric introduction block: text on the left at 5 columns, an offset
 * portrait plate on the right that breaks the grid slightly.
 */
export function Intro({
  title,
  body,
  imageUrl,
  imageAlt,
}: {
  title: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string | null;
}) {
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);

  return (
    <section className="relative bg-ink py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-6">
            <Eyebrow index="01">Who we are</Eyebrow>
            <SectionHeading>{title}</SectionHeading>
            <div className="mt-8 space-y-5">
              {paragraphs.map((paragraph, i) => (
                <p key={i} className="max-w-xl text-base leading-relaxed text-mist">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <ButtonLink href="/brotherhood" variant="secondary" withArrow>
                The brotherhood
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={140} className="lg:col-span-6">
            <div className="relative lg:pl-10">
              <SmartImage
                src={imageUrl}
                alt={imageAlt ?? ""}
                ratio="portrait"
                sizes="half"
                label="Club photograph"
                className="border border-ash"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-4 -left-4 hidden h-24 w-24 border-b border-l border-gold/45 lg:block"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
