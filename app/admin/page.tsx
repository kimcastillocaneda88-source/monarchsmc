import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminAreaPage } from "@/lib/auth/guards";
import { canManageClub, type Principal } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel, StatTile } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { getAdminDashboardStats } from "@/lib/data/dashboard";
import { listApplications } from "@/lib/data/applications";
import { listAllGallery } from "@/lib/data/gallery";
import { formatMillis, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

/**
 * Every figure below is a live Firestore aggregation. There are no placeholder
 * statistics: on an empty database every tile reads zero and the panels show
 * their empty states.
 */
export default async function AdminOverviewPage() {
  const user = await requireAdminAreaPage("/admin");
  const clubManager = canManageClub(user as Principal);

  const [stats, applications, pendingGallery] = await Promise.all([
    getAdminDashboardStats(),
    clubManager ? listApplications({ status: "new", limit: 5 }) : Promise.resolve([]),
    listAllGallery({ approved: false, limit: 6 }),
  ]);

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Overview"
        description="Live counts straight from the database. Nothing here is estimated."
      />

      <section aria-labelledby="club-stats">
        <h2 id="club-stats" className="u-eyebrow">
          Club
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {clubManager ? (
            <>
              <StatTile label="Active members" value={stats.activeMembers} href="/admin/members" />
              <StatTile
                label="Pending members"
                value={stats.pendingMembers}
                href="/admin/members?status=pending"
                tone={stats.pendingMembers > 0 ? "warning" : "neutral"}
              />
              <StatTile
                label="New applications"
                value={stats.newApplications}
                href="/admin/applications?status=new"
                tone={stats.newApplications > 0 ? "gold" : "neutral"}
              />
              <StatTile
                label="Unread messages"
                value={stats.unreadMessages}
                href="/admin/messages?status=unread"
                tone={stats.unreadMessages > 0 ? "warning" : "neutral"}
              />
            </>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="content-stats" className="mt-10">
        <h2 id="content-stats" className="u-eyebrow">
          Content
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {clubManager ? (
            <>
              <StatTile label="Upcoming rides" value={stats.upcomingRides} href="/admin/rides" />
              <StatTile label="Upcoming events" value={stats.upcomingEvents} href="/admin/events" />
            </>
          ) : null}
          <StatTile
            label="Unpublished articles"
            value={stats.unpublishedArticles}
            href="/admin/news"
          />
          <StatTile
            label="Photos awaiting approval"
            value={stats.pendingGallery}
            href="/admin/gallery"
            tone={stats.pendingGallery > 0 ? "warning" : "neutral"}
          />
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {clubManager ? (
          <Panel
            title="Newest applications"
            action={
              <Link
                href="/admin/applications"
                className="font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
              >
                All →
              </Link>
            }
          >
            {applications.length === 0 ? (
              <EmptyState compact title="No new applications" />
            ) : (
              <ul className="space-y-4">
                {applications.map((application) => (
                  <li key={application.id} className="border-b border-ash pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link
                        href={`/admin/applications?open=${application.id}`}
                        className="font-display text-base tracking-[0.06em] text-bone uppercase transition hover:text-gold"
                      >
                        {application.fullName}
                      </Link>
                      <span className="font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                        {formatMillis(application.submittedAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-smoke">
                      {application.motorcycle} · {application.location}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-smoke">
                      {truncate(application.whyJoin.replace(/\s+/g, " "), 110)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        <Panel
          title="Photos awaiting approval"
          action={
            <Link
              href="/admin/gallery"
              className="font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
            >
              Gallery →
            </Link>
          }
        >
          {pendingGallery.length === 0 ? (
            <EmptyState compact title="Nothing waiting" />
          ) : (
            <ul className="grid grid-cols-3 gap-px bg-ash">
              {pendingGallery.map((item) => (
                <li key={item.id} className="bg-ink">
                  {/* Admin thumbnail of an already-public object. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.altText}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {!clubManager ? (
          <Panel title="Your access">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="gold">Editor</Badge>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-smoke">
              As an editor you can manage news and the gallery. Members, applications, rides, events,
              announcements, documents, messages and settings are restricted to administrators.
            </p>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
