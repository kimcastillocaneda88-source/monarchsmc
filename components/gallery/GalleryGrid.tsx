"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BLUR_DATA_URL, IMAGE_SIZES, isRenderableImageUrl } from "@/lib/images";
import { track } from "@/lib/analytics";
import type { GalleryItem } from "@/types";

/**
 * Editorial gallery grid with a keyboard-accessible lightbox.
 *
 * - Thumbnails are requested at grid size via `sizes`, so a phone never
 *   downloads a full-resolution original.
 * - Every tile is a real <button>, so the grid is tabbable and operable with
 *   Enter/Space.
 * - The lightbox implements the dialog pattern: focus trap, Escape to close,
 *   arrow keys to move between images, focus returned to the opening tile.
 */
export function GalleryGrid({ items, category }: { items: GalleryItem[]; category: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggersRef = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const open = useCallback(
    (index: number) => {
      setOpenIndex(index);
      track({ name: "gallery_opened", category });
    },
    [category],
  );

  const close = useCallback(() => {
    setOpenIndex((current) => {
      if (current !== null) triggersRef.current[current]?.focus();
      return null;
    });
  }, []);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null || items.length === 0) return current;
        return (current + delta + items.length) % items.length;
      });
    },
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "Tab") {
        // Only the close and navigation controls are focusable inside.
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>("button");
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [openIndex, close, step]);

  const active = openIndex === null ? null : items[openIndex];

  return (
    <>
      <ul className="grid grid-cols-2 gap-px bg-ash sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <li key={item.id} className="bg-ink">
            <button
              ref={(node) => {
                triggersRef.current[index] = node;
              }}
              type="button"
              onClick={() => open(index)}
              className="group relative block aspect-square w-full overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
            >
              {isRenderableImageUrl(item.imageUrl) ? (
                <Image
                  src={item.imageUrl}
                  alt={item.altText}
                  fill
                  sizes={IMAGE_SIZES.quarter}
                  loading={index < 4 ? "eager" : "lazy"}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
              ) : (
                <span className="u-hatch absolute inset-0" />
              )}
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/25"
              />
              <span className="absolute inset-x-0 bottom-0 translate-y-2 p-3 text-left opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <span className="block truncate font-display text-[0.625rem] tracking-[0.18em] text-bone uppercase">
                  {item.title}
                </span>
              </span>
              <span className="sr-only">Open “{item.title}” in the viewer</span>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          <button
            type="button"
            onClick={close}
            aria-label="Close image viewer"
            className="absolute inset-0 h-full w-full cursor-default bg-ink/96"
            tabIndex={-1}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${active.title}. Image ${(openIndex ?? 0) + 1} of ${items.length}`}
            className="relative flex h-full w-full flex-col"
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
              <p className="font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase">
                {(openIndex ?? 0) + 1} / {items.length}
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center text-2xl text-smoke transition hover:text-gold"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="relative flex-1 px-5 pb-4 sm:px-8">
              {isRenderableImageUrl(active.imageUrl) ? (
                <Image
                  src={active.imageUrl}
                  alt={active.altText}
                  fill
                  sizes="100vw"
                  priority
                  className="object-contain p-2"
                />
              ) : (
                <div className="u-hatch h-full w-full" />
              )}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-ash px-5 py-5 sm:px-8">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={items.length < 2}
                className="flex min-h-11 items-center gap-2 border border-iron px-4 font-display text-[0.625rem] tracking-[0.2em] text-mist uppercase transition hover:border-gold hover:text-gold disabled:opacity-40"
              >
                <span aria-hidden="true">←</span> Previous
              </button>

              <div className="min-w-0 flex-1 px-4 text-center">
                <p className="truncate font-display text-sm tracking-[0.12em] text-bone uppercase">
                  {active.title}
                </p>
                {active.caption ? (
                  <p className="mt-1 truncate text-xs text-smoke">{active.caption}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => step(1)}
                disabled={items.length < 2}
                className="flex min-h-11 items-center gap-2 border border-iron px-4 font-display text-[0.625rem] tracking-[0.2em] text-mist uppercase transition hover:border-gold hover:text-gold disabled:opacity-40"
              >
                Next <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Category filter rendered as links so it works without JavaScript. */
export function GalleryFilter({
  categories,
  active,
}: {
  categories: Array<{ value: string; label: string }>;
  active: string;
}) {
  return (
    <nav aria-label="Gallery categories" className="flex flex-wrap gap-px bg-ash">
      {categories.map((category) => {
        const selected = category.value === active;
        const href = category.value === "all" ? "/gallery" : `/gallery?category=${category.value}`;
        return (
          <a
            key={category.value}
            href={href}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "min-h-11 bg-ink px-5 py-3 font-display text-[0.625rem] tracking-[0.2em] uppercase transition-colors",
              selected ? "bg-gold text-ink" : "text-mist hover:text-gold",
            )}
          >
            {category.label}
          </a>
        );
      })}
    </nav>
  );
}
