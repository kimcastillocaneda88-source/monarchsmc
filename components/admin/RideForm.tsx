"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveRide } from "@/lib/actions/admin/content";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Checkbox, FormMessage, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { UploadField } from "./UploadField";
import { useToast } from "./ToastProvider";
import { slugify } from "@/lib/utils";
import { RIDE_STATUSES, VISIBILITIES } from "@/types";
import type { MemberProfile, Ride } from "@/types";

export function RideForm({
  ride,
  officers,
}: {
  ride: Ride | null;
  officers: Array<Pick<MemberProfile, "uid" | "displayName">>;
}) {
  const router = useRouter();
  const toast = useToast();
  const boundAction = saveRide.bind(null, ride?.id ?? null);
  const [state, formAction] = useActionState(boundAction, IDLE_FORM_STATE);
  const [slug, setSlug] = useState(ride?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(ride));

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") {
      router.push("/admin/rides");
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
        <legend className="u-eyebrow mb-6">The ride</legend>

        <TextInput
          id="title"
          label="Title"
          required
          defaultValue={ride?.title ?? ""}
          maxLength={140}
          onChange={(event) => {
            if (!slugTouched) setSlug(slugify(event.currentTarget.value));
          }}
          error={state.fieldErrors.title}
        />

        <TextInput
          id="slug"
          label="Web address"
          required
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.currentTarget.value);
          }}
          hint="Appears in the URL: /rides/your-slug"
          error={state.fieldErrors.slug}
        />

        <TextArea
          id="description"
          label="Description"
          required
          rows={10}
          defaultValue={ride?.description ?? ""}
          hint="Markdown is supported: ## headings, **bold**, - lists, > quotes and [links](https://example.com)."
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
            defaultValue={ride?.date ?? ""}
            error={state.fieldErrors.date}
          />
          <TextInput
            id="startTime"
            label="Kick stands up"
            type="time"
            required
            defaultValue={ride?.startTime ?? ""}
            error={state.fieldErrors.startTime}
          />
          <TextInput
            id="meetingPoint"
            label="Meeting point"
            required
            defaultValue={ride?.meetingPoint ?? ""}
            maxLength={200}
            error={state.fieldErrors.meetingPoint}
          />
          <TextInput
            id="destination"
            label="Destination"
            required
            defaultValue={ride?.destination ?? ""}
            maxLength={200}
            error={state.fieldErrors.destination}
          />
          <TextInput
            id="distanceKm"
            label="Distance (km)"
            type="number"
            min={0}
            step={1}
            defaultValue={ride?.distanceKm ?? ""}
            error={state.fieldErrors.distanceKm}
          />
          <Select
            id="roadCaptainId"
            label="Road captain"
            defaultValue={ride?.roadCaptainId ?? ""}
            placeholder="Not assigned"
            options={officers.map((officer) => ({
              value: officer.uid,
              label: officer.displayName,
            }))}
            error={state.fieldErrors.roadCaptainId}
          />
        </div>

        <TextArea
          id="routeInfo"
          label="Route information"
          rows={5}
          defaultValue={ride?.routeInfo ?? ""}
          error={state.fieldErrors.routeInfo}
        />
        <TextArea
          id="requirements"
          label="Requirements"
          rows={5}
          defaultValue={ride?.requirements ?? ""}
          hint="Anything a rider must bring or be able to do."
          error={state.fieldErrors.requirements}
        />
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Cover image</legend>
        <UploadField
          id="cover"
          label="Cover photograph"
          area="rides"
          namePath="coverImagePath"
          nameUrl="coverImageUrl"
          initialPath={ride?.coverImagePath}
          initialUrl={ride?.coverImageUrl}
          hint="JPEG, PNG, WebP or AVIF, up to 8 MB. Landscape works best."
        />
        <TextInput
          id="coverImageAlt"
          label="Image description"
          defaultValue={ride?.coverImageAlt ?? ""}
          maxLength={200}
          hint="Describe the photograph for people using a screen reader."
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
            defaultValue={ride?.status ?? "upcoming"}
            options={RIDE_STATUSES.map((value) => ({ value, label: value }))}
            error={state.fieldErrors.status}
          />
          <Select
            id="visibility"
            label="Visibility"
            required
            defaultValue={ride?.visibility ?? "public"}
            options={VISIBILITIES.map((value) => ({
              value,
              label: value === "public" ? "Public — anyone" : "Members only",
            }))}
            hint="Members-only rides never appear on the public site."
            error={state.fieldErrors.visibility}
          />
        </div>

        <Checkbox
          id="published"
          label="Published — visible to the audience chosen above"
          defaultChecked={ride?.published ?? false}
        />
      </fieldset>

      <div className="border-t border-ash pt-8">
        <SubmitButton label={ride ? "Save ride" : "Create ride"} pendingLabel="Saving…" size="md" />
      </div>
    </form>
  );
}
