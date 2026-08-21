"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/States";

/**
 * Submit button wired to the enclosing form's pending state.
 * Disabled while in flight so a form cannot be submitted twice.
 */
export function SubmitButton({
  label,
  pendingLabel,
  fullWidth,
  size = "lg",
}: {
  label: string;
  pendingLabel?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} fullWidth={fullWidth} size={size} withArrow={!pending}>
      {pending ? <Spinner /> : null}
      {pending ? (pendingLabel ?? "Sending…") : label}
    </Button>
  );
}
