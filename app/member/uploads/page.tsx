import type { Metadata } from "next";
import { requireUploaderPage } from "@/lib/auth/guards";
import { canAccessAdminArea, type Principal } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { MediaUploader } from "@/components/media/MediaUploader";
import { MediaList } from "@/components/media/MediaList";
import { listMediaByUploader } from "@/lib/data/media";

export const metadata: Metadata = { title: "Upload" };

/**
 * Contribute photographs, video and files.
 *
 * Reachable only by an account an administrator has granted upload access to —
 * enforced by the page guard here, and independently by every route the form
 * calls, so opening the page is never what authorises the upload.
 */
export default async function MemberUploadsPage() {
  const user = await requireUploaderPage("/member/uploads");
  const mine = await listMediaByUploader(user.uid, 24);

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title="Upload"
        description="Add photographs, video and files to the club's media library. Faces are blurred automatically before anything leaves your device."
      />

      <Panel className="mb-10">
        <MediaUploader />
      </Panel>

      <h2 className="u-eyebrow mb-5">Your uploads</h2>
      <MediaList
        items={mine}
        canModerate={canAccessAdminArea(user as Principal)}
        viewerUid={user.uid}
        emptyMessage="You have not uploaded anything yet."
      />
    </>
  );
}
