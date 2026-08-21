import { ButtonLink } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/SmartImage";
import { Monogram } from "@/components/ui/SmartImage";

/**
 * Homepage hero.
 *
 * Full-bleed photograph with a scrim, built so it works with no image at all —
 * before the club uploads photography the plate is a hatched placeholder and
 * the typography still carries the page. No video dependency.
 */
export function Hero({
  kicker,
  imageUrl,
  imageAlt,
}: {
  kicker: string;
  imageUrl: string | null;
  imageAlt: string | null;
}) {
  return (
    <section className="u-grain relative isolate flex min-h-[88svh] items-end overflow-hidden sm:min-h-[92svh]">
      <div className="absolute inset-0 -z-10">
        <SmartImage
          src={imageUrl}
          alt={imageAlt ?? ""}
          ratio="hero"
          sizes="hero"
          priority
          className="h-full w-full [&>*]:h-full"
          imageClassName="object-cover"
          label="Hero photograph — upload in Admin › Settings"
        />
        <div aria-hidden="true" className="u-scrim absolute inset-0" />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-5 pt-32 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
        <div className="max-w-4xl">
          <p className="flex items-center gap-3 font-display text-[0.6875rem] tracking-[0.34em] text-gold uppercase">
            <Monogram className="h-4 w-4" />
            {kicker}
          </p>

          <h1 className="mt-7">
            <span className="sr-only">MONARCHS MC — Ride with purpose. Ride as one.</span>
            <span
              aria-hidden="true"
              className="u-display-tight block text-[clamp(3rem,13vw,9rem)] text-bone uppercase"
            >
              Monarchs MC
            </span>
            <span
              aria-hidden="true"
              className="mt-5 block font-display text-[clamp(1.125rem,3.4vw,2.25rem)] leading-[1.05] tracking-[0.04em] text-bone/85 uppercase"
            >
              Ride with purpose.
              <br />
              <span className="text-gold">Ride as one.</span>
            </span>
          </h1>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <ButtonLink href="/about" size="lg" withArrow>
              Discover the Monarchs
            </ButtonLink>
            <ButtonLink href="/join" size="lg" variant="secondary">
              Become a Member
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Quiet scroll affordance; decorative only. */}
      <div
        aria-hidden="true"
        className="absolute right-5 bottom-8 hidden items-center gap-3 sm:right-8 lg:right-12 lg:flex"
      >
        <span className="font-display text-[0.5625rem] tracking-[0.3em] text-smoke uppercase">
          Scroll
        </span>
        <span className="h-10 w-px bg-linear-to-b from-gold/70 to-transparent" />
      </div>
    </section>
  );
}
