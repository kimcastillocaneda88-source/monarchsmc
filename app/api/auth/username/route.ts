import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { lookupUsername } from "@/lib/data/usernames";
import { consumeRateLimit, subjectFromRequest } from "@/lib/data/rate-limit";
import { usernameSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * A domain reserved by RFC 2606 for exactly this purpose: it can never be
 * registered, so an address under it can never belong to a real account.
 */
const DECOY_DOMAIN = "unknown.invalid";

/**
 * Resolves a sign-in username to the email address Firebase Authentication is
 * keyed on.
 *
 * Members sign in with a username, but Firebase only understands email and
 * password, so the browser has to learn the address before it can call
 * `signInWithEmailAndPassword`. That makes this endpoint the one place where a
 * username could be tested for existence, so it deliberately never reveals
 * whether one exists: an unknown username resolves to a stable address in a
 * domain that cannot exist. The browser then attempts a sign-in that fails
 * exactly the way a wrong password fails, and the UI shows the same message
 * either way.
 *
 * The decoy is derived from the username so that repeating a query gives a
 * consistent answer — a per-request random address would itself be a tell.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return json(503, { message: "Authentication is not configured on this deployment." });
  }

  try {
    await consumeRateLimit({
      key: "username-lookup",
      subject: await subjectFromRequest(request.headers),
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });
  } catch {
    return json(429, { message: "Too many sign-in attempts. Please wait and try again." });
  }

  let username: string;
  try {
    const body = (await request.json()) as { username?: unknown };
    const parsed = usernameSchema.safeParse(body.username);
    if (!parsed.success) {
      // A malformed username cannot exist, so answer as though it simply is not
      // in use rather than explaining why it was rejected.
      return json(200, { email: `${DECOY_DOMAIN}-invalid@${DECOY_DOMAIN}` });
    }
    username = parsed.data;
  } catch {
    return json(400, { message: "Invalid sign-in request." });
  }

  try {
    const reservation = await lookupUsername(username);
    return json(200, { email: reservation?.email ?? `${username}@${DECOY_DOMAIN}` });
  } catch {
    return json(503, { message: "We could not reach the sign-in service. Please try again." });
  }
}
