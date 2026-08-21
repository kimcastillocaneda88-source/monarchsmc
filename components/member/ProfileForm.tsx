"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateMemberProfile } from "@/lib/actions/member-profile";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Checkbox, FormMessage, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { MemberContact, MemberProfile } from "@/types";

export function ProfileForm({
  profile,
  contact,
}: {
  profile: MemberProfile | null;
  contact: MemberContact | null;
}) {
  const [state, formAction] = useActionState(updateMemberProfile, IDLE_FORM_STATE);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") feedbackRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="space-y-8">
      <div ref={feedbackRef} tabIndex={-1} className="focus:outline-none">
        {state.status === "success" ? (
          <FormMessage tone="success" title="Profile saved">
            {state.message}
          </FormMessage>
        ) : null}
        {state.status === "error" ? (
          <FormMessage tone="error" title="Not saved">
            {state.message}
          </FormMessage>
        ) : null}
      </div>

      <fieldset className="space-y-6">
        <legend className="u-eyebrow mb-6">You</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="displayName"
            label="Display name"
            required
            defaultValue={profile?.displayName ?? ""}
            maxLength={80}
            error={state.fieldErrors.displayName}
          />
          <TextInput
            id="nickname"
            label="Road name"
            defaultValue={profile?.nickname ?? ""}
            maxLength={40}
            error={state.fieldErrors.nickname}
          />
          <TextInput
            id="motorcycle"
            label="What you ride"
            defaultValue={profile?.motorcycle ?? ""}
            maxLength={120}
            error={state.fieldErrors.motorcycle}
          />
          <TextInput
            id="ridingSince"
            label="Riding since"
            type="number"
            inputMode="numeric"
            min={1900}
            max={new Date().getFullYear()}
            defaultValue={profile?.ridingSince ?? ""}
            error={state.fieldErrors.ridingSince}
          />
          <TextInput
            id="chapter"
            label="Chapter"
            defaultValue={profile?.chapter ?? ""}
            maxLength={80}
            hint="Leave blank if the club has no chapters."
            error={state.fieldErrors.chapter}
          />
        </div>

        <TextArea
          id="bio"
          label="About you"
          rows={6}
          maxLength={1200}
          defaultValue={profile?.bio ?? ""}
          hint="Shown to other members in the directory."
          error={state.fieldErrors.bio}
        />
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Contact details</legend>
        <p className="text-sm leading-relaxed text-smoke">
          These are held separately from your public profile and are visible to club officers. They
          are shown to other members only if you allow it below.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            defaultValue={contact?.phone ?? ""}
            maxLength={40}
            error={state.fieldErrors.phone}
          />
          <TextInput
            id="location"
            label="Where you are based"
            defaultValue={contact?.location ?? ""}
            maxLength={120}
            error={state.fieldErrors.location}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Privacy</legend>
        <Checkbox
          id="showInDirectory"
          label="List me in the member directory"
          defaultChecked={profile?.privacy.showInDirectory ?? true}
        />
        <Checkbox
          id="showEmail"
          label="Share my email address with other active members"
          defaultChecked={profile?.privacy.showEmail ?? false}
        />
        <Checkbox
          id="showPhone"
          label="Share my phone number with other active members"
          defaultChecked={profile?.privacy.showPhone ?? false}
        />
      </fieldset>

      <div className="border-t border-ash pt-8">
        <SubmitButton label="Save profile" pendingLabel="Saving…" size="md" />
      </div>
    </form>
  );
}
