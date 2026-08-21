import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel, StatTile } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { listMemberRides } from "@/lib/data/rides";
import { listMemberEvents } from "@/lib/data/events";
import { listPublishedAnnouncements } from "@/lib/data/announcements";
import { getMemberProfile } from "@/lib/data/members";
import { formatIsoDate, formatMillis, formatTime, truncate } from "@/lib/utils";
import { MEMBERSHIP_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Dashboard" };

/** Fields that make a profile feel complete. Used only to nudge, never to gate. */
const PROFILE_FIELDS = ["displayName", "motorcycle", "bio", "ridingSince"] as const;

export default async function MemberDashboardPage() {
  const user = await requireActiveMemberPage("/member/dashboard");

  const [rides, events, announcements, profile] = await Promise.all([
    listMemberRides({ upcomingOnly: true, limit: 3 }),
    listMemberEvents({ upcomingOnly: true, limit: 3 }),
    listPublishedAnnouncements(3),
    getMemberProfile(user.uid),
  ]);

  const filled = profile
    ? PROFILE_FIELDS.filter((field) => {
        const value = profile[field];
        return value !== null && value !== undefined && String(value).trim().length > 0;
      }).length
    : 0;
  const completion = Math.round((filled / PROFILE_FIELDS.length) * 100);

  const nextRide = rides[0];
  const firstName = (profile?.displayName ?? user.displayName ?? "").split(" ")[0];

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description="Your rides, your events and everything the club has posted for members."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Membership"
          value={MEMBERSHIP_LABELS[user.membershipStatus]}
          tone="gold"
          hint="Set by club officers"
        />
        <StatTile label="Upcoming rides" value={rides.length} href="/member/rides" />
        <StatTile label="Upcoming events" value={events.length} href="/member/events" />
        <StatTile
          label="Profile complete"
          value={`${completion}%`}
          href="/member/profile"
          tone={completion < 100 ? "warning" : "neutral"}
          hint={completion < 100 ? "Add the missing details" : "Nothing missing"}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Panel
          title="Next ride"
          action={
            <Link
              href="/member/rides"
              className="font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
            >
              All rides →
            </Link>
          }
        >
          {nextRide ? (
            <div>
              <p className="u-eyebrow">
                {formatIsoDate(nextRide.date)} · {formatTime(nextRide.startTime)}
              </p>
              <h3 className="mt-4 font-display text-2xl tracking-[0.02em] text-bone uppercase">
                <Link href={`/rides/${nextRide.slug}`} className="transition hover:text-gold">
                  {nextRide.title}
                </Link>
              </h3>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-smoke">Meet</dt>
                  <dd className="text-right text-mist">{nextRide.meetingPoint}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-smoke">Destination</dt>
                  <dd className="text-right text-mist">{nextRide.destination}</dd>
                </div>
              </dl>
              <div className="mt-6">
                <ButtonLink href={`/rides/${nextRide.slug}`} size="sm" withArrow>
                  RSVP
                </ButtonLink>
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              title="No upcoming rides"
              description="When a road captain schedules the next run it appears here."
            />
          )}
        </Panel>

        <Panel
          title="Announcements"
          action={
            <Link
              href="/member/announcements"
              className="font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
            >
              All →
            </Link>
          }
        >
          {announcements.length === 0 ? (
            <EmptyState compact title="Nothing posted" description="Club announcements appear here." />
          ) : (
            <ul className="space-y-4">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="border-b border-ash pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-3">
                    {announcement.priority !== "normal" ? (
                      <Badge tone={announcement.priority === "urgent" ? "danger" : "warning"}>
                        {announcement.priority}
                      </Badge>
                    ) : null}
                    <span className="font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                      {formatMillis(announcement.createdAt)}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-base tracking-[0.06em] text-bone uppercase">
                    {announcement.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-smoke">
                    {truncate(announcement.body.replace(/\s+/g, " "), 140)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Upcoming events"
          action={
            <Link
              href="/member/events"
              className="font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
            >
              All →
            </Link>
          }
        >
          {events.length === 0 ? (
            <EmptyState compact title="Nothing scheduled" description="Club events appear here." />
          ) : (
            <ul className="space-y-4">
              {events.map((event) => (
                <li key={event.id} className="border-b border-ash pb-4 last:border-0 last:pb-0">
                  <p className="u-eyebrow">{formatIsoDate(event.date)}</p>
                  <h3 className="mt-2 font-display text-base tracking-[0.06em] text-bone uppercase">
                    <Link href={`/events/${event.slug}`} className="transition hover:text-gold">
                      {event.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-smoke">{event.location}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Quick links">
          <ul className="grid gap-px bg-ash sm:grid-cols-2">
            {[
              { href: "/member/directory", label: "Member directory" },
              { href: "/member/documents", label: "Club documents" },
              { href: "/member/profile", label: "Edit your profile" },
              { href: "/member/settings", label: "Account settings" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-13 items-center bg-ink px-4 font-display text-[0.6875rem] tracking-[0.18em] text-mist uppercase transition hover:text-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
