/**
 * Firebase Admin bootstrap for command-line scripts.
 *
 * Deliberately separate from lib/firebase/admin.ts: that module imports
 * "server-only", which is a React Server Component guard and throws when it is
 * loaded by plain Node. A CLI tool should not depend on the Next.js module
 * graph at all.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "monarchs-cli";

function readServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !rawKey) return null;
  return {
    projectId,
    clientEmail,
    privateKey: rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey,
  };
}

export function usingEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

export function isConfigured(): boolean {
  if (usingEmulator()) {
    return Boolean(process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  }
  return readServiceAccount() !== null;
}

function app(): App {
  const existing = getApps().find((candidate) => candidate.name === APP_NAME);
  if (existing) return existing;

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (usingEmulator()) {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required.");
    return initializeApp({ projectId, storageBucket }, APP_NAME);
  }

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) throw new Error("Firebase Admin credentials are not configured.");
  return initializeApp({ credential: cert(serviceAccount), storageBucket }, APP_NAME);
}

let firestore: Firestore | null = null;

export function cliDb(): Firestore {
  if (firestore) return firestore;
  const database = getFirestore(app());
  try {
    database.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() throws if called twice.
  }
  firestore = database;
  return database;
}

export function cliAuth(): Auth {
  return getAuth(app());
}
