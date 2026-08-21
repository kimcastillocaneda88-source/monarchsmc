"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createDocument } from "@/lib/actions/admin/media";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { FormMessage, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { UploadField, type UploadResult } from "./UploadField";
import { useToast } from "./ToastProvider";
import { DOCUMENT_CATEGORIES, ROLES } from "@/types";
import { ROLE_LABELS } from "@/lib/auth/roles";

export function DocumentForm() {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction] = useActionState(createDocument, IDLE_FORM_STATE);
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [handled, setHandled] = useState<typeof state | null>(null);

  // Adjusting state during render — React's documented alternative to
  // resetting state from an effect, which would cause a cascading re-render.
  // Bumping the key remounts the form so the file input and fields clear.
  if (state !== handled) {
    setHandled(state);
    if (state.status === "success") {
      setUploaded(null);
      setFormKey((key) => key + 1);
    }
  }

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") router.refresh();
  }, [state, toast, router]);

  return (
    <form key={formKey} action={formAction} noValidate className="space-y-6">
      {state.status === "error" ? (
        <FormMessage tone="error" title="Not saved">
          {state.message}
        </FormMessage>
      ) : null}

      <UploadField
        id="document-file"
        label="File"
        area="documents"
        namePath="storagePath"
        accept="application/pdf,.pdf,.docx,.xlsx,text/plain,.txt"
        onUploaded={setUploaded}
        hint="PDF, Word, Excel or plain text, up to 25 MB. Stored privately — a Storage URL alone will not open it."
      />

      {/* Carried from the verified upload response, not from the browser. */}
      <input type="hidden" name="fileName" value={uploaded?.fileName ?? ""} readOnly />
      <input type="hidden" name="contentType" value={uploaded?.contentType ?? ""} readOnly />
      <input type="hidden" name="sizeBytes" value={uploaded?.sizeBytes ?? 0} readOnly />

      <TextInput id="title" label="Title" required maxLength={160} error={state.fieldErrors.title} />

      <TextArea
        id="description"
        label="Description"
        rows={3}
        maxLength={600}
        error={state.fieldErrors.description}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Select
          id="category"
          label="Category"
          required
          defaultValue="Member Resources"
          options={DOCUMENT_CATEGORIES.map((value) => ({ value, label: value }))}
          error={state.fieldErrors.category}
        />
        <Select
          id="requiredRole"
          label="Minimum role"
          required
          defaultValue="member"
          options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
          hint="Members below this role cannot see or download the file."
          error={state.fieldErrors.requiredRole}
        />
      </div>

      <SubmitButton label="Add document" pendingLabel="Saving…" size="md" />
    </form>
  );
}
