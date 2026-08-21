"use client";

import { useState, type FormEvent } from "react";
import { changePassword, refreshSessionCookie } from "@/lib/auth/client-actions";
import { setPasswordSchema, fieldErrorsOf } from "@/lib/validation/schemas";
import { toUserMessage } from "@/lib/auth/errors";
import { FormMessage, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";

/**
 * Password change.
 *
 * Firebase requires a recent sign-in for this operation; when it refuses we
 * say so plainly rather than surfacing the provider's error code.
 */
export function PasswordChangeForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setDone(false);

    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = setPasswordSchema.safeParse({
      password: data.get("password"),
      confirmPassword: data.get("confirmPassword"),
    });

    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }

    setBusy(true);
    try {
      await changePassword(parsed.data.password);
      // Firebase revokes existing tokens; refresh the server session cookie so
      // the member is not silently signed out on the next navigation.
      await refreshSessionCookie();
      setDone(true);
      form.reset();
    } catch (error) {
      setFormError(toUserMessage(error, "We could not change your password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {done ? (
        <FormMessage tone="success" title="Password changed">
          Your password has been updated.
        </FormMessage>
      ) : null}
      {formError ? (
        <FormMessage tone="error" title="Not changed">
          {formError}
        </FormMessage>
      ) : null}

      <TextInput
        id="password"
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        minLength={12}
        hint="At least 12 characters. Longer is better than more complicated."
        error={errors.password}
      />
      <TextInput
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        required
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      <Button type="submit" disabled={busy} size="md">
        {busy ? <Spinner /> : null}
        {busy ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
