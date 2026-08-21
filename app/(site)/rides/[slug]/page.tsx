import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section } from "@/components/site/PageHero";
import { SmartImage } from "@/components/ui/SmartImage";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Typography";
import { ButtonLink } from "@/components/ui/Button";
import { renderMarkdown } from "@/lib/markdown";
import { RsvpControl } from "@/components/rides/RsvpControl";
import { getPublicRideBySlug } from "@/lib/data/rides";
import { getRsvp, getRsvpTally } from "@/lib/data/rsvps";
import { getSessionUser } from "@/lib/auth/session";
import { isActiveMember } from "@/lib/auth/roles";
import { formatDistance, formatIsoDate, formatTime, siteUrl, truncate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ride = await getPublicRideBySlug(slug);
  if (!ride) return { title: "Ride not found", robots: { index: false, follow: false } };

  const description = truncate(ride.description.replace(/\s+/g, " "), 160);
  const url = siteUrl(`/rides/${ride.slug}`);

  return {
    title: ride.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${ride.title} · MONARCHS MC`,
      description,
      url,
      ...(ride.coverImageUrl ? { images: [{ url: ride.coverImageUrl, alt: ride.coverImageAlt ?? ride.title }] } : {}),
    },
  };
}

export default async function RideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ride = await getPublicRideBySlug(slug);
  if (!ride) notFound();

  const user = await getSessionUser();
  const memberCanRsvp =
    user !== null && isActiveMember(user) && ride.status === "upcoming";

  const [existingRsvp, tally] = await Promise.all([
    memberCanRsvp && user ? getRsvp(ride.id, user.uid) : Promise.resolve(null),
    memberCanRsvp ? getRsvpTally(ride.id) : Promise.resolve(null),
  ]);

  const distance = formatDistance(ride.distanceKm);

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: ride.title,
    startDate: `${ride.date}T${ride.startTime || "00:00"}`,
    eventStatus:
      ride.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: ride.meetingPoint, address: ride.meetingPoint },
    description: truncate(ride.description.replace(/\s+/g, " "), 300),
    organizer: { "@type": "Organization", name: "MONARCHS MC", url: siteUrl("/") },
    ...(ride.coverImageUrl ? { image: [ride.coverImageUrl] } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd).replace(/</g, "\\u003c") }}
      />

      <article>
        {/* Masthead */}
        <header className="u-grain relative isolate overflow-hidden border-b border-ash">
          <div className="absolute inset-0 -z-10">
            <SmartImage
              src={ride.coverImageUrl}
              alt={ride.coverImageAlt ?? ""}
              ratio="hero"
              sizes="hero"
              priority
              label="Ride cover photograph"
              className="h-full w-full [&>*]:h-full"
            />
            <div aria-hidden="true" className="u-scrim absolute inset-0" />
          </div>

          <Container className="pt-20 pb-14 sm:pt-28 sm:pb-20">
            <nav aria-label="Breadcrumb" className="mb-8">
              <Link
                href="/rides"
                className="font-display text-[0.625rem] tracking-[0.24em] text-gold uppercase transition hover:text-goldbright"
              >
                ← All rides
              </Link>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              {ride.status === "cancelled" ? (
                <Badge tone="danger">Cancelled</Badge>
              ) : ride.status === "completed" ? (
                <Badge tone="muted">Completed</Badge>
              ) : (
                <Badge tone="gold">Upcoming</Badge>
              )}
              <Eyebrow>{formatIsoDate(ride.date)}</Eyebrow>
            </div>

            <h1 className="u-display-tight mt-6 max-w-4xl text-[clamp(2.25rem,8vw,5.5rem)] text-bone uppercase">
              {ride.title}
            </h1>
          </Container>
        </header>

        <Section>
          <Container>
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Facts rail */}
              <aside className="lg:col-span-4 lg:order-2">
                <div className="lg:sticky lg:top-28">
                  <dl className="divide-y divide-ash border-y border-ash">
                    <Fact label="Date" value={formatIsoDate(ride.date)} />
                    <Fact label="Kick stands up" value={formatTime(ride.startTime)} />
                    <Fact label="Meeting point" value={ride.meetingPoint} />
                    <Fact label="Destination" value={ride.destination} />
                    {distance ? <Fact label="Distance" value={distance} /> : null}
                    {ride.roadCaptainName ? (
                      <Fact label="Road captain" value={ride.roadCaptainName} />
                    ) : null}
                  </dl>

                  {memberCanRsvp && user ? (
                    <div className="mt-8">
                      <RsvpControl rideId={ride.id} initialResponse={existingRsvp?.response ?? null} />
                      {tally ? (
                        <p className="mt-4 font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                          {tally.going} going · {tally.maybe} maybe
                        </p>
                      ) : null}
                    </div>
                  ) : ride.status === "upcoming" ? (
                    <div className="mt-8 border border-ash bg-charcoal/60 p-6">
                      <h2 className="font-display text-sm tracking-[0.2em] text-bone uppercase">
                        Riding with us
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-smoke">
                        {user
                          ? "RSVP is available to active members. Your membership is not active yet."
                          : "Members can RSVP for this ride after signing in."}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        {user ? null : (
                          <ButtonLink href={`/login?next=/rides/${ride.slug}`} size="sm">
                            Member sign in
                          </ButtonLink>
                        )}
                        <ButtonLink href="/join" size="sm" variant="secondary">
                          Apply to join
                        </ButtonLink>
                      </div>
                    </div>
                  ) : null}
                </div>
              </aside>

              {/* Body */}
              <div className="lg:col-span-8 lg:order-1">
                <div className="max-w-2xl">{renderMarkdown(ride.description)}</div>

                {ride.routeInfo ? (
                  <section className="mt-14 border-t border-ash pt-10">
                    <Eyebrow>Route</Eyebrow>
                    <div className="mt-5 max-w-2xl">{renderMarkdown(ride.routeInfo)}</div>
                  </section>
                ) : null}

                {ride.requirements ? (
                  <section className="mt-14 border-t border-ash pt-10">
                    <Eyebrow>Requirements</Eyebrow>
                    <div className="mt-5 max-w-2xl">{renderMarkdown(ride.requirements)}</div>
                  </section>
                ) : null}
              </div>
            </div>
          </Container>
        </Section>
      </article>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase">{label}</dt>
      <dd className="text-sm text-bone sm:text-right">{value}</dd>
    </div>
  );
}
