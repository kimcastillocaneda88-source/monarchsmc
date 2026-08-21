import type { Metadata } from "next";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import { ActionButton } from "@/components/admin/ActionButton";
import { deleteAnnouncement } from "@/lib/actions/admin/content";
import { listAllAnnouncements } from "@/lib/data/announcements";
import { formatDateTime, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireClubManagerPage("/admin/announcements");
  const announcements = await listAllAnnouncements(30);

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Announcements"
        description="Notices for active members. These never appear on the public site."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Panel title="Post an announcement">
            <AnnouncementForm announcement={null} />
          </Panel>
        </div>

        <div className="lg:col-span-2">
          {announcements.length === 0 ? (
            <EmptyState
              title="No announcements"
              description="Post one and it will appear in the member area."
            />
          ) : (
            <ul className="space-y-px bg-ash">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="bg-ink p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {announcement.published ? (
                      <Badge tone="success">Published</Badge>
                    ) : (
                      <Badge tone="warning">Draft</Badge>
                    )}
                    <Badge
                      tone={
                        announcement.priority === "urgent"
                          ? "danger"
                          : announcement.priority === "important"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {announcement.priority}
                    </Badge>
                    <span className="font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                      {formatDateTime(announcement.createdAt)} · {announcement.authorName}
                    </span>
                  </div>

                  <h2 className="mt-3 font-display text-lg tracking-[0.04em] text-bone uppercase">
                    {announcement.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-smoke">
                    {truncate(announcement.body.replace(/\s+/g, " "), 220)}
                  </p>

                  <details className="group mt-4">
                    <summary className="inline-flex cursor-pointer font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase">
                      Edit
                    </summary>
                    <div className="mt-5 border-t border-ash pt-5">
                      <AnnouncementForm announcement={announcement} />
                    </div>
                  </details>

                  <div className="mt-4">
                    <ActionButton
                      action={deleteAnnouncement.bind(null, announcement.id)}
                      label="Delete"
                      variant="danger"
                      confirm={{
                        title: `Delete “${announcement.title}”?`,
                        description: "The announcement is removed permanently.",
                        confirmLabel: "Delete",
                        destructive: true,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
