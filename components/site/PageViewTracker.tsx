"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Emits a page_view through the analytics façade on every client navigation.
 * Only the path is recorded — never query strings, which can carry identifiers.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track({ name: "page_view", path: pathname });
  }, [pathname]);

  return null;
}
