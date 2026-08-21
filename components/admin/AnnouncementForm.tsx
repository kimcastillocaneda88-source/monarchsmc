"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveAnnouncement } from "@/lib/actions/admin/content";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Checkbox, FormMessage, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useToast } from "./ToastProvider";
import { ANNOUNCEMENT_PRIORITIES } from "@/types";
import type { Announcement } from "@/types";

export function AnnouncementForm({
  announcement,
  onSaved,
}: {
  announcement: Announcement | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const bound = saveAnnouncement.bind(null, announcement?.id ?? null);
  const [state, formAction] = useActionState(bound, IDLE_FORM_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") {
      onSaved?.();
      router.refresh();
    }
  }, [state, toast, router, onSaved]);

  return (
    <form action={formAction} noValidate className="space-y-6">
      {state.status === "error" ? (
        <FormMessage tone="error" title="Not saved">
          {state.message}
        </FormMessage>
      ) : null}

      <TextInput
        id={`title-${announcement?.id ?? "new"}`}
        name="title"
        label="Title"
        required
        defaultValue={announcement?.title ?? ""}
        maxLength={160}
        error={state.fieldErrors.title}
      />

      <Select
        id={`priority-${announcement?.id ?? "new"}`}
        name="priority"
        label="Priority"
        required
        defaultValue={announcement?.priority ?? "normal"}
        options={ANNOUNCEMENT_PRIORITIES.map((value) => ({ value, label: value }))}
        hint="Urgent notices are highlighted for members. Use them sparingly."
        error={state.fieldErrors.priority}
      />

      <TextArea
        id={`body-${announcement?.id ?? "new"}`}
        name="body"
        label="Message"
        required
        rows={8}
        defaultValue={announcement?.body ?? ""}
        hint="Markdown is supported."
        error={state.fieldErrors.body}
      />

      <Checkbox
        id={`published-${announcement?.id ?? "new"}`}
        name="published"
        label="Published — visible to active members"
        defaultChecked={announcement?.published ?? false}
      />

      <SubmitButton
        label={announcement ? "Save announcement" : "Post announcement"}
        pendingLabel="Saving…"
        size="sm"
      />
    </form>
  );
}
