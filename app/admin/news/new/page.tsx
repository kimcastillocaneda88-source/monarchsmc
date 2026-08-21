import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminAreaPage } from "@/lib/auth/guards";
import { canManageContent, type Principal } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { NewsForm } from "@/components/admin/NewsForm";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  const user = await requireAdminAreaPage("/admin/news/new");
  if (!canManageContent(user as Principal)) redirect("/forbidden");

  return (
    <>
      <PortalHeader eyebrow="Admin · News" title="New article" />
      <Panel>
        <NewsForm article={null} />
      </Panel>
    </>
  );
}
