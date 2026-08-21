"use client";

import { useEffect } from "react";
import { Monogram } from "@/components/ui/SmartImage";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Route-level error boundary.
 *
 * The underlying error is logged for the operator but never rendered — users
 * see a plain message instead of a Firebase or stack detail.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[monarchs] unhandled route error", error);
  }, [error]);

  return (
    <main
      id="main"
      className="u-grain relative isolate flex min-h-dvh flex-col items-center justify-center bg-ink px-5 py-20 text-center"
    >
      <Monogram className="h-10 w-10 text-gold/70" />
      <p className="u-eyebrow mt-8 justify-center">Something broke</p>
      <h1 className="u-display-tight mt-6 text-[clamp(2.25rem,9vw,5.5rem)] text-bone uppercase">
        Off the road
      </h1>
      <p className="mt-6 max-w-md text-base leading-relaxed text-mist">
        We hit an unexpected problem loading this page. Try again — if it keeps happening, let a club
        officer know.
      </p>
      {error.digest ? (
        <p className="mt-4 font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
          Reference {error.digest}
        </p>
      ) : null}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Button onClick={reset} size="lg">
          Try again
        </Button>
        <ButtonLink href="/" size="lg" variant="secondary">
          Back to the club
        </ButtonLink>
      </div>
    </main>
  );
}
