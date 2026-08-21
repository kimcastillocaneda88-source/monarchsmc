import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { EmptyState } from "@/components/ui/States";
import { Reveal } from "@/components/site/Reveal";
import { RideCard } from "@/components/rides/RideCard";
import { ButtonLink } from "@/components/ui/Button";
import { CursorPagination } from "@/components/ui/Pagination";
import { listPublicRides } from "@/lib/data/rides";
import { isUpcoming, siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Rides",
  description:
    "Club runs and open rides from MONARCHS MC — dates, meeting points, destinations and distances.",
  alternates: { canonical: siteUrl("/rides") },
  openGraph: { title: "Rides · MONARCHS MC", url: siteUrl("/rides") },
};

export default async function RidesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;

  // Two bounded queries rather than one unbounded read of the collection.
  const [upcoming, archive] = await Promise.all([
    cursor ? Promise.resolve({ items: [], nextCursor: null }) : listPublicRides({ upcomingOnly: true, limit: 6 }),
    listPublicRides({ limit: 12, cursor: cursor ?? null }),
  ]);

  const past = archive.items.filter((ride) => !isUpcoming(ride.date));

  return (
    <>
      <PageHero
        eyebrow="Rides"
        title="Where we are headed"
        lede="Every run is planned, briefed and led. Dates, meeting points and destinations are published here — riding with us starts with turning up."
      />

      {!cursor ? (
        <Section>
          <Container>
            <Eyebrow index="01">Upcoming</Eyebrow>
            <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">Next on the road</SectionHeading>

            {upcoming.items.length === 0 ? (
              <EmptyState
                className="mt-12"
                title="No upcoming rides published"
                description="When a road captain schedules the next run it will appear here with the meeting point, destination and distance."
                action={
                  <ButtonLink href="/join" variant="secondary" size="sm">
                    Apply to ride with us
                  </ButtonLink>
                }
              />
            ) : (
              <div className="mt-12 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.items.map((ride, i) => (
                  <Reveal key={ride.id} delay={i * 70} className="bg-ink">
                    <RideCard ride={ride} priority={i === 0} />
                  </Reveal>
                ))}
              </div>
            )}
          </Container>
        </Section>
      ) : null}

      <Section tone="charcoal">
        <Container>
          <Eyebrow index="02">Archive</Eyebrow>
          <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">Rides behind us</SectionHeading>

          {past.length === 0 ? (
            <EmptyState
              className="mt-12"
              title="No rides in the archive yet"
              description="Completed rides are kept here as a record of where the club has been."
            />
          ) : (
            <div className="mt-12 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
              {past.map((ride, i) => (
                <Reveal key={ride.id} delay={i * 60} className="bg-ink">
                  <RideCard ride={ride} />
                </Reveal>
              ))}
            </div>
          )}

          <CursorPagination className="mt-12" basePath="/rides" nextCursor={archive.nextCursor} />
        </Container>
      </Section>
    </>
  );
}
