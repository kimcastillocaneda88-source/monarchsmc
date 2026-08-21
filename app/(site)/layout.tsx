import { Suspense } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

/**
 * The public site renders per request.
 *
 * Two reasons, and both are load-bearing:
 *  - Every page here reads admin-editable content from Firestore. Prerendering
 *    would freeze whatever the database held when the build ran, so an officer
 *    editing the About copy or publishing an article would see no change until
 *    the next deploy.
 *  - The header resolves the session cookie, which makes these routes dynamic
 *    in production anyway. Declaring it keeps local builds honest instead of
 *    appearing static only because Firebase was unconfigured at build time.
 *
 * The trade-off is deliberate: a club-sized site gains far more from content
 * being correct than from shaving a few milliseconds off an already fast
 * Firestore read.
 */
export const dynamic = "force-dynamic";

/**
 * Public site chrome. The header depends on the session cookie, so it is
 * streamed inside Suspense: the page shell and content render immediately and
 * the nav fills in without blocking first paint.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="h-16 border-b border-transparent sm:h-20" />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="flex-1 pt-16 sm:pt-20">
        {children}
      </main>
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
