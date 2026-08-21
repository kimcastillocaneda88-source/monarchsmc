import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminAreaPage } from "@/lib/auth/guards";
import { canManageContent, type Principal } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ActionButton } from "@/components/admin/ActionButton";
import { deleteArticle, setArticlePublished } from "@/lib/actions/admin/content";
import { listAllNews } from "@/lib/data/news";
import { formatMillis } from "@/lib/utils";
import type { NewsArticle } from "@/types";

export const metadata: Metadata = { title: "News" };

export default async function AdminNewsPage() {
  const user = await requireAdminAreaPage("/admin/news");
  // Editors and above; a plain member with admin-area access does not exist,
  // but the check is explicit rather than implied by the nav.
  if (!canManageContent(user as Principal)) redirect("/forbidden");

  const articles = await listAllNews(40);

  const columns: Array<Column<NewsArticle>> = [
    {
      key: "title",
      header: "Article",
      render: (article) => (
        <Link
          href={`/admin/news/${article.id}`}
          className="font-display text-sm tracking-[0.04em] text-bone uppercase transition hover:text-gold"
        >
          {article.title}
        </Link>
      ),
    },
    { key: "category", header: "Category", render: (article) => article.category },
    {
      key: "published",
      header: "State",
      render: (article) =>
        article.published ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>,
    },
    {
      key: "publishedAt",
      header: "Published",
      render: (article) => (article.publishedAt ? formatMillis(article.publishedAt) : "—"),
    },
    { key: "updatedAt", header: "Updated", render: (article) => formatMillis(article.updatedAt) },
  ];

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="News"
        description="Club news, ride reports and member stories. Drafts are never reachable from a public URL."
        action={
          <ButtonLink href="/admin/news/new" size="sm">
            New article
          </ButtonLink>
        }
      />

      <DataTable
        caption="All articles"
        columns={columns}
        rows={articles}
        rowKey={(article) => article.id}
        empty={
          <EmptyState
            title="No articles yet"
            description="Write the club's first article. It stays a draft until you publish it."
            action={
              <ButtonLink href="/admin/news/new" size="sm">
                Write an article
              </ButtonLink>
            }
          />
        }
        actions={(article) => (
          <div className="flex flex-wrap justify-end gap-2">
            <ButtonLink href={`/admin/news/${article.id}`} variant="secondary" size="sm">
              Edit
            </ButtonLink>
            <ActionButton
              action={setArticlePublished.bind(null, article.id, !article.published)}
              label={article.published ? "Unpublish" : "Publish"}
              variant={article.published ? "ghost" : "primary"}
              confirm={
                article.published
                  ? {
                      title: `Unpublish “${article.title}”?`,
                      description: "It will disappear from the public site immediately.",
                      confirmLabel: "Unpublish",
                    }
                  : undefined
              }
            />
            {article.published ? (
              <ButtonLink href={`/news/${article.slug}`} variant="ghost" size="sm">
                View
              </ButtonLink>
            ) : null}
            <ActionButton
              action={deleteArticle.bind(null, article.id)}
              label="Delete"
              variant="danger"
              confirm={{
                title: `Delete “${article.title}”?`,
                description: "The article is removed permanently. This cannot be undone.",
                confirmLabel: "Delete article",
                destructive: true,
              }}
            />
          </div>
        )}
      />
    </>
  );
}
