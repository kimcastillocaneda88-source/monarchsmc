import { EditorialCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow, Meta } from "@/components/ui/Typography";
import { formatIsoDate, formatTime } from "@/lib/utils";
import type { ClubEvent } from "@/types";

export function EventCard({ event, priority }: { event: ClubEvent; priority?: boolean }) {
  return (
    <EditorialCard
      className="h-full border-0"
      href={`/events/${event.slug}`}
      imageUrl={event.coverImageUrl}
      imageAlt={event.coverImageAlt ?? `${event.title} — event photograph`}
      imageLabel="Event cover photograph"
      priority={priority}
      eyebrow={<Eyebrow>{formatIsoDate(event.date)}</Eyebrow>}
      title={event.title}
      meta={
        <Meta>
          {formatTime(event.startTime)}
          {event.endTime ? ` – ${formatTime(event.endTime)}` : ""} · {event.location}
        </Meta>
      }
      description={event.description}
      footer={
        event.status === "cancelled" ? (
          <Badge tone="danger">Cancelled</Badge>
        ) : event.status === "archived" ? (
          <Badge tone="muted">Archived</Badge>
        ) : (
          <Badge tone="gold">{event.organizer ?? "Club event"}</Badge>
        )
      }
    />
  );
}
