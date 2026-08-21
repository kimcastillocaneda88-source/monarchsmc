"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/auth/client-actions";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { loginSchema, fieldErrorsOf } from "@/lib/validation/schemas";
import { toUserMessage } from "@/lib/auth/errors";
import { FormMessage, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";
import { safeNextPath } from "@/lib/utils";
import { track } from "@/lib/analytics";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const configured = isFirebaseClientConfigured;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const data = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
    });

    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }

    setBusy(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      track({ name: "login" });
      // The server decides where an account may go; safeNextPath only guards
      // against open redirects to another origin.
      const next = safeNextPath(searchParams.get("next"));
      router.replace(next);
      router.refresh();
    } catch (error) {
      setFormError(toUserMessage(error, "We could not sign you in. Please try again."));
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <FormMessage tone="info" title="Sign-in is not configured">
        This deployment does not have Firebase Authentication configured yet. See the README for the
        environment variables that are required.
      </FormMessage>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError ? (
        <FormMessage tone="error" title="Sign-in failed">
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
        error={errors.email}
      />

      <TextInput
        id="password"
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        error={errors.password}
      />

      <Button type="submit" disabled={busy} fullWidth size="lg" withArrow={!busy}>
        {busy ? <Spinner /> : null}
        {busy ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ash pt-6">
        <Link
          href="/forgot-password"
          className="u-underline-grow font-display text-[0.625rem] tracking-[0.2em] text-mist uppercase"
        >
          Forgotten password
        </Link>
        <Link
          href="/join"
          className="u-underline-grow font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
        >
          Apply to join →
        </Link>
      </div>
    </form>
  );
}
