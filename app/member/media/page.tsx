import type { Metadata } from "next";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { canAccessAdminArea, canUploadMedia, type Principal } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { ButtonLink } from "@/components/ui/Button";
import { MediaList } from "@/components/media/MediaList";
import { listApprovedMedia } from "@/lib/data/media";

export const metadata: Metadata = { title: "Media library" };

/**
 * The club's media library, as members see it.
 *
 * Approved items only. Anything still awaiting review is visible to its
 * uploader on /member/uploads and to officers on /admin/media, but not here.
 */
export default async function MemberMediaPage() {
  const user = await requireActiveMemberPage("/member/media");
  const items = await listApprovedMedia(48);

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title="Media library"
        description="Photographs, video and files shared by the club. Faces are blurred automatically when they are uploaded."
        action={
          canUploadMedia(user as Principal) ? (
            <ButtonLink href="/member/uploads" size="sm" withArrow>
              Upload
            </ButtonLink>
          ) : undefined
        }
      />

      <MediaList
        items={items}
        canModerate={canAccessAdminArea(user as Principal)}
        viewerUid={user.uid}
        emptyMessage="Nothing has been published to the library yet."
      />
    </>
  );
}
