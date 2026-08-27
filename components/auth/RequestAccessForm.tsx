"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestAccess } from "@/lib/auth/client-actions";
import { accessRequestSchema, fieldErrorsOf } from "@/lib/validation/schemas";
import { FormMessage, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";

/**
 * Requests an account.
 *
 * Nothing here grants access. The account is created in a pending state and an
 * officer approves it on /admin/access before it can be used, so the copy is
 * careful not to imply that submitting this form is the same as being let in.
 */
export function RequestAccessForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const data = new FormData(event.currentTarget);
    const parsed = accessRequestSchema.safeParse({
      username: data.get("username"),
      displayName: data.get("displayName"),
      email: data.get("email"),
      password: data.get("password"),
      confirmPassword: data.get("confirmPassword"),
    });

    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }

    setBusy(true);
    try {
      const result = await requestAccess(parsed.data);
      setSent(result.message);
    } catch (error) {
      const fieldErrors = (error as Error & { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fieldErrors) setErrors(fieldErrors);
      setFormError(
        error instanceof Error ? error.message : "We could not send that request. Please try again.",
      );
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <FormMessage tone="success" title="Request sent">
          {sent}
        </FormMessage>
        <Link
          href="/login"
          className="u-underline-grow inline-block font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
        >
          Go to sign in →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError ? (
        <FormMessage tone="error" title="Request not sent">
          {formError}
        </FormMessage>
      ) : null}

      <TextInput
        id="username"
        label="Username"
        type="text"
        required
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        hint="This is what you will sign in with. Letters, numbers, dots, hyphens and underscores."
        error={errors.username}
      />

      <TextInput
        id="displayName"
        label="Full name"
        type="text"
        required
        autoComplete="name"
        error={errors.displayName}
      />

      <TextInput
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        hint="Used only to reach you and to reset a forgotten password — never to sign in."
        error={errors.email}
      />

      <TextInput
        id="password"
        label="Password"
        type="password"
        required
        autoComplete="new-password"
        hint="At least 12 characters."
        error={errors.password}
      />

      <TextInput
        id="confirmPassword"
        label="Confirm password"
        type="password"
        required
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      <Button type="submit" disabled={busy} fullWidth size="lg" withArrow={!busy}>
        {busy ? <Spinner /> : null}
        {busy ? "Sending…" : "Request access"}
      </Button>

      <p className="border-t border-ash pt-6 text-xs leading-relaxed text-smoke">
        An officer reviews every request. Your account will not work until it is approved, and
        access can be withdrawn at any time.
      </p>
    </form>
  );
}
