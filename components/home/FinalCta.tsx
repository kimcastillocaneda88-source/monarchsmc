import { ButtonLink } from "@/components/ui/Button";
import { Monogram } from "@/components/ui/SmartImage";

/** Closing statement. Typography alone carries it — no image, no gradient. */
export function FinalCta() {
  return (
    <section className="u-grain relative isolate overflow-hidden border-t border-ash bg-charcoal py-24 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-[1600px] px-5 text-center sm:px-8 lg:px-12">
        <Monogram className="mx-auto h-10 w-10 text-gold/70" />
        <h2 className="u-display-tight mt-9 text-[clamp(2.5rem,10vw,7rem)] text-bone uppercase">
          The road
          <br className="sm:hidden" /> is waiting.
        </h2>
        <p className="mt-6 font-display text-[clamp(1rem,3vw,1.75rem)] tracking-[0.24em] text-gold uppercase">
          Monarchs MC
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <ButtonLink href="/join" size="lg" withArrow>
            Become a Member
          </ButtonLink>
          <ButtonLink href="/rides" size="lg" variant="secondary">
            See the rides
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
