"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ui/SmartImage";
import { PUBLIC_NAV } from "./nav-links";
import { SignOutButton } from "@/components/auth/SignOutButton";

export interface HeaderNavProps {
  /** Null when signed out. */
  session: { displayName: string | null; isActiveMember: boolean; canAccessAdmin: boolean } | null;
  clubName: string;
}

export function HeaderNav({ session, clubName }: HeaderNavProps) {
  const pathname = usePathname();
  // The drawer records WHICH route it was opened on. A navigation therefore
  // closes it by derivation, with no effect resetting state after render.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = useCallback(
    (next: boolean) => setOpenedOn(next ? pathname : null),
    [pathname],
  );
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("a,button")?.focus(), 0);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-90 transition-all duration-500",
        scrolled || open
          ? "border-b border-ash/80 bg-ink/94 backdrop-blur-md"
          : "border-b border-transparent bg-linear-to-b from-ink/80 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-6 px-5 sm:h-20 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          aria-label={`${clubName} — home`}
        >
          <Monogram className="h-7 w-7 text-gold sm:h-8 sm:w-8" />
          <span className="font-display text-base leading-none tracking-[0.24em] text-bone uppercase sm:text-lg">
            {clubName}
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {PUBLIC_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "u-underline-grow py-1 font-display text-[0.6875rem] uppercase tracking-[0.22em] transition-colors",
                isActive(link.href) ? "text-gold" : "text-mist hover:text-bone",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {session ? (
            <>
              {session.canAccessAdmin ? (
                <Link
                  href="/admin"
                  className="border border-iron px-4 py-2.5 font-display text-[0.625rem] uppercase tracking-[0.2em] text-mist transition hover:border-gold hover:text-gold"
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href={session.isActiveMember ? "/member/dashboard" : "/member/pending"}
                className="border border-gold bg-gold px-4 py-2.5 font-display text-[0.625rem] uppercase tracking-[0.2em] text-ink transition hover:bg-goldbright"
              >
                Member Area
              </Link>
              <SignOutButton className="px-2 py-2.5 font-display text-[0.625rem] uppercase tracking-[0.2em] text-smoke transition hover:text-bone" />
            </>
          ) : (
            <Link
              href="/login"
              className="border border-iron px-5 py-2.5 font-display text-[0.625rem] uppercase tracking-[0.2em] text-bone transition hover:border-gold hover:text-gold"
            >
              Member Login
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className="-mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true" className="relative block h-3.5 w-6">
            <span
              className={cn(
                "absolute left-0 block h-px w-full bg-bone transition-all duration-300",
                open ? "top-1.5 rotate-45" : "top-0",
              )}
            />
            <span
              className={cn(
                "absolute top-1.5 left-0 block h-px w-full bg-bone transition-opacity duration-200",
                open ? "opacity-0" : "opacity-100",
              )}
            />
            <span
              className={cn(
                "absolute left-0 block h-px w-full bg-bone transition-all duration-300",
                open ? "top-1.5 -rotate-45" : "top-3",
              )}
            />
          </span>
        </button>
      </div>

      {/* Mobile drawer — full-screen, single-column, large tap targets */}
      <div
        id="mobile-navigation"
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 z-90 overflow-y-auto border-t border-ash bg-ink sm:top-20 lg:hidden"
      >
        <nav aria-label="Mobile" className="flex min-h-full flex-col px-5 pt-6 pb-10 sm:px-8">
          <ul className="flex-1 space-y-px">
            {PUBLIC_NAV.map((link, index) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "flex items-baseline gap-4 border-b border-ash/70 py-4 font-display text-2xl uppercase tracking-[0.06em] transition-colors sm:text-3xl",
                    isActive(link.href) ? "text-gold" : "text-bone hover:text-gold",
                  )}
                >
                  <span className="w-7 text-[0.625rem] tracking-[0.2em] text-gold/45">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 space-y-3">
            {session ? (
              <>
                <Link
                  href={session.isActiveMember ? "/member/dashboard" : "/member/pending"}
                  className="flex min-h-13 items-center justify-center border border-gold bg-gold font-display text-xs uppercase tracking-[0.2em] text-ink"
                >
                  Member Area
                </Link>
                {session.canAccessAdmin ? (
                  <Link
                    href="/admin"
                    className="flex min-h-13 items-center justify-center border border-iron font-display text-xs uppercase tracking-[0.2em] text-bone"
                  >
                    Admin
                  </Link>
                ) : null}
                <SignOutButton className="flex min-h-13 w-full items-center justify-center border border-ash font-display text-xs uppercase tracking-[0.2em] text-smoke" />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex min-h-13 items-center justify-center border border-iron font-display text-xs uppercase tracking-[0.2em] text-bone"
                >
                  Member Login
                </Link>
                <Link
                  href="/join"
                  className="flex min-h-13 items-center justify-center border border-gold bg-gold font-display text-xs uppercase tracking-[0.2em] text-ink"
                >
                  Become a Member
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
