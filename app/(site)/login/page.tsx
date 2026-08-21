import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoadingState } from "@/components/ui/States";
import { getSessionUser } from "@/lib/auth/session";
import { isActiveMember } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Member sign in",
  description: "Sign in to the MONARCHS MC member area.",
  // The member area must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(isActiveMember(user) ? "/member/dashboard" : "/member/pending");

  return (
    <AuthShell
      eyebrow="Member area"
      title="Sign in"
      lede="Rides, announcements, the directory and club documents live behind this door."
    >
      <Suspense fallback={<LoadingState label="Loading" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
