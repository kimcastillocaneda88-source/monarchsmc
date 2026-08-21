import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { Reveal } from "@/components/site/Reveal";
import { PRINCIPLES } from "@/lib/content/defaults";

/** The four principles. A hairline grid rather than a row of rounded cards. */
export function Principles() {
  return (
    <section className="border-t border-ash bg-ink py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <Eyebrow index="02">What we stand on</Eyebrow>
          <SectionHeading>Four things, held without exception</SectionHeading>
        </div>

        <div className="mt-14 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((principle, i) => (
            <Reveal
              key={principle.title}
              delay={i * 90}
              className="group relative bg-ink p-7 transition-colors duration-500 hover:bg-charcoal sm:p-8 lg:p-9"
            >
              <span className="font-display text-[0.625rem] tracking-[0.28em] text-gold/60">
                {principle.index}
              </span>
              <h3 className="mt-6 font-display text-2xl tracking-[0.02em] text-bone uppercase sm:text-3xl">
                {principle.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-smoke">{principle.body}</p>
              <span
                aria-hidden="true"
                className="mt-7 block h-px w-10 bg-gold/40 transition-all duration-500 group-hover:w-full group-hover:bg-gold/70"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
