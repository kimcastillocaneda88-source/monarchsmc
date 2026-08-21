"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/States";
import { FieldError, Label } from "@/components/ui/Field";
import { MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES } from "@/lib/validation/schemas";

export interface UploadResult {
  path: string;
  url: string | null;
  contentType: string;
  sizeBytes: number;
  fileName: string;
}

/**
 * Uploads a file through /api/admin/upload and reports the stored path back to
 * the surrounding form as hidden inputs.
 *
 * The client-side type and size checks here are convenience only — the endpoint
 * re-validates everything, including sniffing the file's actual leading bytes.
 */
export function UploadField({
  id,
  label,
  area,
  scope,
  namePath,
  nameUrl,
  initialPath,
  initialUrl,
  accept = "image/jpeg,image/png,image/webp,image/avif",
  hint,
  onUploaded,
  previewAlt = "",
}: {
  id: string;
  label: string;
  area: "gallery" | "news" | "rides" | "events" | "documents" | "members";
  scope?: string;
  namePath: string;
  nameUrl?: string;
  initialPath?: string | null;
  initialUrl?: string | null;
  accept?: string;
  hint?: string;
  onUploaded?: (result: UploadResult) => void;
  previewAlt?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState(initialPath ?? "");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [fileName, setFileName] = useState("");

  const isDocument = area === "documents";
  const maxBytes = isDocument ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > maxBytes) {
      setError(`That file is too large. The limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`);
      event.target.value = "";
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("area", area);
      if (scope) body.set("scope", scope);

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const payload = (await response.json()) as Partial<UploadResult> & { message?: string };

      if (!response.ok || !payload.path) {
        setError(payload.message ?? "That upload failed. Please try again.");
        return;
      }

      const result: UploadResult = {
        path: payload.path,
        url: payload.url ?? null,
        contentType: payload.contentType ?? file.type,
        sizeBytes: payload.sizeBytes ?? file.size,
        fileName: payload.fileName ?? file.name,
      };

      setPath(result.path);
      setUrl(result.url ?? "");
      setFileName(result.fileName);
      onUploaded?.(result);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    setPath("");
    setUrl("");
    setFileName("");
    setError(null);
  }

  const showPreview = !isDocument && url.length > 0;

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>

      <input type="hidden" name={namePath} value={path} readOnly />
      {nameUrl ? <input type="hidden" name={nameUrl} value={url} readOnly /> : null}

      <div className="flex flex-wrap items-start gap-4">
        {showPreview ? (
          // The uploaded object is public and already sized by the uploader;
          // a plain img keeps the admin preview simple and avoids re-optimising.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={previewAlt}
            className="h-24 w-32 shrink-0 border border-ash object-cover"
            loading="lazy"
          />
        ) : path ? (
          <div className="flex h-24 w-32 shrink-0 items-center justify-center border border-ash bg-graphite px-2 text-center">
            <span className="font-display text-[0.5625rem] tracking-[0.16em] text-gold uppercase">
              {fileName || "File attached"}
            </span>
          </div>
        ) : (
          <div className="u-hatch h-24 w-32 shrink-0 border border-dashed border-ash" aria-hidden="true" />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={busy}
            className={cn(
              "block w-full text-sm text-mist",
              "file:mr-4 file:min-h-10 file:cursor-pointer file:border file:border-iron file:bg-transparent",
              "file:px-4 file:font-display file:text-[0.625rem] file:tracking-[0.18em] file:text-bone file:uppercase",
              "hover:file:border-gold hover:file:text-gold",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
            )}
          />

          {busy ? (
            <p className="flex items-center gap-2 text-xs text-smoke">
              <Spinner /> Uploading…
            </p>
          ) : null}

          {hint ? <p className="text-xs leading-relaxed text-smoke">{hint}</p> : null}

          {path ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="truncate font-mono text-[0.6875rem] text-smoke">{path}</span>
              <button
                type="button"
                onClick={clear}
                className="font-display text-[0.5625rem] tracking-[0.18em] text-danger uppercase"
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
