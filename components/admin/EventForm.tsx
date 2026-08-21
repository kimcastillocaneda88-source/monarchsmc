"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveEvent } from "@/lib/actions/admin/content";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { FormMessage, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { UploadField } from "./UploadField";
import { useToast } from "./ToastProvider";
import { slugify } from "@/lib/utils";
import { EVENT_STATUSES, VISIBILITIES } from "@/types";
import type { ClubEvent } from "@/types";

export function EventForm({ event }: { event: ClubEvent | null }) {
  const router = useRouter();
  const toast = useToast();
  const boundAction = saveEvent.bind(null, event?.id ?? null);
  const [state, formAction] = useActionState(boundAction, IDLE_FORM_STATE);
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(event));

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") {
      router.push("/admin/events");
      router.refresh();
    }
  }, [state, toast, router]);

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" ? (
        <FormMessage tone="error" title="Not saved">
          {state.message}
        </FormMessage>
      ) : null}

      <fieldset className="space-y-6">
        <legend className="u-eyebrow mb-6">The event</legend>

        <TextInput
          id="title"
          label="Title"
          required
          defaultValue={event?.title ?? ""}
          maxLength={140}
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.currentTarget.value));
          }}
          error={state.fieldErrors.title}
        />

        <TextInput
          id="slug"
          label="Web address"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.currentTarget.value);
          }}
          hint="Appears in the URL: /events/your-slug"
          error={state.fieldErrors.slug}
        />

        <TextArea
          id="description"
          label="Description"
          required
          rows={10}
          defaultValue={event?.description ?? ""}
          hint="Markdown is supported."
          error={state.fieldErrors.description}
        />
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">When and where</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="date"
            label="Date"
            type="date"
            required
            defaultValue={event?.date ?? ""}
            error={state.fieldErrors.date}
          />
          <TextInput
            id="location"
            label="Location"
            required
            defaultValue={event?.location ?? ""}
            maxLength={200}
            error={state.fieldErrors.location}
          />
          <TextInput
            id="startTime"
            label="Start time"
            type="time"
            required
            defaultValue={event?.startTime ?? ""}
            error={state.fieldErrors.startTime}
          />
          <TextInput
            id="endTime"
            label="End time"
            type="time"
            defaultValue={event?.endTime ?? ""}
            error={state.fieldErrors.endTime}
          />
          <TextInput
            id="organizer"
            label="Organiser"
            defaultValue={event?.organizer ?? ""}
            maxLength={140}
            className="sm:col-span-2"
            error={state.fieldErrors.organizer}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Cover image</legend>
        <UploadField
          id="cover"
          label="Cover photograph"
          area="events"
          namePath="coverImagePath"
          nameUrl="coverImageUrl"
          initialPath={event?.coverImagePath}
          initialUrl={event?.coverImageUrl}
          hint="JPEG, PNG, WebP or AVIF, up to 8 MB."
        />
        <TextInput
          id="coverImageAlt"
          label="Image description"
          defaultValue={event?.coverImageAlt ?? ""}
          maxLength={200}
          error={state.fieldErrors.coverImageAlt}
        />
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Publication</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Select
            id="status"
            label="Status"
            required
            defaultValue={event?.status ?? "draft"}
            options={EVENT_STATUSES.map((value) => ({ value, label: value }))}
            hint="Only published events appear anywhere."
            error={state.fieldErrors.status}
          />
          <Select
            id="visibility"
            label="Visibility"
            required
            defaultValue={event?.visibility ?? "public"}
            options={VISIBILITIES.map((value) => ({
              value,
              label: value === "public" ? "Public — anyone" : "Members only",
            }))}
            error={state.fieldErrors.visibility}
          />
        </div>
      </fieldset>

      <div className="border-t border-ash pt-8">
        <SubmitButton label={event ? "Save event" : "Create event"} pendingLabel="Saving…" size="md" />
      </div>
    </form>
  );
}
