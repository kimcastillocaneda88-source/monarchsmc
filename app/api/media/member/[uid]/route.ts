import { NextResponse } from "next/server";
import { adminBucket, isAdminConfigured } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/session";
import { isActiveMember } from "@/lib/auth/roles";
import { getMemberProfile } from "@/lib/data/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves a member's photograph.
 *
 * Member photographs live in a private area of Storage. They are readable by:
 *   - the member themselves
 *   - any active member (for the directory)
 *   - anyone, but only when an administrator has published that member as a
 *     public officer, since their photograph then appears on /about
 *
 * The response is streamed from a short-lived signed read rather than by
 * exposing the object, so a leaked URL stops working quickly.
 */
export async function GET(_request: Request, context: { params: Promise<{ uid: string }> }) {
  if (!isAdminConfigured()) return new NextResponse(null, { status: 404 });

  const { uid } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return new NextResponse(null, { status: 400 });

  const profile = await getMemberProfile(uid);
  if (!profile?.photoPath) return new NextResponse(null, { status: 404 });

  const publiclyVisible = profile.publicOfficer && profile.membershipStatus === "active";

  if (!publiclyVisible) {
    const viewer = await getSessionUser();
    if (!viewer) return new NextResponse(null, { status: 401 });
    if (viewer.uid !== uid && !isActiveMember(viewer)) {
      return new NextResponse(null, { status: 403 });
    }
  }

  try {
    const file = adminBucket().file(profile.photoPath);
    const [exists] = await file.exists();
    if (!exists) return new NextResponse(null, { status: 404 });

    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": String(metadata.contentType ?? "image/jpeg"),
        "Content-Length": String(buffer.byteLength),
        // Cached by the viewer only — never by a shared cache, since the
        // response depends on who is asking.
        "Cache-Control": publiclyVisible ? "public, max-age=3600" : "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
