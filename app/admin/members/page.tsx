import type { Metadata } from "next";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { canManageAdministrators, MEMBERSHIP_LABELS, ROLE_LABELS, type Principal } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import {
  MemberAdminForm,
  MembershipStatusControls,
  ResetLinkButton,
  RoleControl,
  StatusFilter,
} from "@/components/admin/MemberControls";
import { getMemberAdminRecord, listMembersForAdmin } from "@/lib/data/members";
import { MEMBERSHIP_STATUSES, type MembershipStatus } from "@/types";
import { formatMillis } from "@/lib/utils";

export const metadata: Metadata = { title: "Members" };

function parseStatus(value: string | undefined): MembershipStatus | undefined {
  return value && (MEMBERSHIP_STATUSES as readonly string[]).includes(value)
    ? (value as MembershipStatus)
    : undefined;
}

/**
 * Member management.
 *
 * The page requires an admin; role assignment is additionally gated on
 * superadmin, and the action behind it re-checks rather than trusting that the
 * control was rendered.
 */
export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; open?: string }>;
}) {
  const actor = await requireClubManagerPage("/admin/members");
  const { status, q, open } = await searchParams;

  const parsedStatus = parseStatus(status);
  const rows = await listMembersForAdmin({ status: parsedStatus, limit: 40 });

  // Name/email search is applied in memory over the bounded page rather than
  // with an unbounded Firestore query.
  const needle = (q ?? "").trim().toLowerCase();
  const filtered = needle
    ? rows.filter(
        (row) =>
          row.user.email.toLowerCase().includes(needle) ||
          (row.profile?.displayName ?? "").toLowerCase().includes(needle),
      )
    : rows;

  const superadmin = canManageAdministrators(actor as Principal);
  const expandedUid = open ?? null;
  const expanded = expandedUid ? filtered.find((row) => row.user.uid === expandedUid) : undefined;
  const expandedNotes = expanded ? await getMemberAdminRecord(expanded.user.uid) : null;

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Members"
        description="Membership status, officer positions and — for superadmins — roles."
      />

      <Panel className="mb-8">
        <div className="flex flex-wrap items-end gap-6">
          <StatusFilter current={parsedStatus ?? ""} />
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
                placeholder="Name or email"
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
          title="No members match"
          description={
            rows.length === 0
              ? "There are no member accounts yet. Accounts are created from accepted applications."
              : "Try a different search or clear the status filter."
          }
        />
      ) : (
        <ul className="space-y-px bg-ash">
          {filtered.map((row) => {
            const isExpanded = row.user.uid === expandedUid;
            return (
              <li key={row.user.uid} className="bg-ink">
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base tracking-[0.06em] text-bone uppercase">
                        {row.profile?.displayName ?? row.user.email}
                      </h2>
                      <Badge tone={row.user.membershipStatus === "active" ? "success" : "warning"}>
                        {MEMBERSHIP_LABELS[row.user.membershipStatus]}
                      </Badge>
                      {row.user.role !== "member" ? (
                        <Badge tone="gold">{ROLE_LABELS[row.user.role]}</Badge>
                      ) : null}
                      {row.profile?.position ? (
                        <Badge tone="neutral">{row.profile.position}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm break-all text-smoke">{row.user.email}</p>
                    <p className="mt-1 font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                      Joined {formatMillis(row.user.createdAt)}
                      {row.user.lastLoginAt ? ` · Last seen ${formatMillis(row.user.lastLoginAt)}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <MembershipStatusControls user={row.user} isSelf={row.user.uid === actor.uid} />
                    <a
                      href={
                        isExpanded
                          ? `/admin/members${parsedStatus ? `?status=${parsedStatus}` : ""}`
                          : `/admin/members?${parsedStatus ? `status=${parsedStatus}&` : ""}open=${row.user.uid}`
                      }
                      className="inline-flex min-h-9 items-center border border-iron px-4 font-display text-[0.6875rem] tracking-[0.18em] text-mist uppercase transition hover:border-gold hover:text-gold"
                    >
                      {isExpanded ? "Close" : "Manage"}
                    </a>
                  </div>
                </div>

                {isExpanded && expanded ? (
                  <div className="grid gap-8 border-t border-ash bg-charcoal/40 p-5 lg:grid-cols-2">
                    <div>
                      <h3 className="u-eyebrow mb-5">Club details</h3>
                      <MemberAdminForm
                        user={expanded.user}
                        profile={expanded.profile}
                        notes={expandedNotes?.notes ?? null}
                      />
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h3 className="u-eyebrow mb-5">Role</h3>
                        {superadmin ? (
                          <RoleControl user={expanded.user} actorUid={actor.uid} />
                        ) : (
                          <p className="text-xs leading-relaxed text-smoke">
                            Only a superadmin can assign roles. This member is currently{" "}
                            <strong className="text-mist">{ROLE_LABELS[expanded.user.role]}</strong>.
                          </p>
                        )}
                      </div>

                      <div>
                        <h3 className="u-eyebrow mb-5">Account</h3>
                        <ResetLinkButton uid={expanded.user.uid} />
                        <p className="mt-3 text-xs leading-relaxed text-smoke">
                          The club never sets a member&apos;s password. Generate a link and send it
                          to them directly.
                        </p>
                      </div>

                      {expandedNotes && expandedNotes.statusHistory.length > 0 ? (
                        <div>
                          <h3 className="u-eyebrow mb-5">Membership history</h3>
                          <ul className="space-y-2 text-xs text-smoke">
                            {expandedNotes.statusHistory
                              .slice(-8)
                              .reverse()
                              .map((entry, index) => (
                                <li key={index} className="flex justify-between gap-4">
                                  <span className="text-mist">{MEMBERSHIP_LABELS[entry.status]}</span>
                                  <span>{formatMillis(entry.at)}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
