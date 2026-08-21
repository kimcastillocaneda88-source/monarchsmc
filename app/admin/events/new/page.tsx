import type { Metadata } from "next";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { EventForm } from "@/components/admin/EventForm";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireClubManagerPage("/admin/events/new");
  return (
    <>
      <PortalHeader eyebrow="Admin · Events" title="New event" />
      <Panel>
        <EventForm event={null} />
      </Panel>
    </>
  );
}
