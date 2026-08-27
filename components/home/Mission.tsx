import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { Reveal } from "@/components/site/Reveal";

export function Mission({ title, body }: { title: string; body: string }) {
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);

  return (
    <section className="border-t border-ash py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <Eyebrow index="06">Community</Eyebrow>
            <SectionHeading>{title}</SectionHeading>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-7">
            <div className="space-y-5 lg:pt-14">
              {paragraphs.map((paragraph, i) => (
                <p key={i} className="text-base leading-relaxed text-mist">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-9">
              <ButtonLink href="/contact" variant="secondary" withArrow>
                Get in touch
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
