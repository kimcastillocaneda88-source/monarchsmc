"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/States";
import { useToast } from "./ToastProvider";
import type { FormState } from "@/lib/actions/form-state";

/**
 * Runs a server action from a button, optionally behind a confirmation.
 *
 * Every destructive admin operation goes through this with `confirm` set, so
 * deletions and suspensions cannot happen on a single mis-click.
 */
export function ActionButton({
  action,
  label,
  pendingLabel,
  variant = "secondary",
  size = "sm",
  confirm,
  className,
  disabled,
}: {
  action: () => Promise<FormState>;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  confirm?: { title: string; description?: string; confirmLabel?: string; destructive?: boolean };
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    setOpen(false);
    startTransition(async () => {
      const result = await action();
      toast.show(result.status === "success" ? "success" : "error", result.message);
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={pending || disabled}
        onClick={() => (confirm ? setOpen(true) : run())}
      >
        {pending ? <Spinner /> : null}
        {pending ? (pendingLabel ?? "Working…") : label}
      </Button>

      {confirm ? (
        <ConfirmDialog
          open={open}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel ?? label}
          destructive={confirm.destructive}
          onConfirm={run}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
