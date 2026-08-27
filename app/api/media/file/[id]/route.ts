import { NextResponse } from "next/server";
import { adminBucket, isAdminConfigured } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdminArea, isActiveMember, type Principal } from "@/lib/auth/roles";
import { getMediaItem } from "@/lib/data/media";
import { STORAGE_PREFIXES } from "@/lib/storage/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Short enough that a leaked link stops working quickly. */
const READ_URL_TTL_MS = 5 * 60 * 1000;

/**
 * Serves an item from the media library.
 *
 * Objects under media/ are private, so this route is the only way to reach one
 * and it decides who may:
 *   - an administrator or editor, for anything, including items still awaiting
 *     review
 *   - the member who uploaded it, for their own item, approved or not
 *   - any active member, once the item has been approved
 *
 * Rather than stream the bytes through this function — which would not survive
 * a 500 MB video, and would break seeking — the caller is redirected to a
 * short-lived signed read URL. The browser then talks to Cloud Storage
 * directly, so range requests work and video scrubs properly.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminConfigured()) return new NextResponse(null, { status: 404 });

  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return new NextResponse(null, { status: 400 });

  const viewer = await getSessionUser();
  if (!viewer) return new NextResponse(null, { status: 401 });

  const item = await getMediaItem(id);
  if (!item) return new NextResponse(null, { status: 404 });

  const isOwner = item.uploadedBy === viewer.uid;
  const isReviewer = canAccessAdminArea(viewer as Principal);
  const allowed = isReviewer || isOwner || (item.approved && isActiveMember(viewer));
  if (!allowed) return new NextResponse(null, { status: 403 });

  // The path comes from Firestore, so it is confined to the expected prefix
  // rather than trusted to point somewhere sensible.
  if (!item.storagePath.startsWith(`${STORAGE_PREFIXES.media}/`) || item.storagePath.includes("..")) {
    return new NextResponse(null, { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";

  try {
    const file = adminBucket().file(item.storagePath);
    const [exists] = await file.exists();
    if (!exists) return new NextResponse(null, { status: 404 });

    // The filename is quoted and stripped of anything that could break out of
    // the header value.
    const safeName = item.fileName.replace(/["\\\r\n]/g, "").slice(0, 120) || "download";

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + READ_URL_TTL_MS,
      ...(download
        ? { responseDisposition: `attachment; filename="${safeName}"` }
        : { responseType: item.contentType }),
    });

    return NextResponse.redirect(url, {
      status: 302,
      // Depends on who is asking, so it must never reach a shared cache.
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
