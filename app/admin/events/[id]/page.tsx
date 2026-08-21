import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { EventForm } from "@/components/admin/EventForm";
import { getEventById } from "@/lib/data/events";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireClubManagerPage("/admin/events");
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <>
      <PortalHeader eyebrow="Admin · Events" title={event.title} />
      <Panel>
        <EventForm event={event} />
      </Panel>
    </>
  );
}
