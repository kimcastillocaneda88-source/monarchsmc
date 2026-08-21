import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset link for your MONARCHS MC member account.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Member area"
      title="Reset password"
      lede="Enter the email address on your member account and we will send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
