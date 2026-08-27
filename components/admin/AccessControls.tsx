"use client";

import { approveAccess, revokeAccess, setUploadAccess } from "@/lib/actions/admin/access";
import { ActionButton } from "./ActionButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import type { UserRecord } from "@/types";
import { MEMBERSHIP_STATUSES } from "@/types";
import { MEMBERSHIP_LABELS } from "@/lib/auth/roles";

/**
 * Access decisions for one account.
 *
 * Rendering a control is never the authorisation — every action re-checks the
 * caller's role on the server, so a control that reaches the browser by mistake
 * still cannot do anything.
 */
export function AccessControls({ user, isSelf }: { user: UserRecord; isSelf: boolean }) {
  const active = user.membershipStatus === "active";
  const label = user.username || user.email;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!active ? (
        <ActionButton
          action={() => approveAccess(user.uid)}
          label="Approve access"
          pendingLabel="Approving…"
          variant="primary"
          confirm={{
            title: `Approve access for ${label}?`,
            description:
              "They will be able to sign in and use the member area. Uploading stays switched off until you grant it separately.",
            confirmLabel: "Approve access",
          }}
        />
      ) : (
        <ActionButton
          action={() => revokeAccess(user.uid, "suspended")}
          label="Revoke access"
          pendingLabel="Revoking…"
          variant="danger"
          disabled={isSelf}
          confirm={{
            title: `Revoke access for ${label}?`,
            description:
              "This signs them out of every device immediately, withdraws any upload permission, and blocks them from signing in again until you approve them once more.",
            confirmLabel: "Revoke access",
            destructive: true,
          }}
        />
      )}

      <ActionButton
        action={() => setUploadAccess(user.uid, !user.uploadAccess)}
        label={user.uploadAccess ? "Revoke uploads" : "Allow uploads"}
        pendingLabel="Saving…"
        variant={user.uploadAccess ? "danger" : "secondary"}
        disabled={!active && !user.uploadAccess}
        confirm={
          user.uploadAccess
            ? {
                title: `Stop ${label} uploading?`,
                description:
                  "They keep their membership, but can no longer add photographs, video or files. Anything they have already uploaded stays where it is.",
                confirmLabel: "Revoke uploads",
                destructive: true,
              }
            : {
                title: `Let ${label} upload?`,
                description:
                  "They will be able to add photographs, video and files. Faces are blurred automatically before anything leaves their device, and you still approve each item before it is published.",
                confirmLabel: "Allow uploads",
              }
        }
      />

      {active && !isSelf ? (
        <ActionButton
          action={() => revokeAccess(user.uid, "inactive")}
          label="Retire account"
          pendingLabel="Retiring…"
          variant="ghost"
          confirm={{
            title: `Retire ${label}'s account?`,
            description:
              "Use this when somebody has left the club for good rather than for a temporary hold. It has the same immediate effect as revoking access.",
            confirmLabel: "Retire account",
            destructive: true,
          }}
        />
      ) : null}
    </div>
  );
}

/** Filters the access list by membership status. */
export function AccessFilter({ current }: { current: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Select
        id="status"
        name="status"
        label="Status"
        defaultValue={current}
        placeholder="All accounts"
        className="min-w-44"
        options={MEMBERSHIP_STATUSES.map((status) => ({
          value: status,
          label: MEMBERSHIP_LABELS[status],
        }))}
      />
      <Button type="submit" variant="secondary" size="sm">
        Filter
      </Button>
    </form>
  );
}
