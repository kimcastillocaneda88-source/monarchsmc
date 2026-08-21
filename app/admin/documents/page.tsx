import type { Metadata } from "next";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { DocumentForm } from "@/components/admin/DocumentForm";
import { ActionButton } from "@/components/admin/ActionButton";
import { deleteDocument } from "@/lib/actions/admin/media";
import { listDocuments } from "@/lib/data/documents";
import { formatMillis } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Documents" };

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default async function AdminDocumentsPage() {
  await requireClubManagerPage("/admin/documents");
  const documents = await listDocuments(60);

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Documents"
        description="Private club files. Downloads are authorised per request and recorded in the audit log."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Panel title="Add a document">
            <DocumentForm />
          </Panel>
        </div>

        <div className="lg:col-span-2">
          {documents.length === 0 ? (
            <EmptyState
              title="No documents"
              description="Upload the club handbook, ride guidelines or meeting notes."
            />
          ) : (
            <ul className="space-y-px bg-ash">
              {documents.map((doc) => (
                <li key={doc.id} className="bg-ink p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base tracking-[0.06em] text-bone uppercase">
                          {doc.title}
                        </h2>
                        <Badge tone="muted">{doc.category}</Badge>
                        {doc.requiredRole !== "member" ? (
                          <Badge tone="gold">{ROLE_LABELS[doc.requiredRole]}+</Badge>
                        ) : null}
                      </div>
                      {doc.description ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-smoke">{doc.description}</p>
                      ) : null}
                      <p className="mt-2 font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                        {doc.fileName} · {formatBytes(doc.sizeBytes)} · Added{" "}
                        {formatMillis(doc.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a
                        href={`/api/documents/${doc.id}`}
                        className="inline-flex min-h-9 items-center border border-iron px-4 font-display text-[0.6875rem] tracking-[0.18em] text-mist uppercase transition hover:border-gold hover:text-gold"
                      >
                        Download
                      </a>
                      <ActionButton
                        action={deleteDocument.bind(null, doc.id)}
                        label="Delete"
                        variant="danger"
                        confirm={{
                          title: `Delete “${doc.title}”?`,
                          description: "The record and the stored file are removed permanently.",
                          confirmLabel: "Delete document",
                          destructive: true,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
