import type { Metadata } from "next";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { MEMBERSHIP_LABELS, ROLE_LABELS } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { AccessControls, AccessFilter } from "@/components/admin/AccessControls";
import { ResetLinkButton } from "@/components/admin/MemberControls";
import { listMembersForAdmin } from "@/lib/data/members";
import { MEMBERSHIP_STATUSES, type MembershipStatus } from "@/types";
import { formatMillis } from "@/lib/utils";

export const metadata: Metadata = { title: "Access" };

function parseStatus(value: string | undefined): MembershipStatus | undefined {
  return value && (MEMBERSHIP_STATUSES as readonly string[]).includes(value)
    ? (value as MembershipStatus)
    : undefined;
}

const STATUS_TONE = {
  active: "success",
  pending: "warning",
  suspended: "danger",
  inactive: "muted",
} as const;

/**
 * Who may sign in, and who may upload.
 *
 * This is the single screen an officer works from when somebody requests an
 * account. It exists separately from /admin/members because the questions are
 * different: members is about club roles and officer positions, this is about
 * whether an account works at all.
 *
 * Admins and above only, enforced by the page guard, by the admin layout, and
 * again inside each action.
 */
export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const actor = await requireClubManagerPage("/admin/access");
  const { status, q } = await searchParams;

  const parsedStatus = parseStatus(status);
  const rows = await listMembersForAdmin({ status: parsedStatus, limit: 60 });

  // Search runs in memory over the bounded page rather than as an unbounded
  // Firestore query.
  const needle = (q ?? "").trim().toLowerCase();
  const filtered = needle
    ? rows.filter(
        (row) =>
          row.user.username.toLowerCase().includes(needle) ||
          row.user.email.toLowerCase().includes(needle) ||
          (row.profile?.displayName ?? "").toLowerCase().includes(needle),
      )
    : rows;

  const waiting = rows.filter((row) => row.user.membershipStatus === "pending").length;

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Access"
        description="Approve or refuse account requests, withdraw access, and decide who may upload photographs, video and files."
      />

      {waiting > 0 && !parsedStatus ? (
        <Panel className="mb-8 border-warning/50">
          <p className="text-sm leading-relaxed text-mist">
            <strong className="text-warning">
              {waiting} {waiting === 1 ? "account is" : "accounts are"} waiting for approval.
            </strong>{" "}
            Nobody can sign in to the member area until you approve them.
          </p>
        </Panel>
      ) : null}

      <Panel className="mb-8">
        <div className="flex flex-wrap items-end gap-6">
          <AccessFilter current={parsedStatus ?? ""} />
          <form method="get" className="flex flex-wrap items-end gap-3">
            {parsedStatus ? <input type="hidden" name="status" value={parsedStatus} /> : null}
            <div className="space-y-2">
              <label
                htmlFor="q"
                className="block font-display text-[0.6875rem] tracking-[0.2em] text-mist uppercase"
              >
                Search
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q ?? ""}
                placeholder="Username, name or email"
                className="min-h-12 w-full min-w-56 border border-ash bg-charcoal px-4 py-3 text-sm text-bone placeholder:text-smoke/70 focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="min-h-9 border border-iron px-4 font-display text-[0.6875rem] tracking-[0.18em] text-bone uppercase transition hover:border-gold hover:text-gold"
            >
              Search
            </button>
          </form>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          title="No accounts match"
          description={
            rows.length === 0
              ? "Nobody has requested access yet. Requests arrive here from the sign-in panel on the home page."
              : "Try a different search or clear the status filter."
          }
        />
      ) : (
        <ul className="space-y-px bg-ash">
          {filtered.map(({ user, profile }) => (
            <li key={user.uid} className="bg-ink">
              <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base tracking-[0.06em] text-bone uppercase">
                      {user.username || "— no username —"}
                    </h2>
                    <Badge tone={STATUS_TONE[user.membershipStatus]}>
                      {MEMBERSHIP_LABELS[user.membershipStatus]}
                    </Badge>
                    {user.uploadAccess ? (
                      <Badge tone="gold">Can upload</Badge>
                    ) : (
                      <Badge tone="muted">No uploads</Badge>
                    )}
                    {user.role !== "member" ? (
                      <Badge tone="neutral">{ROLE_LABELS[user.role]}</Badge>
                    ) : null}
                  </div>

                  <p className="mt-1.5 text-sm text-mist">
                    {profile?.displayName ?? "Unnamed"}
                    <span className="text-smoke"> · </span>
                    <span className="break-all text-smoke">{user.email}</span>
                  </p>

                  <p className="mt-1 font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                    Requested {formatMillis(user.createdAt)}
                    {user.approvedAt ? ` · Approved ${formatMillis(user.approvedAt)}` : ""}
                    {user.lastLoginAt ? ` · Last seen ${formatMillis(user.lastLoginAt)}` : ""}
                  </p>

                  {user.role !== "member" && !user.uploadAccess ? (
                    <p className="mt-2 max-w-prose text-xs leading-relaxed text-smoke">
                      Editors and above can upload as part of their role, so this account can
                      contribute media without an explicit grant.
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 xl:items-end">
                  <AccessControls user={user} isSelf={user.uid === actor.uid} />
                  <ResetLinkButton uid={user.uid} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
