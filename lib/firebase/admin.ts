import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

/**
 * Server-only Firebase Admin bootstrap.
 *
 * IMPORTANT: the Admin SDK bypasses Firestore and Storage Security Rules.
 * Every code path that uses these handles must perform its own authorization
 * check — see lib/auth/guards.ts.
 */

const ADMIN_APP_NAME = "monarchs-admin";

class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("FIREBASE_ADMIN_NOT_CONFIGURED");
    this.name = "FirebaseNotConfiguredError";
  }
}

function readServiceAccount(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !rawKey) return null;
  // Vercel stores multi-line values with literal \n sequences.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  return { projectId, clientEmail, privateKey };
}

/** True when the server has enough configuration to talk to Firebase. */
export function isAdminConfigured(): boolean {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return Boolean(process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  }
  return readServiceAccount() !== null;
}

function ensureAdminApp(): App {
  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) return existing;

  const bucket =
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // Emulator mode: credentials are not required.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) throw new FirebaseNotConfiguredError();
    return initializeApp({ projectId, storageBucket: bucket }, ADMIN_APP_NAME);
  }

  const sa = readServiceAccount();
  if (!sa) throw new FirebaseNotConfiguredError();

  return initializeApp(
    {
      credential: cert({
        projectId: sa.projectId,
        clientEmail: sa.clientEmail,
        privateKey: sa.privateKey,
      }),
      storageBucket: bucket,
    },
    ADMIN_APP_NAME,
  );
}

let dbInstance: Firestore | null = null;

export function adminDb(): Firestore {
  if (dbInstance) return dbInstance;
  const db = getFirestore(ensureAdminApp());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() throws if called twice; safe to ignore.
  }
  dbInstance = db;
  return db;
}

export function adminAuth(): Auth {
  return getAuth(ensureAdminApp());
}

export function adminStorage(): Storage {
  return getStorage(ensureAdminApp());
}

export function adminBucket() {
  const name =
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return name ? adminStorage().bucket(name) : adminStorage().bucket();
}

export { FirebaseNotConfiguredError, getApp as getAdminAppByName };
