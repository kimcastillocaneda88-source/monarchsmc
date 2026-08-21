import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { SmartImage } from "@/components/ui/SmartImage";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { formatDistance, formatIsoDate, formatTime } from "@/lib/utils";
import type { Ride } from "@/types";

/**
 * The next public ride, loaded from Firestore. Nothing here is hard-coded — if
 * the club has not scheduled a ride the section shows a deliberate empty state
 * rather than a fabricated event.
 */
export function FeaturedRide({ ride }: { ride: Ride | null }) {
  return (
    <section className="border-t border-ash bg-charcoal py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <Eyebrow index="03">Next on the road</Eyebrow>
          <SectionHeading>The ride ahead</SectionHeading>
        </div>

        {ride ? (
          <div className="mt-14 grid gap-px bg-ash lg:grid-cols-12">
            <div className="bg-ink lg:col-span-7">
              <SmartImage
                src={ride.coverImageUrl}
                alt={ride.coverImageAlt ?? `${ride.title} — ride cover photograph`}
                ratio="wide"
                sizes="half"
                label="Ride cover photograph"
              />
            </div>

            <div className="flex flex-col justify-between bg-ink p-7 sm:p-9 lg:col-span-5 lg:p-11">
              <div>
                <p className="font-display text-[0.6875rem] tracking-[0.26em] text-gold uppercase">
                  {formatIsoDate(ride.date)} · {formatTime(ride.startTime)}
                </p>
                <h3 className="mt-5 font-display text-3xl leading-none tracking-[0.01em] text-bone uppercase sm:text-4xl">
                  {ride.title}
                </h3>

                <dl className="mt-8 space-y-4 border-t border-ash pt-8">
                  <RideFact label="Meeting point" value={ride.meetingPoint} />
                  <RideFact label="Destination" value={ride.destination} />
                  {formatDistance(ride.distanceKm) ? (
                    <RideFact label="Distance" value={formatDistance(ride.distanceKm) as string} />
                  ) : null}
                  {ride.roadCaptainName ? (
                    <RideFact label="Road captain" value={ride.roadCaptainName} />
                  ) : null}
                </dl>
              </div>

              <div className="mt-9">
                <ButtonLink href={`/rides/${ride.slug}`} withArrow>
                  Ride details
                </ButtonLink>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            className="mt-14"
            title="No ride scheduled yet"
            description="The next club run has not been published. Ride dates appear here as soon as a road captain schedules one."
            action={
              <ButtonLink href="/rides" variant="secondary" size="sm">
                View past rides
              </ButtonLink>
            }
          />
        )}
      </div>
    </section>
  );
}

function RideFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase">{label}</dt>
      <dd className="text-sm text-bone sm:text-right">{value}</dd>
    </div>
  );
}
