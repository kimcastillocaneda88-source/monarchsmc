"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContact } from "@/lib/actions/public-forms";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { FormMessage, Select, SpamTrap, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "./SubmitButton";
import { FormElapsed } from "./FormElapsed";
import { track } from "@/lib/analytics";
import { CONTACT_CATEGORIES } from "@/types";

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, IDLE_FORM_STATE);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<string>("General");

  useEffect(() => {
    if (state.status !== "idle") feedbackRef.current?.focus();
    if (state.status === "success") track({ name: "contact_submitted", category: categoryRef.current });
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div ref={feedbackRef} tabIndex={-1} className="focus:outline-none">
        <FormMessage tone="success" title="Message sent">
          {state.message}
        </FormMessage>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="relative space-y-8">
      <SpamTrap />
      <FormElapsed />

      <div ref={feedbackRef} tabIndex={-1} className="focus:outline-none">
        {state.status === "error" ? (
          <FormMessage tone="error" title="Message not sent">
            {state.message}
          </FormMessage>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TextInput
          id="name"
          label="Your name"
          required
          autoComplete="name"
          maxLength={120}
          error={state.fieldErrors.name}
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
        <Select
          id="category"
          label="What is this about"
          required
          placeholder="Select…"
          onChange={(event) => {
            categoryRef.current = event.currentTarget.value;
          }}
          options={CONTACT_CATEGORIES.map((value) => ({ value, label: value }))}
          error={state.fieldErrors.category}
        />
        <TextInput
          id="subject"
          label="Subject"
          required
          maxLength={160}
          error={state.fieldErrors.subject}
        />
      </div>

      <TextArea
        id="message"
        label="Message"
        required
        rows={8}
        minLength={20}
        maxLength={4000}
        error={state.fieldErrors.message}
      />

      <SubmitButton label="Send message" pendingLabel="Sending…" />

      <p className="text-xs leading-relaxed text-smoke">
        Messages reach club officers only. They are not published anywhere on this site.
      </p>
    </form>
  );
}
