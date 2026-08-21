import { Suspense } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

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
