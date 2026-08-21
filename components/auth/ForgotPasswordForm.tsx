"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestPasswordReset } from "@/lib/auth/client-actions";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { forgotPasswordSchema, fieldErrorsOf } from "@/lib/validation/schemas";
import { toUserMessage } from "@/lib/auth/errors";
import { FormMessage, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";

export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const data = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: data.get("email") });
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }

    setBusy(true);
    try {
      await requestPasswordReset(parsed.data.email);
    } catch (error) {
      // An unknown address must not be distinguishable from a known one, so
      // anything other than a genuine transport failure still shows success.
      const message = toUserMessage(error, "");
      if (message.includes("could not reach the server")) {
        setFormError(message);
        setBusy(false);
        return;
      }
    }
    setSent(true);
    setBusy(false);
  }

  if (!isFirebaseClientConfigured) {
    return (
      <FormMessage tone="info" title="Password reset is not configured">
        This deployment does not have Firebase Authentication configured yet.
      </FormMessage>
    );
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <FormMessage tone="success" title="Check your email">
          If an account exists for that address, a password reset link is on its way. The link
          expires after a short time.
        </FormMessage>
        <Link
          href="/login"
          className="u-underline-grow inline-flex font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError ? (
        <FormMessage tone="error" title="Could not send the email">
          {formError}
        </FormMessage>
      ) : null}

      <TextInput
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        autoFocus
        hint="We will send a reset link to the address on your member account."
        error={errors.email}
      />

      <Button type="submit" disabled={busy} fullWidth size="lg" withArrow={!busy}>
        {busy ? <Spinner /> : null}
        {busy ? "Sending…" : "Send reset link"}
      </Button>

      <Link
        href="/login"
        className="u-underline-grow inline-flex font-display text-[0.625rem] tracking-[0.2em] text-mist uppercase"
      >
        ← Back to sign in
      </Link>
    </form>
  );
}
