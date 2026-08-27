import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RequestAccessForm } from "@/components/auth/RequestAccessForm";
import { getSessionUser } from "@/lib/auth/session";
import { isActiveMember } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Request access",
  description: "Request an account for the MONARCHS MC member area.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function RequestAccessPage() {
  const user = await getSessionUser();
  if (user) redirect(isActiveMember(user) ? "/member/dashboard" : "/member/pending");

  return (
    <AuthShell
      eyebrow="Member area"
      title="Request access"
      lede="Choose a username and a password. A club officer approves every account before it works."
      note="Requesting access is not the same as being granted it. An officer reviews each request, and can withdraw access again at any time."
    >
      <RequestAccessForm />
    </AuthShell>
  );
}
