"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/States";
import { FormMessage } from "@/components/ui/Field";
import { deleteMediaItem, setMediaApproval } from "@/lib/actions/admin/media-library";
import { formatMillis } from "@/lib/utils";
import type { FaceBlurStatus, MediaItem } from "@/types";

const BLUR_LABEL: Record<FaceBlurStatus, { text: string; tone: "success" | "warning" | "muted" | "danger" }> =
  {
    applied: { text: "Faces blurred", tone: "success" },
    no_faces: { text: "No faces found", tone: "muted" },
    unsupported: { text: "Not an image or video", tone: "muted" },
    unavailable: { text: "Blur did not run", tone: "danger" },
  };

/**
 * Renders media items with the controls the viewer is entitled to.
 *
 * `canModerate` only decides what is drawn. Approving and deleting both
 * re-check the caller on the server, so a control shown by mistake still
 * cannot do anything.
 */
export function MediaList({
  items,
  canModerate,
  viewerUid,
  emptyMessage,
}: {
  items: MediaItem[];
  canModerate: boolean;
  viewerUid: string;
  emptyMessage: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState<MediaItem | null>(null);

  function run(action: () => Promise<{ status: string; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage({ tone: result.status === "success" ? "success" : "error", text: result.message });
      if (result.status === "success") router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="text-sm leading-relaxed text-smoke">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-6">
      {message ? (
        <FormMessage tone={message.tone} title={message.tone === "success" ? "Done" : "Not done"}>
          {message.text}
        </FormMessage>
      ) : null}

      <ul className="grid gap-px bg-ash sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const blur = BLUR_LABEL[item.faceBlur];
          const src = `/api/media/file/${item.id}`;
          const mine = item.uploadedBy === viewerUid;

          return (
            <li key={item.id} className="flex flex-col gap-4 bg-ink p-5">
              <div className="border border-ash bg-graphite">
                {item.kind === "image" ? (
                  // Served through an authorising route that answers with a
                  // short-lived redirect, so the image optimiser cannot fetch it.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={item.title}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover"
                  />
                ) : item.kind === "video" ? (
                  <video
                    src={src}
                    controls
                    preload="metadata"
                    playsInline
                    className="aspect-4/3 w-full bg-ink"
                    aria-label={item.title}
                  />
                ) : (
                  <div className="u-hatch flex aspect-4/3 items-center justify-center px-4 text-center">
                    <span className="font-display text-[0.625rem] tracking-[0.18em] text-gold uppercase">
                      {item.fileName}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm tracking-[0.06em] text-bone uppercase">
                  {item.title}
                </h3>
                {item.caption ? (
                  <p className="mt-2 text-sm leading-relaxed text-mist">{item.caption}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={item.approved ? "success" : "warning"}>
                    {item.approved ? "Published" : "Awaiting review"}
                  </Badge>
                  <Badge tone={blur.tone}>{blur.text}</Badge>
                  <Badge tone="neutral">{item.kind}</Badge>
                </div>

                <p className="mt-3 font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                  {item.uploaderName} · {formatMillis(item.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {item.kind === "file" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(`${src}?download=1`, "_blank", "noopener")}
                  >
                    Download
                  </Button>
                ) : null}

                {canModerate ? (
                  <Button
                    variant={item.approved ? "ghost" : "primary"}
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => setMediaApproval(item.id, !item.approved))}
                  >
                    {pending ? <Spinner /> : null}
                    {item.approved ? "Withdraw" : "Publish"}
                  </Button>
                ) : null}

                {canModerate || mine ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    onClick={() => setConfirming(item)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirming !== null}
        title={confirming ? `Delete “${confirming.title}”?` : "Delete this item?"}
        description="The file is removed from club storage permanently. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const target = confirming;
          setConfirming(null);
          if (target) run(() => deleteMediaItem(target.id));
        }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
