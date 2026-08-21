import Link from "next/link";
import type { ReactNode } from "react";
import { Monogram } from "@/components/ui/SmartImage";
import { Eyebrow } from "@/components/ui/Typography";

/** Shared frame for the sign-in and password-reset pages. */
export function AuthShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <section className="u-grain relative isolate flex min-h-[calc(100dvh-5rem)] items-center border-b border-ash bg-ink py-16 sm:py-20">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-6 lg:pt-6">
            <Link href="/" className="inline-flex items-center gap-3">
              <Monogram className="h-8 w-8 text-gold" />
              <span className="font-display text-lg tracking-[0.24em] text-bone uppercase">
                Monarchs MC
              </span>
            </Link>

            <div className="mt-12">
              <Eyebrow>{eyebrow}</Eyebrow>
              <h1 className="u-display-tight mt-6 text-[clamp(2.25rem,7vw,4.5rem)] text-bone uppercase">
                {title}
              </h1>
              {lede ? <p className="mt-6 max-w-md text-base leading-relaxed text-mist">{lede}</p> : null}
            </div>

            <p className="mt-12 max-w-md border-l-2 border-gold/50 pl-5 text-sm leading-relaxed text-smoke">
              The member area is for active members of MONARCHS MC. Accounts are created by club
              officers — signing in is not the same as joining.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="border border-ash bg-charcoal/60 p-6 sm:p-9">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
