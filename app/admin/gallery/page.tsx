import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminAreaPage } from "@/lib/auth/guards";
import { canManageContent, type Principal } from "@/lib/auth/roles";
import { PortalHeader } from "@/components/member/PortalShell";
import { Panel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import {
  GalleryBadges,
  GalleryItemControls,
  GalleryUploadForm,
} from "@/components/admin/GalleryManager";
import { listAllGallery } from "@/lib/data/gallery";
import { formatMillis } from "@/lib/utils";

export const metadata: Metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  const user = await requireAdminAreaPage("/admin/gallery");
  if (!canManageContent(user as Principal)) redirect("/forbidden");

  const items = await listAllGallery({ limit: 36 });
  const pending = items.filter((item) => !item.approved);

  return (
    <>
      <PortalHeader
        eyebrow="Admin"
        title="Gallery"
        description="Only approved photographs appear publicly. Featured photographs also appear on the homepage."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Panel title="Add a photograph">
            <GalleryUploadForm />
          </Panel>
        </div>

        <div className="lg:col-span-2">
          {pending.length > 0 ? (
            <p className="mb-6 border border-warning/40 bg-warning/5 px-5 py-4 text-sm text-warning">
              {pending.length} photograph{pending.length === 1 ? "" : "s"} awaiting approval.
            </p>
          ) : null}

          {items.length === 0 ? (
            <EmptyState
              title="No photographs yet"
              description="Upload the club's first photograph. It stays hidden until you approve it."
            />
          ) : (
            <ul className="space-y-px bg-ash">
              {items.map((item) => (
                <li key={item.id} className="bg-ink">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5">
                    {/* Gallery objects are deliberately public; a plain img keeps
                        the admin list light and avoids re-optimising each thumb. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.altText}
                      loading="lazy"
                      className="h-28 w-full shrink-0 border border-ash object-cover sm:w-40"
                    />

                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-base tracking-[0.06em] text-bone uppercase">
                        {item.title}
                      </h2>
                      {item.caption ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-smoke">{item.caption}</p>
                      ) : null}
                      <p className="mt-2 font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                        Added {formatMillis(item.createdAt)}
                      </p>

                      <div className="mt-3">
                        <GalleryBadges item={item} />
                      </div>

                      <div className="mt-4">
                        <GalleryItemControls item={item} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
