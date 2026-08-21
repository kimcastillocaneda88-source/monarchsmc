"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changeRole,
  generatePasswordResetLink,
  setMembershipStatus,
  updateMemberAdminFields,
} from "@/lib/actions/admin/members";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ActionButton } from "./ActionButton";
import { useToast } from "./ToastProvider";
import { Checkbox, FormMessage, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { MEMBERSHIP_STATUSES, OFFICER_POSITIONS, ROLES } from "@/types";
import type { MemberProfile, MembershipStatus, Role, UserRecord } from "@/types";
import { MEMBERSHIP_LABELS, ROLE_LABELS } from "@/lib/auth/roles";

/** Membership status controls. Available to admins and above. */
export function MembershipStatusControls({
  user,
  isSelf,
}: {
  user: UserRecord;
  isSelf: boolean;
}) {
  const options: Array<{ status: MembershipStatus; label: string; destructive: boolean }> = [
    { status: "active", label: "Activate", destructive: false },
    { status: "suspended", label: "Suspend", destructive: true },
    { status: "inactive", label: "Deactivate", destructive: true },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options
        .filter((option) => option.status !== user.membershipStatus)
        .map((option) => (
          <ActionButton
            key={option.status}
            action={() => setMembershipStatus(user.uid, option.status)}
            label={option.label}
            variant={option.destructive ? "danger" : "primary"}
            disabled={isSelf && option.destructive}
            confirm={{
              title: `${option.label} ${user.email}?`,
              description: option.destructive
                ? "This ends their access to the member area immediately and signs them out of every device."
                : "This gives them full access to the member area.",
              confirmLabel: option.label,
              destructive: option.destructive,
            }}
          />
        ))}
    </div>
  );
}

/** Role assignment. Rendered only for superadmins; the action re-checks. */
export function RoleControl({ user, actorUid }: { user: UserRecord; actorUid: string }) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction] = useActionState(changeRole, IDLE_FORM_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") router.refresh();
  }, [state, toast, router]);

  if (user.uid === actorUid) {
    return (
      <p className="text-xs leading-relaxed text-smoke">
        You cannot change your own role. Another superadmin must do it.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="uid" value={user.uid} />
      <Select
        id={`role-${user.uid}`}
        name="role"
        label="Role"
        defaultValue={user.role}
        className="min-w-40 flex-1"
        options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
      />
      <SubmitButton label="Change role" pendingLabel="Changing…" size="sm" />
    </form>
  );
}

/** Officer position, public visibility and internal notes. */
export function MemberAdminForm({
  user,
  profile,
  notes,
}: {
  user: UserRecord;
  profile: MemberProfile | null;
  notes: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction] = useActionState(updateMemberAdminFields, IDLE_FORM_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") router.refresh();
  }, [state, toast, router]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="uid" value={user.uid} />

      <Select
        id={`position-${user.uid}`}
        name="position"
        label="Officer position"
        defaultValue={profile?.position ?? ""}
        placeholder="No position"
        hint="Only positions the club has actually filled should be assigned."
        options={OFFICER_POSITIONS.map((position) => ({ value: position, label: position }))}
        error={state.fieldErrors.position}
      />

      <Checkbox
        id={`publicOfficer-${user.uid}`}
        name="publicOfficer"
        label="Show this officer on the public About page"
        defaultChecked={profile?.publicOfficer ?? false}
      />

      <TextInput
        id={`officerOrder-${user.uid}`}
        name="officerOrder"
        label="Display order"
        type="number"
        min={0}
        max={99}
        defaultValue={profile?.officerOrder ?? 99}
        hint="Lower numbers appear first."
      />

      <TextArea
        id={`notes-${user.uid}`}
        name="notes"
        label="Internal notes"
        rows={4}
        maxLength={4000}
        defaultValue={notes ?? ""}
        hint="Visible to administrators only. Never shown to the member."
      />

      <SubmitButton label="Save member" pendingLabel="Saving…" size="sm" />
    </form>
  );
}

/** Produces a password reset link an officer can pass on out of band. */
export function ResetLinkButton({ uid }: { uid: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    const result = await generatePasswordResetLink(uid);
    if (result.status === "success") {
      setLink(result.message);
      setOpen(true);
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={generate} disabled={busy}>
        {busy ? "Generating…" : "Password reset link"}
      </Button>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Password reset link"
        description="Send this to the member through a channel you trust. It expires and can only be used once."
        size="lg"
      >
        <p className="font-mono text-xs break-all text-mist">{link}</p>
      </Modal>
    </>
  );
}

export function StatusFilter({ current }: { current: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Select
        id="status"
        name="status"
        label="Membership status"
        defaultValue={current}
        placeholder="All statuses"
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

export function FormFeedback({ state }: { state: { status: string; message: string } }) {
  if (state.status === "idle") return null;
  return (
    <FormMessage
      tone={state.status === "success" ? "success" : "error"}
      title={state.status === "success" ? "Saved" : "Not saved"}
    >
      {state.message}
    </FormMessage>
  );
}

export type { Role };
