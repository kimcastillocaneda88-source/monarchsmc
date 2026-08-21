import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isActiveMember, MEMBERSHIP_LABELS } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Membership status" };

/**
 * Landing page for accounts that exist but are not active members.
 * Nothing member-only is reachable from here.
 */
export default async function PendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isActiveMember(user)) redirect("/member/dashboard");

  const copy: Record<string, { title: string; body: string }> = {
    pending: {
      title: "Your membership is not active yet",
      body: "Your account exists, but a club officer has not activated your membership. Until they do, the member area stays closed. If you are expecting activation, speak to the officer handling your application.",
    },
    suspended: {
      title: "Your membership is suspended",
      body: "Access to the member area has been suspended. Speak to a club officer if you believe this is a mistake.",
    },
    inactive: {
      title: "Your membership is inactive",
      body: "This account is no longer an active membership. Contact a club officer if you would like it reinstated.",
    },
  };

  const message = copy[user.membershipStatus] ?? copy.pending;

  return (
    <>
      <PortalHeader
        eyebrow="Membership"
        title="Status"
        description="Being signed in is not the same as being an active member."
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="warning">{MEMBERSHIP_LABELS[user.membershipStatus]}</Badge>
          <span className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
            {user.email}
          </span>
        </div>

        <h2 className="mt-6 font-display text-2xl tracking-[0.02em] text-bone uppercase">
          {message?.title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist">{message?.body}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/" variant="secondary" size="sm">
            Public site
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary" size="sm">
            Contact an officer
          </ButtonLink>
        </div>
      </Panel>
    </>
  );
}
