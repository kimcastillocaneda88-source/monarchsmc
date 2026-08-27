import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { usernameCandidateFrom } from "@/lib/validation/schemas";

/**
 * Username reservations.
 *
 * Firestore cannot enforce a unique index, and a "query then write" check is a
 * race: two people submitting the same username at the same moment would both
 * see it free. So the username itself is the document id of a reservation
 * document, and the reservation is created inside a transaction with
 * `create()`, which fails if the id already exists. That makes the id the
 * uniqueness constraint.
 *
 * The collection is also what lets somebody sign in with a name instead of an
 * email address: it is the only mapping from username to account.
 */
export const USERNAMES = "usernames";

export interface UsernameReservation {
  uid: string;
  email: string;
}

/** Thrown when a username is already spoken for. */
export class UsernameTakenError extends Error {
  constructor() {
    super("USERNAME_TAKEN");
    this.name = "UsernameTakenError";
  }
}

/**
 * Claims a username for an account, atomically.
 * Throws {@link UsernameTakenError} if somebody else already holds it.
 */
export async function reserveUsername(
  username: string,
  reservation: UsernameReservation,
): Promise<void> {
  const ref = adminDb().collection(USERNAMES).doc(username);
  try {
    await ref.create({ ...reservation, createdAt: Date.now() });
  } catch (error) {
    // create() rejects with ALREADY_EXISTS (code 6) when the id is taken.
    const code = (error as { code?: unknown })?.code;
    if (code === 6 || code === "already-exists") throw new UsernameTakenError();
    throw error;
  }
}

/** Resolves a username to the account that holds it, or null. */
export async function lookupUsername(username: string): Promise<UsernameReservation | null> {
  const snap = await adminDb().collection(USERNAMES).doc(username).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  const uid = typeof data.uid === "string" ? data.uid : "";
  const email = typeof data.email === "string" ? data.email : "";
  if (!uid || !email) return null;
  return { uid, email };
}

/** Keeps the reservation's cached email in step with the account's. */
export async function updateReservationEmail(username: string, email: string): Promise<void> {
  if (!username) return;
  await adminDb().collection(USERNAMES).doc(username).set({ email }, { merge: true });
}

/** Releases a username. Only used when account creation fails part-way through. */
export async function releaseUsername(username: string): Promise<void> {
  await adminDb().collection(USERNAMES).doc(username).delete();
}

/**
 * Guarantees an account has a username, minting one if it does not.
 *
 * Accounts can reach the system by routes that never asked for a sign-in name —
 * an officer accepting a membership application, or a record predating
 * usernames entirely. Rather than leave those accounts unable to sign in, a
 * name is derived from what we do know and suffixed until the reservation
 * succeeds. Returns the username now held by the account.
 */
export async function ensureUsername(
  uid: string,
  email: string,
  preferred?: string | null,
): Promise<string> {
  const base =
    usernameCandidateFrom(preferred ?? "") ||
    usernameCandidateFrom(email.split("@")[0] ?? "") ||
    "member";

  for (let attempt = 0; attempt < 12; attempt += 1) {
    // The first attempt tries the bare name; later ones add a short suffix.
    const suffix = attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`;
    const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    if (candidate.length < 3) continue;
    try {
      await reserveUsername(candidate, { uid, email });
      return candidate;
    } catch (error) {
      if (error instanceof UsernameTakenError) {
        // Already ours from an earlier partial run? Then we are done.
        const held = await lookupUsername(candidate);
        if (held?.uid === uid) return candidate;
        continue;
      }
      throw error;
    }
  }

  throw new Error("USERNAME_ALLOCATION_FAILED");
}
