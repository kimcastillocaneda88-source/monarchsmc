import type { Metadata } from "next";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { RideForm } from "@/components/admin/RideForm";
import { listMembersForAdmin } from "@/lib/data/members";

export const metadata: Metadata = { title: "New ride" };

export default async function NewRidePage() {
  await requireClubManagerPage("/admin/rides/new");

  const members = await listMembersForAdmin({ status: "active", limit: 40 });
  const officers = members.map((row) => ({
    uid: row.user.uid,
    displayName: row.profile?.displayName ?? row.user.email,
  }));

  return (
    <>
      <PortalHeader eyebrow="Admin · Rides" title="New ride" />
      <Panel>
        <RideForm ride={null} officers={officers} />
      </Panel>
    </>
  );
}
