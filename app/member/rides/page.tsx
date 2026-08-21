import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { SmartImage } from "@/components/ui/SmartImage";
import { listMemberRides } from "@/lib/data/rides";
import { getRsvp } from "@/lib/data/rsvps";
import { formatDistance, formatIsoDate, formatTime, isUpcoming } from "@/lib/utils";
import type { RsvpResponse } from "@/types";

export const metadata: Metadata = { title: "Rides" };

const RSVP_LABELS: Record<RsvpResponse, string> = {
  going: "Going",
  maybe: "Maybe",
  not_going: "Not going",
};

export default async function MemberRidesPage() {
  const user = await requireActiveMemberPage("/member/rides");

  // Members see member-visibility rides as well as public ones.
  const rides = await listMemberRides({ limit: 20 });
  const upcoming = rides.filter((ride) => isUpcoming(ride.date) && ride.status !== "completed");
  const past = rides.filter((ride) => !upcoming.includes(ride));

  const responses = new Map<string, RsvpResponse>();
  for (const ride of upcoming) {
    const rsvp = await getRsvp(ride.id, user.uid);
    if (rsvp) responses.set(ride.id, rsvp.response);
  }

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title="Rides"
        description="Every published run, including member-only rides that do not appear on the public site."
      />

      <section>
        <h2 className="u-eyebrow">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            className="mt-6"
            compact
            title="No upcoming rides"
            description="Scheduled runs appear here as soon as a road captain publishes them."
          />
        ) : (
          <ul className="mt-6 space-y-px bg-ash">
            {upcoming.map((ride) => (
              <li key={ride.id} className="bg-ink">
                <Link
                  href={`/rides/${ride.slug}`}
                  className="group flex flex-col gap-4 p-4 transition-colors hover:bg-charcoal sm:flex-row sm:items-center sm:gap-6"
                >
                  <SmartImage
                    src={ride.coverImageUrl}
                    alt=""
                    ratio="wide"
                    sizes="thumb"
                    className="w-full shrink-0 sm:w-40"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="u-eyebrow">
                      {formatIsoDate(ride.date)} · {formatTime(ride.startTime)}
                    </p>
                    <h3 className="mt-2 font-display text-xl tracking-[0.02em] text-bone uppercase transition-colors group-hover:text-gold">
                      {ride.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-smoke">
                      {ride.meetingPoint} → {ride.destination}
                      {formatDistance(ride.distanceKm) ? ` · ${formatDistance(ride.distanceKm)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {ride.visibility === "members" ? <Badge tone="neutral">Members only</Badge> : null}
                    {responses.has(ride.id) ? (
                      <Badge tone="gold">{RSVP_LABELS[responses.get(ride.id) as RsvpResponse]}</Badge>
                    ) : (
                      <Badge tone="muted">No response</Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="u-eyebrow">Past rides</h2>
        {past.length === 0 ? (
          <EmptyState className="mt-6" compact title="Nothing in the archive yet" />
        ) : (
          <ul className="mt-6 divide-y divide-ash border-y border-ash">
            {past.map((ride) => (
              <li key={ride.id}>
                <Link
                  href={`/rides/${ride.slug}`}
                  className="flex flex-wrap items-baseline justify-between gap-3 py-4 transition-colors hover:text-gold"
                >
                  <span className="font-display text-base tracking-[0.04em] text-bone uppercase">
                    {ride.title}
                  </span>
                  <span className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                    {formatIsoDate(ride.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
