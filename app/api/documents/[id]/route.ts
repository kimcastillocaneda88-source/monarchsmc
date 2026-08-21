import { NextResponse } from "next/server";
import { getDocument } from "@/lib/data/documents";
import { getSessionUser } from "@/lib/auth/session";
import { canReadDocument } from "@/lib/auth/roles";
import { adminBucket, isAdminConfigured } from "@/lib/firebase/admin";
import { recordAudit } from "@/lib/data/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorised download for a private club document.
 *
 * The file itself lives under /documents in Storage, where Security Rules deny
 * every client read. Knowing the storage path is therefore not enough to fetch
 * it. This route checks the session, checks the document's required role, then
 * mints a short-lived signed URL and redirects — so the link cannot be shared
 * usefully and every access is recorded in the audit log.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ message: "Documents are not available." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in to download this document." }, { status: 401 });
  }

  const { id } = await context.params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ message: "That document could not be found." }, { status: 404 });
  }

  if (!canReadDocument(user, doc.requiredRole)) {
    return NextResponse.json(
      { message: "You do not have permission to download this document." },
      { status: 403 },
    );
  }

  try {
    const file = adminBucket().file(doc.storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ message: "That file is no longer available." }, { status: 404 });
    }

    const [url] = await file.getSignedUrl({
      action: "read",
      // Deliberately short: long enough to download, too short to circulate.
      expires: Date.now() + 5 * 60 * 1000,
      responseDisposition: `attachment; filename="${doc.fileName.replace(/["\\]/g, "")}"`,
    });

    await recordAudit(user, "document.download", "document", doc.id, { title: doc.title });

    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json(
      { message: "We could not prepare that download. Please try again." },
      { status: 500 },
    );
  }
}
