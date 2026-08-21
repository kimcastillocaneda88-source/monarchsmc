import Link from "next/link";
import type { Metadata } from "next";
import { Monogram } from "@/components/ui/SmartImage";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      id="main"
      className="u-grain relative isolate flex min-h-dvh flex-col items-center justify-center bg-ink px-5 py-20 text-center"
    >
      <Monogram className="h-10 w-10 text-gold/70" />
      <p className="u-eyebrow mt-8 justify-center">Error 404</p>
      <h1 className="u-display-tight mt-6 text-[clamp(3rem,14vw,9rem)] text-bone uppercase">
        Wrong turn
      </h1>
      <p className="mt-6 max-w-md text-base leading-relaxed text-mist">
        That page does not exist, or it has been taken down. Everything else is still where you left
        it.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <ButtonLink href="/" size="lg" withArrow>
          Back to the club
        </ButtonLink>
        <ButtonLink href="/rides" size="lg" variant="secondary">
          See the rides
        </ButtonLink>
      </div>
      <nav aria-label="Helpful links" className="mt-14">
        <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3">
          {[
            { href: "/about", label: "About" },
            { href: "/gallery", label: "Gallery" },
            { href: "/news", label: "News" },
            { href: "/join", label: "Join" },
            { href: "/contact", label: "Contact" },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="u-underline-grow font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
