"use client";

import { useRef, useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Spinner } from "./States";

/**
 * Confirmation gate for destructive or irreversible actions.
 * Nothing in the admin area deletes or suspends without passing through here.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      title={title}
      description={description}
      size="sm"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy} type="button">
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={busy}
            type="button"
          >
            {busy ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
