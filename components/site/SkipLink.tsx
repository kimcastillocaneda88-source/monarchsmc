/** First tab stop on every page — required for keyboard-only navigation. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-200 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:border focus:border-gold focus:bg-ink focus:px-5 focus:py-3 focus:font-display focus:text-xs focus:tracking-[0.2em] focus:text-gold focus:uppercase"
    >
      Skip to content
    </a>
  );
}
