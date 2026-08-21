import Link from "next/link";
import type { ReactNode } from "react";
import { Monogram } from "@/components/ui/SmartImage";
import { Badge } from "@/components/ui/Badge";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { PortalNav } from "./PortalNav";
import { MEMBERSHIP_LABELS, ROLE_LABELS } from "@/lib/auth/roles";
import type { NavLink } from "@/components/site/nav-links";
import type { SessionUser } from "@/types";

/**
 * Chrome shared by the member portal and the admin area.
 * Deliberately plainer than the public site: this is a working interface.
 */
export function PortalShell({
  user,
  links,
  navLabel,
  areaLabel,
  areaHref,
  children,
}: {
  user: SessionUser;
  links: NavLink[];
  navLabel: string;
  areaLabel: string;
  areaHref: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <header className="sticky top-0 z-50 border-b border-ash bg-ink/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href={areaHref} className="flex shrink-0 items-center gap-3">
              <Monogram className="h-7 w-7 text-gold" />
              <span className="hidden font-display text-sm tracking-[0.2em] text-bone uppercase sm:inline">
                Monarchs MC
              </span>
            </Link>
            <span aria-hidden="true" className="hidden h-5 w-px bg-ash sm:block" />
            <span className="truncate font-display text-[0.625rem] tracking-[0.22em] text-gold uppercase">
              {areaLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase transition hover:text-bone sm:inline"
            >
              Public site
            </Link>
            <SignOutButton className="border border-ash px-3 py-2 font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase transition hover:border-gold hover:text-gold" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-5 py-6 sm:px-8 lg:flex-row lg:gap-12 lg:py-10">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <div className="hidden lg:block">
              <p className="truncate font-display text-sm tracking-[0.1em] text-bone uppercase">
                {user.displayName ?? user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={user.membershipStatus === "active" ? "success" : "warning"}>
                  {MEMBERSHIP_LABELS[user.membershipStatus]}
                </Badge>
                {user.role !== "member" ? <Badge tone="gold">{ROLE_LABELS[user.role]}</Badge> : null}
              </div>
            </div>

            <PortalNav links={links} ariaLabel={navLabel} className="lg:mt-8" />
          </div>
        </aside>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Page header used inside the portal. */
export function PortalHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-ash pb-6">
      <div className="min-w-0">
        {eyebrow ? <p className="u-eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-3 font-display text-3xl tracking-[0.02em] text-bone uppercase sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-smoke">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </header>
  );
}
