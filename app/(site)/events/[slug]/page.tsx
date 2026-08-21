import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section } from "@/components/site/PageHero";
import { SmartImage } from "@/components/ui/SmartImage";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Typography";
import { ButtonLink } from "@/components/ui/Button";
import { renderMarkdown } from "@/lib/markdown";
import { getPublicEventBySlug, listPublicEventSlugs } from "@/lib/data/events";
import { formatIsoDate, formatTime, siteUrl, truncate } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listPublicEventSlugs(50);
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return { title: "Event not found", robots: { index: false, follow: false } };

  const description = truncate(event.description.replace(/\s+/g, " "), 160);
  const url = siteUrl(`/events/${event.slug}`);

  return {
    title: event.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${event.title} · MONARCHS MC`,
      description,
      url,
      ...(event.coverImageUrl
        ? { images: [{ url: event.coverImageUrl, alt: event.coverImageAlt ?? event.title }] }
        : {}),
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: `${event.date}T${event.startTime || "00:00"}`,
    ...(event.endTime ? { endDate: `${event.date}T${event.endTime}` } : {}),
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.location, address: event.location },
    description: truncate(event.description.replace(/\s+/g, " "), 300),
    organizer: { "@type": "Organization", name: event.organizer ?? "MONARCHS MC", url: siteUrl("/") },
    ...(event.coverImageUrl ? { image: [event.coverImageUrl] } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd).replace(/</g, "\\u003c") }}
      />

      <article>
        <header className="u-grain relative isolate overflow-hidden border-b border-ash">
          <div className="absolute inset-0 -z-10">
            <SmartImage
              src={event.coverImageUrl}
              alt={event.coverImageAlt ?? ""}
              ratio="hero"
              sizes="hero"
              priority
              label="Event cover photograph"
              className="h-full w-full [&>*]:h-full"
            />
            <div aria-hidden="true" className="u-scrim absolute inset-0" />
          </div>

          <Container className="pt-20 pb-14 sm:pt-28 sm:pb-20">
            <nav aria-label="Breadcrumb" className="mb-8">
              <Link
                href="/events"
                className="font-display text-[0.625rem] tracking-[0.24em] text-gold uppercase transition hover:text-goldbright"
              >
                ← All events
              </Link>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              {event.status === "cancelled" ? (
                <Badge tone="danger">Cancelled</Badge>
              ) : (
                <Badge tone="gold">Event</Badge>
              )}
              <Eyebrow>{formatIsoDate(event.date)}</Eyebrow>
            </div>

            <h1 className="u-display-tight mt-6 max-w-4xl text-[clamp(2.25rem,8vw,5.5rem)] text-bone uppercase">
              {event.title}
            </h1>
          </Container>
        </header>

        <Section>
          <Container>
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              <aside className="lg:order-2 lg:col-span-4">
                <div className="lg:sticky lg:top-28">
                  <dl className="divide-y divide-ash border-y border-ash">
                    <Fact label="Date" value={formatIsoDate(event.date)} />
                    <Fact
                      label="Time"
                      value={`${formatTime(event.startTime)}${event.endTime ? ` – ${formatTime(event.endTime)}` : ""}`}
                    />
                    <Fact label="Location" value={event.location} />
                    {event.organizer ? <Fact label="Organiser" value={event.organizer} /> : null}
                  </dl>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <ButtonLink href="/contact" size="sm" variant="secondary">
                      Ask about this event
                    </ButtonLink>
                  </div>
                </div>
              </aside>

              <div className="lg:order-1 lg:col-span-8">
                <div className="max-w-2xl">{renderMarkdown(event.description)}</div>
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
