"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog.
 *
 * Implements the WAI-ARIA dialog pattern: role="dialog" + aria-modal, an
 * accessible name via aria-labelledby, Escape to dismiss, a focus trap, focus
 * moved into the dialog on open and returned to the trigger on close, and the
 * background made inert to scrolling.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown, true);

    const focusTarget = initialFocusRef?.current ?? panelRef.current;
    // Defer so the element exists and the browser has painted.
    const timer = window.setTimeout(() => focusTarget?.focus(), 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = overflow;
      restoreRef.current?.focus?.();
    };
  }, [open, handleKeyDown, initialFocusRef]);

  if (!open || typeof document === "undefined") return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" } as const;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/85 backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative max-h-[92vh] w-full overflow-y-auto border border-ash bg-charcoal shadow-2xl focus:outline-none",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-6 border-b border-ash px-6 py-5">
          <div>
            <h2 id={titleId} className="font-display text-xl uppercase tracking-[0.1em] text-bone">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-2 text-sm leading-relaxed text-smoke">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 -mr-2 p-2 text-2xl leading-none text-smoke transition hover:text-gold"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close</span>
          </button>
        </div>
        {children ? <div className="px-6 py-6">{children}</div> : null}
        {footer ? (
          <div className="flex flex-col-reverse gap-3 border-t border-ash px-6 py-5 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
