import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Upload access" };

/**
 * Shown when an active member reaches the uploader without the grant.
 *
 * Deliberately not a 403: they are a member in good standing who is simply
 * missing one permission, and telling them how to get it is more useful than
 * refusing them flatly.
 */
export default async function NoUploadAccessPage() {
  await requireActiveMemberPage("/member/no-upload-access");

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title="Upload access"
        description="Uploading is granted account by account."
      />

      <Panel>
        <p className="text-sm leading-relaxed text-mist">
          Your account does not currently have permission to upload photographs, video or files. It
          is a separate permission from membership, granted by a club officer to individual accounts
          and withdrawn the same way.
        </p>
        <p className="mt-5 text-sm leading-relaxed text-mist">
          Ask an officer if you need it. Everything else in the member area is unaffected.
        </p>
        <Link
          href="/member/dashboard"
          className="u-underline-grow mt-8 inline-block font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
        >
          Back to the member area →
        </Link>
      </Panel>
    </>
  );
}
