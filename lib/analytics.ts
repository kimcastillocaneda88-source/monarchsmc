/**
 * Provider-agnostic analytics façade.
 *
 * Components emit semantic events; the transport is decided in one place so a
 * provider can be swapped without touching feature code. Nothing here collects
 * personal data — no emails, names, message bodies or uids.
 */

export type AnalyticsEvent =
  | { name: "page_view"; path: string }
  | { name: "join_started" }
  | { name: "join_submitted" }
  | { name: "ride_viewed"; slug: string }
  | { name: "ride_rsvp"; response: string }
  | { name: "event_viewed"; slug: string }
  | { name: "gallery_opened"; category: string }
  | { name: "news_viewed"; slug: string }
  | { name: "contact_submitted"; category: string }
  | { name: "login" }
  | { name: "logout" };

type Payload = Record<string, string | number | boolean>;

interface AnalyticsProvider {
  track(name: string, payload: Payload): void;
}

/** Console provider — active only when explicitly enabled in development. */
const debugProvider: AnalyticsProvider = {
  track(name, payload) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics]", name, payload);
    }
  },
};

/**
 * Vercel Web Analytics custom events, used when the script is present.
 * We never add the dependency ourselves; if the account enables Web Analytics
 * the global is available and we use it.
 */
const vercelProvider: AnalyticsProvider = {
  track(name, payload) {
    const w = window as unknown as { va?: (event: string, name: string, data?: Payload) => void };
    w.va?.("event", name, payload);
  },
};

function providers(): AnalyticsProvider[] {
  if (typeof window === "undefined") return [];
  const list: AnalyticsProvider[] = [debugProvider];
  const w = window as unknown as { va?: unknown };
  if (typeof w.va === "function") list.push(vercelProvider);
  return list;
}

export function track(event: AnalyticsEvent): void {
  const { name, ...rest } = event;
  const payload = rest as Payload;
  for (const provider of providers()) {
    try {
      provider.track(name, payload);
    } catch {
      // Analytics must never break a user flow.
    }
  }
}
