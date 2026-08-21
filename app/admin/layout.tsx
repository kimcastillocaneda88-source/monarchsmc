import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdminArea, canManageClub, type Principal } from "@/lib/auth/roles";
import { PortalShell } from "@/components/member/PortalShell";
import { ToastProvider } from "@/components/admin/ToastProvider";
import { ADMIN_NAV, EDITOR_ADMIN_PATHS } from "@/components/site/nav-links";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · MONARCHS MC" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = "force-dynamic";

/**
 * Admin segment gate.
 *
 * This is the first of three layers: the layout check, a per-page guard, and
 * an authorization check inside every server action and route handler. Hiding
 * navigation is never treated as protection.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!canAccessAdminArea(user as Principal)) redirect("/forbidden");

  // Editors reach only the editorial sections; the rest are not rendered for
  // them at all, and each of those pages independently rejects them.
  const links = canManageClub(user as Principal)
    ? ADMIN_NAV
    : ADMIN_NAV.filter((link) => EDITOR_ADMIN_PATHS.has(link.href));

  return (
    <ToastProvider>
      <PortalShell
        user={user}
        links={links}
        navLabel="Admin"
        areaLabel="Admin"
        areaHref="/admin"
      >
        {children}
      </PortalShell>
    </ToastProvider>
  );
}
