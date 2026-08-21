import type { Metadata } from "next";
import Link from "next/link";
import { requireClubManagerPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { MessageControls } from "@/components/admin/MessageControls";
import { listMessages } from "@/lib/data/messages";
import { MESSAGE_STATUSES, type MessageStatus } from "@/types";
import { formatDateTime, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

const TONES: Record<MessageStatus, "gold" | "neutral" | "success" | "muted" | "danger"> = {
  unread: "gold",
  read: "neutral",
  replied: "success",
  archived: "muted",
  spam: "danger",
};

function parseStatus(value: string | undefined): MessageStatus | undefined {
  return value && (MESSAGE_STATUSES as readonly string[]).includes(value)
    ? (value as MessageStatus)
    : undefined;
}

/**
 * Contact messages.
 *
 * Firestore rules deny every client read of this collection; it is reachable
 * only through this admin page and the trusted server code behind it.
 */
export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireClubManagerPage("/admin/messages");
  const { status } = await searchParams;
  const parsed = parseStatus(status);

  const all = await listMessages({ status: parsed, limit: 40 });
  // Spam is hidden unless explicitly requested.
  const messages = parsed ? all : all.filter((message) => message.status !== "spam");

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Messages"
        description="Everything sent through the public contact form."
      />

      <Panel className="mb-8">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-px bg-ash">
          <Link
            href="/admin/messages"
            className={cn(
              "min-h-10 bg-ink px-4 py-2.5 font-display text-[0.625rem] tracking-[0.18em] uppercase",
              !parsed ? "bg-gold text-ink" : "text-mist hover:text-gold",
            )}
          >
            Inbox
          </Link>
          {MESSAGE_STATUSES.map((value) => (
            <Link
              key={value}
              href={`/admin/messages?status=${value}`}
              className={cn(
                "min-h-10 bg-ink px-4 py-2.5 font-display text-[0.625rem] tracking-[0.18em] uppercase",
                parsed === value ? "bg-gold text-ink" : "text-mist hover:text-gold",
              )}
            >
              {value}
            </Link>
          ))}
        </nav>
      </Panel>

      {messages.length === 0 ? (
        <EmptyState
          title="No messages"
          description="Messages sent through the contact page appear here."
        />
      ) : (
        <ul className="space-y-px bg-ash">
          {messages.map((message) => (
            <li key={message.id} className="bg-ink p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONES[message.status]}>{message.status}</Badge>
                <Badge tone="muted">{message.category}</Badge>
                <span className="font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                  {formatDateTime(message.createdAt)}
                </span>
              </div>

              <h2 className="mt-3 font-display text-lg tracking-[0.04em] text-bone uppercase">
                {message.subject}
              </h2>
              <p className="mt-1.5 text-sm text-smoke">
                {message.name} ·{" "}
                <a
                  href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                  className="u-underline-grow break-all text-mist transition hover:text-gold"
                >
                  {message.email}
                </a>
              </p>

              <p className="mt-4 border-l-2 border-ash pl-4 text-sm leading-relaxed whitespace-pre-line text-mist">
                {message.message}
              </p>

              <div className="mt-5">
                <MessageControls message={message} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
