import type { Metadata } from "next";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { listDocuments } from "@/lib/data/documents";
import { canReadDocument } from "@/lib/auth/roles";
import { formatMillis } from "@/lib/utils";
import { DOCUMENT_CATEGORIES } from "@/types";

export const metadata: Metadata = { title: "Documents" };

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default async function MemberDocumentsPage() {
  const user = await requireActiveMemberPage("/member/documents");
  const all = await listDocuments(60);

  // A document the member may not read is not listed at all.
  const documents = all.filter((doc) => canReadDocument(user, doc.requiredRole));

  const grouped = DOCUMENT_CATEGORIES.map((category) => ({
    category,
    items: documents.filter((doc) => doc.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title="Documents"
        description="Club paperwork, guidelines and resources. Files are served through an authorised, short-lived link — a Storage URL on its own will not open them."
      />

      {documents.length === 0 ? (
        <EmptyState
          title="No documents available"
          description="Club documents appear here once an administrator uploads them."
        />
      ) : (
        <div className="space-y-10">
          {grouped.map((group) => (
            <section key={group.category}>
              <h2 className="u-eyebrow">{group.category}</h2>
              <ul className="mt-5 space-y-px bg-ash">
                {group.items.map((doc) => (
                  <li key={doc.id} className="bg-ink">
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                      <div className="min-w-0">
                        <h3 className="font-display text-base tracking-[0.06em] text-bone uppercase">
                          {doc.title}
                        </h3>
                        {doc.description ? (
                          <p className="mt-1.5 text-sm leading-relaxed text-smoke">{doc.description}</p>
                        ) : null}
                        <p className="mt-2 font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                          {formatBytes(doc.sizeBytes)} · Added {formatMillis(doc.createdAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3">
                        {doc.requiredRole !== "member" ? (
                          <Badge tone="gold">{doc.requiredRole}+</Badge>
                        ) : null}
                        <a
                          href={`/api/documents/${doc.id}`}
                          className="inline-flex min-h-11 items-center gap-2 border border-iron px-5 font-display text-[0.625rem] tracking-[0.2em] text-mist uppercase transition hover:border-gold hover:text-gold"
                        >
                          Download
                          <span aria-hidden="true">↓</span>
                          <span className="sr-only">{doc.title}</span>
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
