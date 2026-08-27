"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/auth/client-actions";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { fieldErrorsOf, loginSchema } from "@/lib/validation/schemas";
import { toUserMessage } from "@/lib/auth/errors";
import { FormMessage, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";
import { track } from "@/lib/analytics";

/**
 * The sign-in form embedded in the landing page.
 *
 * Deliberately the same code path as /login: it validates with the same schema,
 * resolves the username through the same endpoint, and exchanges the resulting
 * ID token for the same httpOnly session cookie. Being on the landing page
 * changes where it is, not what it trusts.
 *
 * Where a member lands after signing in is the server's decision — a pending
 * account is redirected to /member/pending by the guard on the destination, not
 * by anything chosen here.
 */
export function LandingSignIn() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const data = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      username: data.get("username"),
      password: data.get("password"),
    });

    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }

    setBusy(true);
    try {
      await signIn(parsed.data.username, parsed.data.password);
      track({ name: "login" });
      router.replace("/member/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(toUserMessage(error, "We could not sign you in. Please try again."));
      setBusy(false);
    }
  }

  if (!isFirebaseClientConfigured) {
    return (
      <FormMessage tone="info" title="Sign-in is not configured">
        This deployment does not have Firebase Authentication configured yet. See the README for the
        environment variables that are required.
      </FormMessage>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <FormMessage tone="error" title="Sign-in failed">
          {formError}
        </FormMessage>
      ) : null}

      <TextInput
        id="landing-username"
        name="username"
        label="Username"
        type="text"
        required
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.username}
      />

      <TextInput
        id="landing-password"
        name="password"
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

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ash pt-5">
        <Link
          href="/forgot-password"
          className="u-underline-grow font-display text-[0.625rem] tracking-[0.2em] text-mist uppercase"
        >
          Forgotten password
        </Link>
        <Link
          href="/request-access"
          className="u-underline-grow font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
        >
          Request access →
        </Link>
      </div>
    </form>
  );
}
