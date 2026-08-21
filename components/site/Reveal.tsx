"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveal-on-scroll wrapper.
 *
 * Content is rendered visible by default; it is only hidden after the effect
 * confirms IntersectionObserver support, so no-JS and older browsers never end
 * up with invisible content. Users who prefer reduced motion skip the
 * animation entirely (handled in CSS, and short-circuited here too).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    node.dataset.reveal = "pending";
    if (delay) node.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.dataset.reveal = "shown";
            observer.unobserve(node);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={cn("u-reveal", className)}>
      {children}
    </Tag>
  );
}
