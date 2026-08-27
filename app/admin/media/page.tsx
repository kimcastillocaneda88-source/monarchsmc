import type { Metadata } from "next";
import { requireAdminAreaPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MediaList } from "@/components/media/MediaList";
import { MediaUploader } from "@/components/media/MediaUploader";
import { listMediaForAdmin } from "@/lib/data/media";
import { canUploadMedia, type Principal } from "@/lib/auth/roles";
import { MEDIA_KINDS, type MediaKind } from "@/types";

export const metadata: Metadata = { title: "Media" };

function parseKind(value: string | undefined): MediaKind | undefined {
  return value && (MEDIA_KINDS as readonly string[]).includes(value)
    ? (value as MediaKind)
    : undefined;
}

/**
 * The media library, from the owner's side.
 *
 * Everything members upload arrives here unapproved and stays invisible to the
 * club until it is published. That review step is what backs the automatic face
 * blur: the blur runs in the uploader's browser, which the server cannot
 * verify, so its reported outcome is shown against each item for a person to
 * judge before anyone else sees it. An item marked "Blur did not run" deserves
 * a proper look before publishing.
 */
export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; kind?: string }>;
}) {
  const user = await requireAdminAreaPage("/admin/media");
  const { filter, kind } = await searchParams;

  const parsedKind = parseKind(kind);
  const approved = filter === "published" ? true : filter === "review" ? false : undefined;

  const items = await listMediaForAdmin({ approved, kind: parsedKind, limit: 48 });
  const awaiting = await listMediaForAdmin({ approved: false, limit: 48 });

  const tabs = [
    { key: "", label: "All" },
    { key: "review", label: `Awaiting review${awaiting.length ? ` (${awaiting.length})` : ""}` },
    { key: "published", label: "Published" },
  ];

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Media"
        description="Photographs, video and files contributed by the club. Nothing is visible to members until you publish it."
      />

      {awaiting.some((item) => item.faceBlur === "unavailable") ? (
        <Panel className="mb-8 border-danger/50">
          <p className="text-sm leading-relaxed text-mist">
            <strong className="text-danger">Some items uploaded without face blurring.</strong> The
            detector could not run in the uploader&rsquo;s browser, so those files are unmodified.
            Check them for identifiable faces before publishing.
          </p>
        </Panel>
      ) : null}

      <Panel className="mb-8">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <a
                key={tab.key}
                href={tab.key ? `/admin/media?filter=${tab.key}` : "/admin/media"}
                className={
                  (filter ?? "") === tab.key
                    ? "inline-flex min-h-9 items-center border border-gold bg-gold px-4 font-display text-[0.6875rem] tracking-[0.18em] text-ink uppercase"
                    : "inline-flex min-h-9 items-center border border-iron px-4 font-display text-[0.6875rem] tracking-[0.18em] text-mist uppercase transition hover:border-gold hover:text-gold"
                }
              >
                {tab.label}
              </a>
            ))}
          </div>

          <form method="get" className="flex flex-wrap items-end gap-3">
            {filter ? <input type="hidden" name="filter" value={filter} /> : null}
            <div className="space-y-2">
              <label
                htmlFor="kind"
                className="block font-display text-[0.6875rem] tracking-[0.2em] text-mist uppercase"
              >
                Type
              </label>
              <select
                id="kind"
                name="kind"
                defaultValue={parsedKind ?? ""}
                className="min-h-12 border border-ash bg-charcoal px-4 py-3 text-sm text-bone focus:border-gold focus:outline-none"
              >
                <option value="">All types</option>
                {MEDIA_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </form>
        </div>
      </Panel>

      {canUploadMedia(user as Principal) ? (
        <Panel className="mb-10">
          <h2 className="u-eyebrow mb-5">Add to the library</h2>
          <MediaUploader />
        </Panel>
      ) : null}

      <MediaList
        items={items}
        canModerate
        viewerUid={user.uid}
        emptyMessage={
          approved === false
            ? "Nothing is waiting for review."
            : "Nothing has been uploaded to the media library yet."
        }
      />
    </>
  );
}
