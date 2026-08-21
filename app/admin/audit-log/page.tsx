import type { Metadata } from "next";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { listAuditLog } from "@/lib/data/audit-log";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogEntry } from "@/types";

export const metadata: Metadata = { title: "Audit log" };

/**
 * Audit trail.
 *
 * Entries are written only through the Admin SDK; Firestore rules deny every
 * client write to auditLogs, so a member cannot forge or erase history.
 */
export default async function AdminAuditLogPage() {
  await requireClubManagerPage("/admin/audit-log");
  const entries = await listAuditLog(48);

  const columns: Array<Column<AuditLogEntry>> = [
    {
      key: "timestamp",
      header: "When",
      render: (entry) => (
        <span className="whitespace-nowrap">{formatDateTime(entry.timestamp)}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (entry) => (
        <Badge tone={entry.action.startsWith("role") ? "danger" : "neutral"}>{entry.action}</Badge>
      ),
    },
    {
      key: "actor",
      header: "Who",
      render: (entry) => (
        <span className="break-all">
          {entry.actorEmail}{" "}
          <span className="font-display text-[0.5625rem] tracking-[0.18em] text-smoke uppercase">
            {entry.actorRole}
          </span>
        </span>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (entry) => (
        <span className="font-mono text-xs break-all">
          {entry.targetType}/{entry.targetId}
        </span>
      ),
    },
    {
      key: "metadata",
      header: "Detail",
      render: (entry) => {
        const pairs = Object.entries(entry.metadata);
        if (pairs.length === 0) return "—";
        return (
          <span className="font-mono text-xs break-all text-smoke">
            {pairs.map(([key, value]) => `${key}=${String(value)}`).join(" ")}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Audit log"
        description="Privileged actions: approvals, suspensions, role changes, publishing, deletions and document downloads."
      />

      <DataTable
        caption="Recent privileged actions"
        columns={columns}
        rows={entries}
        rowKey={(entry) => entry.id}
        empty={
          <EmptyState
            title="Nothing recorded yet"
            description="Privileged actions are written here as they happen. Ordinary browsing is not logged."
          />
        }
      />
    </>
  );
}
