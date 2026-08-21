import type { Metadata } from "next";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PasswordChangeForm } from "@/components/member/PasswordChangeForm";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { MEMBERSHIP_LABELS, ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Settings" };

export default async function MemberSettingsPage() {
  const user = await requireActiveMemberPage("/member/settings");

  return (
    <>
      <PortalHeader eyebrow="Your account" title="Settings" description="Sign-in and account security." />

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="Account">
          <dl className="space-y-5">
            <div>
              <dt className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                Email
              </dt>
              <dd className="mt-2 text-sm break-all text-mist">{user.email}</dd>
            </div>
            <div>
              <dt className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                Membership
              </dt>
              <dd className="mt-2">
                <Badge tone="success">{MEMBERSHIP_LABELS[user.membershipStatus]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                Role
              </dt>
              <dd className="mt-2">
                <Badge tone={user.role === "member" ? "neutral" : "gold"}>{ROLE_LABELS[user.role]}</Badge>
              </dd>
            </div>
          </dl>

          <p className="mt-8 border-t border-ash pt-6 text-sm leading-relaxed text-smoke">
            Your email address, membership status and role are managed by club officers. To change
            your email address, contact an officer.
          </p>
        </Panel>

        <Panel title="Password">
          <PasswordChangeForm />
        </Panel>

        <Panel title="Sessions" className="lg:col-span-2">
          <p className="text-sm leading-relaxed text-smoke">
            Signing out clears the session on this device. If you think someone else has access to
            your account, change your password — that invalidates existing sessions everywhere.
          </p>
          <div className="mt-6">
            <SignOutButton
              label="Sign out of this device"
              className="inline-flex min-h-11 items-center border border-iron px-6 font-display text-[0.6875rem] tracking-[0.2em] text-bone uppercase transition hover:border-gold hover:text-gold"
            />
          </div>
        </Panel>
      </div>
    </>
  );
}
