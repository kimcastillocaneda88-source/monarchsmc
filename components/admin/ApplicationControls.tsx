"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createAccountFromApplication,
  updateApplicationStatus,
} from "@/lib/actions/admin/members";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Select, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionButton } from "./ActionButton";
import { useToast } from "./ToastProvider";
import { APPLICATION_STATUSES } from "@/types";
import type { MembershipApplication } from "@/types";

export function ApplicationReviewForm({ application }: { application: MembershipApplication }) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction] = useActionState(updateApplicationStatus, IDLE_FORM_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") router.refresh();
  }, [state, toast, router]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="applicationId" value={application.id} />

      <Select
        id={`status-${application.id}`}
        name="status"
        label="Status"
        defaultValue={application.status}
        options={APPLICATION_STATUSES.map((status) => ({ value: status, label: status }))}
        error={state.fieldErrors.status}
      />

      <TextArea
        id={`notes-${application.id}`}
        name="internalNotes"
        label="Internal notes"
        rows={4}
        maxLength={4000}
        defaultValue={application.internalNotes ?? ""}
        hint="Officers only. Never shown to the applicant."
      />

      <SubmitButton label="Save review" pendingLabel="Saving…" size="sm" />
    </form>
  );
}

/**
 * Creating an account is deliberately separate from marking an application
 * accepted, and the new account still starts as a pending member.
 */
export function CreateAccountButton({ application }: { application: MembershipApplication }) {
  if (application.linkedUid) {
    return (
      <p className="text-xs leading-relaxed text-success">
        An account already exists for this application.
      </p>
    );
  }

  return (
    <ActionButton
      action={() => createAccountFromApplication(application.id)}
      label="Create member account"
      pendingLabel="Creating…"
      variant="primary"
      confirm={{
        title: `Create an account for ${application.fullName}?`,
        description:
          "This creates a login for their email address as a PENDING member. It does not grant membership — you activate that separately from the Members page.",
        confirmLabel: "Create account",
      }}
    />
  );
}
