import type { Metadata } from "next";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { listPublishedAnnouncements } from "@/lib/data/announcements";
import { renderMarkdown } from "@/lib/markdown";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Announcements" };

export default async function MemberAnnouncementsPage() {
  // Announcements are member-only content; the guard runs before any read.
  await requireActiveMemberPage("/member/announcements");
  const announcements = await listPublishedAnnouncements(20);

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title="Announcements"
        description="Notices from club officers. These are not published on the public site."
      />

      {announcements.length === 0 ? (
        <EmptyState
          title="Nothing posted yet"
          description="Club announcements will appear here as officers publish them."
        />
      ) : (
        <ul className="space-y-px bg-ash">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="bg-ink p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-3">
                {announcement.priority === "urgent" ? (
                  <Badge tone="danger">Urgent</Badge>
                ) : announcement.priority === "important" ? (
                  <Badge tone="warning">Important</Badge>
                ) : (
                  <Badge tone="muted">Notice</Badge>
                )}
                <span className="font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                  {formatDateTime(announcement.createdAt)} · {announcement.authorName}
                </span>
              </div>

              <h2 className="mt-4 font-display text-2xl tracking-[0.02em] text-bone uppercase">
                {announcement.title}
              </h2>
              <div className="mt-4">{renderMarkdown(announcement.body)}</div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
