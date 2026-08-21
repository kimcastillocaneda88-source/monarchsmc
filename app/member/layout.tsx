import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { PortalShell } from "@/components/member/PortalShell";
import { MEMBER_NAV } from "@/components/site/nav-links";

export const metadata: Metadata = {
  title: { default: "Member area", template: "%s · Member area · MONARCHS MC" },
  // The member area is never indexed, in addition to being disallowed in robots.txt.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

/** The member area is rendered per request; it is never cached or prerendered. */
export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  // Authentication gate for the whole segment. Every page below also enforces
  // its own requirement — this is defence in depth, not the only check.
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fmember%2Fdashboard");

  return (
    <PortalShell
      user={user}
      links={MEMBER_NAV}
      navLabel="Member area"
      areaLabel="Member area"
      areaHref="/member/dashboard"
    >
      {children}
    </PortalShell>
  );
}
