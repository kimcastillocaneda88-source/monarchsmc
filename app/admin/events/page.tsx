import type { Metadata } from "next";
import Link from "next/link";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ActionButton } from "@/components/admin/ActionButton";
import { deleteEvent } from "@/lib/actions/admin/content";
import { listAllEvents } from "@/lib/data/events";
import { formatIsoDate } from "@/lib/utils";
import type { ClubEvent } from "@/types";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage() {
  await requireClubManagerPage("/admin/events");
  const events = await listAllEvents(40);

  const columns: Array<Column<ClubEvent>> = [
    {
      key: "title",
      header: "Event",
      render: (event) => (
        <Link
          href={`/admin/events/${event.id}`}
          className="font-display text-sm tracking-[0.04em] text-bone uppercase transition hover:text-gold"
        >
          {event.title}
        </Link>
      ),
    },
    { key: "date", header: "Date", render: (event) => formatIsoDate(event.date) },
    { key: "location", header: "Location", render: (event) => event.location },
    {
      key: "status",
      header: "Status",
      render: (event) => (
        <Badge
          tone={
            event.status === "cancelled"
              ? "danger"
              : event.status === "published"
                ? "success"
                : event.status === "archived"
                  ? "muted"
                  : "warning"
          }
        >
          {event.status}
        </Badge>
      ),
    },
    {
      key: "visibility",
      header: "Visibility",
      render: (event) => <Badge tone="neutral">{event.visibility}</Badge>,
    },
  ];

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Events"
        description="Anniversaries, charity runs, community days and meets."
        action={
          <ButtonLink href="/admin/events/new" size="sm">
            New event
          </ButtonLink>
        }
      />

      <DataTable
        caption="All events"
        columns={columns}
        rows={events}
        rowKey={(event) => event.id}
        empty={
          <EmptyState
            title="No events yet"
            description="Create an event and publish it to make it visible."
            action={
              <ButtonLink href="/admin/events/new" size="sm">
                Create an event
              </ButtonLink>
            }
          />
        }
        actions={(event) => (
          <div className="flex flex-wrap justify-end gap-2">
            <ButtonLink href={`/admin/events/${event.id}`} variant="secondary" size="sm">
              Edit
            </ButtonLink>
            {event.status === "published" && event.visibility === "public" ? (
              <ButtonLink href={`/events/${event.slug}`} variant="ghost" size="sm">
                View
              </ButtonLink>
            ) : null}
            <ActionButton
              action={deleteEvent.bind(null, event.id)}
              label="Delete"
              variant="danger"
              confirm={{
                title: `Delete “${event.title}”?`,
                description: "The event is removed permanently. This cannot be undone.",
                confirmLabel: "Delete event",
                destructive: true,
              }}
            />
          </div>
        )}
      />
    </>
  );
}
