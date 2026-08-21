import type { Metadata } from "next";
import { Monogram } from "@/components/ui/SmartImage";
import { ButtonLink } from "@/components/ui/Button";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata: Metadata = {
  title: "Not permitted",
  robots: { index: false, follow: false },
};

/** 403 — signed in, but the account does not hold the required role. */
export default function ForbiddenPage() {
  return (
    <main
      id="main"
      className="u-grain relative isolate flex min-h-dvh flex-col items-center justify-center bg-ink px-5 py-20 text-center"
    >
      <Monogram className="h-10 w-10 text-gold/70" />
      <p className="u-eyebrow mt-8 justify-center">Error 403</p>
      <h1 className="u-display-tight mt-6 text-[clamp(2.5rem,10vw,6rem)] text-bone uppercase">
        Not your gate
      </h1>
      <p className="mt-6 max-w-md text-base leading-relaxed text-mist">
        You are signed in, but this area needs a role your account does not hold. If you believe that
        is wrong, speak to a club officer.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <ButtonLink href="/member/dashboard" size="lg">
          Member area
        </ButtonLink>
        <ButtonLink href="/" size="lg" variant="secondary">
          Public site
        </ButtonLink>
      </div>
      <SignOutButton className="mt-10 font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase transition hover:text-gold" />
    </main>
  );
}
