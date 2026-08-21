"use client";

import { updateMessageStatus } from "@/lib/actions/admin/settings";
import { ActionButton } from "./ActionButton";
import type { ContactMessage } from "@/types";

/** Message triage. Statuses are a fixed set, validated server-side. */
export function MessageControls({ message }: { message: ContactMessage }) {
  return (
    <div className="flex flex-wrap gap-2">
      {message.status !== "read" ? (
        <ActionButton
          action={() => updateMessageStatus(message.id, "read")}
          label="Mark read"
          variant="secondary"
        />
      ) : null}
      {message.status !== "replied" ? (
        <ActionButton
          action={() => updateMessageStatus(message.id, "replied")}
          label="Mark replied"
          variant="primary"
        />
      ) : null}
      {message.status !== "archived" ? (
        <ActionButton
          action={() => updateMessageStatus(message.id, "archived")}
          label="Archive"
          variant="ghost"
        />
      ) : null}
      {message.status !== "spam" ? (
        <ActionButton
          action={() => updateMessageStatus(message.id, "spam")}
          label="Spam"
          variant="danger"
          confirm={{
            title: "Mark this message as spam?",
            description: "It stays in the database but is filtered out of the default view.",
            confirmLabel: "Mark as spam",
          }}
        />
      ) : null}
    </div>
  );
}
