import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Cursor pagination.
 *
 * Firestore has no offset pagination, so navigation is next/previous using a
 * cursor value carried in the URL. This keeps every query bounded.
 */
export function CursorPagination({
  basePath,
  nextCursor,
  previousCursor,
  className,
  label = "Pagination",
}: {
  basePath: string;
  nextCursor: string | null;
  previousCursor?: string | null;
  className?: string;
  label?: string;
}) {
  if (!nextCursor && !previousCursor) return null;

  const linkClass =
    "inline-flex min-h-11 items-center gap-2 border border-iron px-5 font-display text-[0.6875rem] uppercase tracking-[0.2em] text-mist transition hover:border-gold hover:text-gold";

  return (
    <nav aria-label={label} className={cn("flex items-center justify-between gap-4", className)}>
      {previousCursor ? (
        <Link href={`${basePath}?cursor=${encodeURIComponent(previousCursor)}`} className={linkClass}>
          <span aria-hidden="true">←</span> Previous
        </Link>
      ) : (
        <span />
      )}
      {nextCursor ? (
        <Link href={`${basePath}?cursor=${encodeURIComponent(nextCursor)}`} className={linkClass}>
          Next <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
