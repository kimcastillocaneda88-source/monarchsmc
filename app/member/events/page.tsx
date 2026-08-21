import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { SmartImage } from "@/components/ui/SmartImage";
import { listMemberEvents } from "@/lib/data/events";
import { formatIsoDate, formatTime, isUpcoming } from "@/lib/utils";

export const metadata: Metadata = { title: "Events" };

export default async function MemberEventsPage() {
  await requireActiveMemberPage("/member/events");
  const events = await listMemberEvents({ limit: 20 });
  const upcoming = events.filter((event) => isUpcoming(event.date));
  const past = events.filter((event) => !isUpcoming(event.date));

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title="Events"
        description="Club events, including any restricted to members."
      />

      <section>
        <h2 className="u-eyebrow">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState className="mt-6" compact title="Nothing scheduled" />
        ) : (
          <ul className="mt-6 space-y-px bg-ash">
            {upcoming.map((event) => (
              <li key={event.id} className="bg-ink">
                <Link
                  href={`/events/${event.slug}`}
                  className="group flex flex-col gap-4 p-4 transition-colors hover:bg-charcoal sm:flex-row sm:items-center sm:gap-6"
                >
                  <SmartImage
                    src={event.coverImageUrl}
                    alt=""
                    ratio="wide"
                    sizes="thumb"
                    className="w-full shrink-0 sm:w-40"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="u-eyebrow">
                      {formatIsoDate(event.date)} · {formatTime(event.startTime)}
                    </p>
                    <h3 className="mt-2 font-display text-xl tracking-[0.02em] text-bone uppercase transition-colors group-hover:text-gold">
                      {event.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-smoke">{event.location}</p>
                  </div>
                  {event.visibility === "members" ? (
                    <Badge tone="neutral">Members only</Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="u-eyebrow">Past events</h2>
        {past.length === 0 ? (
          <EmptyState className="mt-6" compact title="Nothing in the archive yet" />
        ) : (
          <ul className="mt-6 divide-y divide-ash border-y border-ash">
            {past.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.slug}`}
                  className="flex flex-wrap items-baseline justify-between gap-3 py-4 transition-colors hover:text-gold"
                >
                  <span className="font-display text-base tracking-[0.04em] text-bone uppercase">
                    {event.title}
                  </span>
                  <span className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                    {formatIsoDate(event.date)}
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
