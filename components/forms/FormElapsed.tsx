"use client";

import { useEffect, useRef } from "react";

/**
 * Records how long the form was on screen and writes it into a hidden input.
 *
 * Paired with the honeypot in SpamTrap: together they reject the overwhelming
 * majority of automated submissions without putting a CAPTCHA in front of a
 * real applicant. The server treats both as advisory signals on top of the
 * per-IP rate limit, which is the actual enforcement.
 */
export function FormElapsed({ name = "elapsedMs" }: { name?: string }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // The clock starts on mount rather than during render, which keeps the
    // render itself pure.
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (ref.current) ref.current.value = String(Date.now() - start);
    }, 500);
    return () => window.clearInterval(interval);
  }, []);

  return <input ref={ref} type="hidden" name={name} defaultValue="0" />;
}
