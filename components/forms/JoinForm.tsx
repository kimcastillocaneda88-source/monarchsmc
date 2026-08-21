"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitApplication } from "@/lib/actions/public-forms";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Checkbox, FormMessage, Select, SpamTrap, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "./SubmitButton";
import { FormElapsed } from "./FormElapsed";
import { track } from "@/lib/analytics";
import { RIDING_EXPERIENCE } from "@/types";

const EXPERIENCE_OPTIONS = [
  { value: "new", label: "New rider" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced", label: "Experienced" },
  { value: "veteran", label: "Veteran" },
] satisfies Array<{ value: (typeof RIDING_EXPERIENCE)[number]; label: string }>;

export function JoinForm() {
  const [state, formAction] = useActionState(submitApplication, IDLE_FORM_STATE);
  const startedRef = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      track({ name: "join_submitted" });
      feedbackRef.current?.focus();
    } else if (state.status === "error") {
      feedbackRef.current?.focus();
    }
  }, [state.status]);

  function noteStart() {
    if (startedRef.current) return;
    startedRef.current = true;
    track({ name: "join_started" });
  }

  if (state.status === "success") {
    return (
      <div ref={feedbackRef} tabIndex={-1} className="focus:outline-none">
        <FormMessage tone="success" title="Application received">
          {state.message}
        </FormMessage>
        <p className="mt-6 text-sm leading-relaxed text-smoke">
          We do not publish application outcomes and we cannot discuss the status of an application
          by email. If your application progresses, an officer will contact you directly.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} onFocus={noteStart} noValidate className="relative space-y-8">
      <SpamTrap />
      <FormElapsed />

      <div ref={feedbackRef} tabIndex={-1} className="focus:outline-none">
        {state.status === "error" ? (
          <FormMessage tone="error" title="Application not sent">
            {state.message}
          </FormMessage>
        ) : null}
      </div>

      <fieldset className="space-y-6">
        <legend className="u-eyebrow mb-6">About you</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="fullName"
            label="Full name"
            required
            autoComplete="name"
            maxLength={120}
            error={state.fieldErrors.fullName}
          />
          <TextInput
            id="preferredName"
            label="Preferred name"
            autoComplete="nickname"
            maxLength={60}
            hint="What people actually call you."
            error={state.fieldErrors.preferredName}
          />
          <TextInput
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            error={state.fieldErrors.email}
          />
          <TextInput
            id="phone"
            label="Phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            maxLength={40}
            error={state.fieldErrors.phone}
          />
          <TextInput
            id="location"
            label="Where you are based"
            required
            autoComplete="address-level2"
            maxLength={120}
            className="sm:col-span-2"
            error={state.fieldErrors.location}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Your riding</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="motorcycle"
            label="What you ride"
            required
            maxLength={120}
            hint="Make, model and year."
            error={state.fieldErrors.motorcycle}
          />
          <Select
            id="ridingExperience"
            label="Riding experience"
            required
            options={EXPERIENCE_OPTIONS}
            placeholder="Select…"
            error={state.fieldErrors.ridingExperience}
          />
          <TextInput
            id="yearsRiding"
            label="Years riding"
            type="number"
            required
            min={0}
            max={80}
            inputMode="numeric"
            error={state.fieldErrors.yearsRiding}
          />
          <TextInput
            id="howHeard"
            label="How you heard about us"
            maxLength={200}
            error={state.fieldErrors.howHeard}
          />
        </div>

        <TextArea
          id="whyJoin"
          label="Why you want to ride with MONARCHS MC"
          required
          rows={8}
          minLength={40}
          maxLength={2000}
          hint="At least a few sentences. This is the part officers read closely."
          error={state.fieldErrors.whyJoin}
        />
      </fieldset>

      <div className="space-y-6 border-t border-ash pt-8">
        <Checkbox
          id="consent"
          name="consent"
          required
          error={state.fieldErrors.consent}
          label={
            <>
              I confirm the information above is accurate, I hold a valid motorcycle licence, and I
              consent to MONARCHS MC storing this application for the purpose of reviewing it.
            </>
          }
        />

        <SubmitButton label="Submit application" pendingLabel="Submitting…" />

        <p className="text-xs leading-relaxed text-smoke">
          Submitting this form does not create an account and does not make you a member. It starts a
          review.
        </p>
      </div>
    </form>
  );
}
