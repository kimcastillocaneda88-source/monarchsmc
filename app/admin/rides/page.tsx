import type { Metadata } from "next";
import Link from "next/link";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ActionButton } from "@/components/admin/ActionButton";
import { deleteRide } from "@/lib/actions/admin/content";
import { listAllRides } from "@/lib/data/rides";
import { formatIsoDate } from "@/lib/utils";
import type { Ride } from "@/types";

export const metadata: Metadata = { title: "Rides" };

export default async function AdminRidesPage() {
  await requireClubManagerPage("/admin/rides");
  const rides = await listAllRides(40);

  const columns: Array<Column<Ride>> = [
    {
      key: "title",
      header: "Ride",
      render: (ride) => (
        <Link
          href={`/admin/rides/${ride.id}`}
          className="font-display text-sm tracking-[0.04em] text-bone uppercase transition hover:text-gold"
        >
          {ride.title}
        </Link>
      ),
    },
    { key: "date", header: "Date", render: (ride) => formatIsoDate(ride.date) },
    {
      key: "status",
      header: "Status",
      render: (ride) => (
        <Badge
          tone={
            ride.status === "cancelled"
              ? "danger"
              : ride.status === "completed"
                ? "muted"
                : ride.status === "draft"
                  ? "warning"
                  : "gold"
          }
        >
          {ride.status}
        </Badge>
      ),
    },
    {
      key: "visibility",
      header: "Visibility",
      render: (ride) => (
        <Badge tone={ride.visibility === "public" ? "neutral" : "muted"}>{ride.visibility}</Badge>
      ),
    },
    {
      key: "published",
      header: "Published",
      render: (ride) =>
        ride.published ? <Badge tone="success">Live</Badge> : <Badge tone="muted">Draft</Badge>,
    },
  ];

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Rides"
        description="Club runs. Drafts and members-only rides never appear on the public site."
        action={
          <ButtonLink href="/admin/rides/new" size="sm">
            New ride
          </ButtonLink>
        }
      />

      <DataTable
        caption="All rides"
        columns={columns}
        rows={rides}
        rowKey={(ride) => ride.id}
        empty={
          <EmptyState
            title="No rides yet"
            description="Create the first ride and it will appear here and, once published, on the public rides page."
            action={
              <ButtonLink href="/admin/rides/new" size="sm">
                Create a ride
              </ButtonLink>
            }
          />
        }
        actions={(ride) => (
          <div className="flex flex-wrap justify-end gap-2">
            <ButtonLink href={`/admin/rides/${ride.id}`} variant="secondary" size="sm">
              Edit
            </ButtonLink>
            {ride.published && ride.visibility === "public" ? (
              <ButtonLink href={`/rides/${ride.slug}`} variant="ghost" size="sm">
                View
              </ButtonLink>
            ) : null}
            <ActionButton
              action={deleteRide.bind(null, ride.id)}
              label="Delete"
              variant="danger"
              confirm={{
                title: `Delete “${ride.title}”?`,
                description:
                  "The ride and every RSVP recorded against it are removed permanently. This cannot be undone.",
                confirmLabel: "Delete ride",
                destructive: true,
              }}
            />
          </div>
        )}
      />
    </>
  );
}
