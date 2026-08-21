import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAdminAreaPage } from "@/lib/auth/guards";
import { canManageContent, type Principal } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { NewsForm } from "@/components/admin/NewsForm";
import { getArticleById } from "@/lib/data/news";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminAreaPage("/admin/news");
  if (!canManageContent(user as Principal)) redirect("/forbidden");

  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  return (
    <>
      <PortalHeader eyebrow="Admin · News" title={article.title} />
      <Panel>
        <NewsForm article={article} />
      </Panel>
    </>
  );
}
