import type { Metadata } from "next";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProfileForm } from "@/components/member/ProfileForm";
import { getMemberContact, getMemberProfile } from "@/lib/data/members";
import { MEMBERSHIP_LABELS, ROLE_LABELS } from "@/lib/auth/roles";
import { formatMillis } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function MemberProfilePage() {
  const user = await requireActiveMemberPage("/member/profile");
  const [profile, contact] = await Promise.all([
    getMemberProfile(user.uid),
    getMemberContact(user.uid),
  ]);

  return (
    <>
      <PortalHeader
        eyebrow="Your account"
        title="Profile"
        description="What other members see, and what stays private."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel>
            <ProfileForm profile={profile} contact={contact} />
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Set by the club">
            <p className="text-sm leading-relaxed text-smoke">
              These are managed by club officers and cannot be changed from here.
            </p>
            <dl className="mt-6 space-y-4">
              <div>
                <dt className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                  Membership status
                </dt>
                <dd className="mt-2">
                  <Badge tone={user.membershipStatus === "active" ? "success" : "warning"}>
                    {MEMBERSHIP_LABELS[user.membershipStatus]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                  Role
                </dt>
                <dd className="mt-2">
                  <Badge tone={user.role === "member" ? "neutral" : "gold"}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </dd>
              </div>
              {profile?.position ? (
                <div>
                  <dt className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                    Officer position
                  </dt>
                  <dd className="mt-2">
                    <Badge tone="gold">{profile.position}</Badge>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                  Email
                </dt>
                <dd className="mt-2 text-sm break-all text-mist">{user.email}</dd>
              </div>
              {profile?.joinedAt ? (
                <div>
                  <dt className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                    Member since
                  </dt>
                  <dd className="mt-2 text-sm text-mist">{formatMillis(profile.joinedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  );
}
