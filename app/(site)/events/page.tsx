import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { EmptyState } from "@/components/ui/States";
import { Reveal } from "@/components/site/Reveal";
import { EventCard } from "@/components/events/EventCard";
import { CursorPagination } from "@/components/ui/Pagination";
import { ButtonLink } from "@/components/ui/Button";
import { listPublicEvents } from "@/lib/data/events";
import { isUpcoming, siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Events",
  description:
    "MONARCHS MC events — charity runs, community activities, meetups and motorcycle events open to riders and supporters.",
  alternates: { canonical: siteUrl("/events") },
  openGraph: { title: "Events · MONARCHS MC", url: siteUrl("/events") },
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;

  const [upcoming, archive] = await Promise.all([
    cursor
      ? Promise.resolve({ items: [], nextCursor: null })
      : listPublicEvents({ upcomingOnly: true, limit: 6 }),
    listPublicEvents({ limit: 12, cursor: cursor ?? null }),
  ]);

  const past = archive.items.filter((event) => !isUpcoming(event.date));

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="More than the ride"
        lede="Charity runs, community days, anniversaries and meets. Where the club gathers, and who is welcome to join us."
      />

      {!cursor ? (
        <Section>
          <Container>
            <Eyebrow index="01">Upcoming</Eyebrow>
            <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">What is coming up</SectionHeading>

            {upcoming.items.length === 0 ? (
              <EmptyState
                className="mt-12"
                title="No events published"
                description="Club events appear here once they are scheduled and published by an administrator."
                action={
                  <ButtonLink href="/contact" variant="secondary" size="sm">
                    Ask about our events
                  </ButtonLink>
                }
              />
            ) : (
              <div className="mt-12 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.items.map((event, i) => (
                  <Reveal key={event.id} delay={i * 70} className="bg-ink">
                    <EventCard event={event} priority={i === 0} />
                  </Reveal>
                ))}
              </div>
            )}
          </Container>
        </Section>
      ) : null}

      <Section tone="charcoal">
        <Container>
          <Eyebrow index="02">Past events</Eyebrow>
          <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">Where we have been</SectionHeading>

          {past.length === 0 ? (
            <EmptyState
              className="mt-12"
              title="Nothing in the archive yet"
              description="Past events are kept here as a record of the club's calendar."
            />
          ) : (
            <div className="mt-12 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
              {past.map((event, i) => (
                <Reveal key={event.id} delay={i * 60} className="bg-ink">
                  <EventCard event={event} />
                </Reveal>
              ))}
            </div>
          )}

          <CursorPagination className="mt-12" basePath="/events" nextCursor={archive.nextCursor} />
        </Container>
      </Section>
    </>
  );
}
