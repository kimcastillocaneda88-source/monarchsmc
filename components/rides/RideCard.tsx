import { EditorialCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow, Meta } from "@/components/ui/Typography";
import { formatDistance, formatIsoDate, formatTime } from "@/lib/utils";
import type { Ride } from "@/types";

export function RideCard({ ride, priority }: { ride: Ride; priority?: boolean }) {
  const distance = formatDistance(ride.distanceKm);

  return (
    <EditorialCard
      className="h-full border-0"
      href={`/rides/${ride.slug}`}
      imageUrl={ride.coverImageUrl}
      imageAlt={ride.coverImageAlt ?? `${ride.title} — ride photograph`}
      imageLabel="Ride cover photograph"
      priority={priority}
      eyebrow={<Eyebrow>{formatIsoDate(ride.date)}</Eyebrow>}
      title={ride.title}
      meta={
        <div className="flex flex-wrap items-center gap-3">
          <Meta>
            {formatTime(ride.startTime)} · {ride.destination}
          </Meta>
          {distance ? <Badge tone="muted">{distance}</Badge> : null}
        </div>
      }
      description={ride.description}
      footer={
        ride.status === "cancelled" ? (
          <Badge tone="danger">Cancelled</Badge>
        ) : ride.status === "completed" ? (
          <Badge tone="muted">Completed</Badge>
        ) : (
          <Badge tone="gold">Upcoming</Badge>
        )
      }
    />
  );
}
