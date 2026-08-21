"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth/client-actions";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function SignOutButton({ className, label = "Sign out" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await signOut();
      track({ name: "logout" });
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={busy} className={cn(className)}>
      {busy ? "Signing out…" : label}
    </button>
  );
}
