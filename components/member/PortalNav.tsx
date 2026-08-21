"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/components/site/nav-links";

/**
 * Shared portal navigation for the member and admin areas.
 *
 * On desktop it is a vertical rail; on small screens it becomes a horizontally
 * scrollable strip so every section stays reachable with one thumb.
 */
export function PortalNav({
  links,
  ariaLabel,
  className,
}: {
  links: NavLink[];
  ariaLabel: string;
  className?: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && href !== "/member" && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={ariaLabel} className={className}>
      {/* Mobile: horizontal rail */}
      <ul className="-mx-5 flex gap-px overflow-x-auto bg-ash px-5 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center bg-ink px-4 font-display text-[0.625rem] tracking-[0.18em] whitespace-nowrap uppercase transition-colors",
                isActive(link.href) ? "bg-gold text-ink" : "text-mist hover:text-gold",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: vertical rail */}
      <ul className="hidden lg:block lg:space-y-px">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center border-l-2 px-4 font-display text-[0.6875rem] tracking-[0.18em] uppercase transition-all",
                isActive(link.href)
                  ? "border-gold bg-charcoal text-gold"
                  : "border-transparent text-mist hover:border-iron hover:text-bone",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
