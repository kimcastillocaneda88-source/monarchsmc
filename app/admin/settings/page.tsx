import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminAreaPage } from "@/lib/auth/guards";
import { canManageAdministrators, canManageContent, type Principal } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { PageContentForm, SiteSettingsForm } from "@/components/admin/SettingsForms";
import { getPageContent, getSiteSettings } from "@/lib/data/settings";
import {
  ABOUT_SECTIONS,
  BROTHERHOOD_SECTIONS,
  CONTACT_SECTIONS,
  HOME_SECTIONS,
  JOIN_SECTIONS,
} from "@/lib/content/defaults";

export const metadata: Metadata = { title: "Settings" };

/**
 * Site settings and editable page copy.
 *
 * Global configuration is superadmin-only; page copy is editorial and open to
 * editors. Both actions re-check independently of what is rendered here.
 */
export default async function AdminSettingsPage() {
  const user = await requireAdminAreaPage("/admin/settings");
  if (!canManageContent(user as Principal)) redirect("/forbidden");

  const superadmin = canManageAdministrators(user as Principal);

  const [settings, home, about, brotherhood, join, contact] = await Promise.all([
    getSiteSettings(),
    getPageContent("home"),
    getPageContent("about"),
    getPageContent("brotherhood"),
    getPageContent("join"),
    getPageContent("contact"),
  ]);

  const pages = [
    { id: "home", label: "Homepage", sections: HOME_SECTIONS, page: home },
    { id: "about", label: "About", sections: ABOUT_SECTIONS, page: about },
    { id: "brotherhood", label: "Brotherhood", sections: BROTHERHOOD_SECTIONS, page: brotherhood },
    { id: "join", label: "Join", sections: JOIN_SECTIONS, page: join },
    { id: "contact", label: "Contact", sections: CONTACT_SECTIONS, page: contact },
  ] as const;

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Settings"
        description="Club identity, contact details, social links and the editable copy on the public pages."
      />

      <div className="space-y-8">
        {superadmin ? (
          <Panel title="Site settings">
            <SiteSettingsForm settings={settings} />
          </Panel>
        ) : (
          <Panel title="Site settings">
            <p className="text-sm leading-relaxed text-smoke">
              Club identity, contact details and social links are managed by a superadmin. You can
              edit the page copy below.
            </p>
          </Panel>
        )}

        <Panel title="Page content">
          <div className="space-y-4">
            {pages.map((entry) => (
              <details key={entry.id} className="group border border-ash">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
                  <span className="font-display text-sm tracking-[0.14em] text-bone uppercase">
                    {entry.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
                  >
                    Edit
                  </span>
                </summary>
                <div className="border-t border-ash p-5">
                  <PageContentForm
                    pageId={entry.id}
                    label={entry.label}
                    sections={[...entry.sections]}
                    page={entry.page}
                    uploadArea="gallery"
                  />
                </div>
              </details>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
