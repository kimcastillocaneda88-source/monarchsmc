import type { Metadata } from "next";
import { Monogram } from "@/components/ui/SmartImage";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Sign in required",
  robots: { index: false, follow: false },
};

/** 401 — not signed in at all. */
export default function UnauthorizedPage() {
  return (
    <main
      id="main"
      className="u-grain relative isolate flex min-h-dvh flex-col items-center justify-center bg-ink px-5 py-20 text-center"
    >
      <Monogram className="h-10 w-10 text-gold/70" />
      <p className="u-eyebrow mt-8 justify-center">Error 401</p>
      <h1 className="u-display-tight mt-6 text-[clamp(2.5rem,10vw,6rem)] text-bone uppercase">
        Members only
      </h1>
      <p className="mt-6 max-w-md text-base leading-relaxed text-mist">
        This part of the site is for signed-in members of MONARCHS MC.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <ButtonLink href="/login" size="lg" withArrow>
          Member sign in
        </ButtonLink>
        <ButtonLink href="/join" size="lg" variant="secondary">
          Apply to join
        </ButtonLink>
      </div>
    </main>
  );
}
