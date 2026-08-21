import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { RideForm } from "@/components/admin/RideForm";
import { getRideById } from "@/lib/data/rides";
import { listRsvps, getRsvpTally } from "@/lib/data/rsvps";
import { listMembersForAdmin } from "@/lib/data/members";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit ride" };

export default async function EditRidePage({ params }: { params: Promise<{ id: string }> }) {
  await requireClubManagerPage("/admin/rides");
  const { id } = await params;

  const ride = await getRideById(id);
  if (!ride) notFound();

  const [members, rsvps, tally] = await Promise.all([
    listMembersForAdmin({ status: "active", limit: 40 }),
    listRsvps(ride.id, 100),
    getRsvpTally(ride.id),
  ]);

  const officers = members.map((row) => ({
    uid: row.user.uid,
    displayName: row.profile?.displayName ?? row.user.email,
  }));

  return (
    <>
      <PortalHeader eyebrow="Admin · Rides" title={ride.title} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel>
            <RideForm ride={ride} officers={officers} />
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="RSVPs">
            <div className="flex flex-wrap gap-3">
              <Badge tone="success">{tally.going} going</Badge>
              <Badge tone="warning">{tally.maybe} maybe</Badge>
              <Badge tone="muted">{tally.not_going} not going</Badge>
            </div>

            {rsvps.length === 0 ? (
              <EmptyState
                compact
                className="mt-6"
                title="No responses yet"
                description="Active members can RSVP from the public ride page."
              />
            ) : (
              <ul className="mt-6 divide-y divide-ash">
                {rsvps.map((rsvp) => (
                  <li key={rsvp.uid} className="flex items-baseline justify-between gap-4 py-3">
                    <span className="min-w-0 truncate text-sm text-mist">{rsvp.displayName}</span>
                    <span className="shrink-0 font-display text-[0.5625rem] tracking-[0.18em] text-smoke uppercase">
                      {rsvp.response.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Record">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-smoke">Created</dt>
                <dd className="text-right text-mist">{formatDateTime(ride.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-smoke">Updated</dt>
                <dd className="text-right text-mist">{formatDateTime(ride.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-smoke">Slug</dt>
                <dd className="text-right font-mono text-xs break-all text-mist">{ride.slug}</dd>
              </div>
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  );
}
