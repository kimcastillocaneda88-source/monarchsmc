"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import {
  appCheckSiteKey,
  firebaseConfig,
  isFirebaseClientConfigured,
  useEmulators,
} from "./config";

let appCheckStarted = false;

function ensureApp(): FirebaseApp {
  if (!isFirebaseClientConfigured) {
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/**
 * App Check is an additional layer only — it never replaces Auth or Security
 * Rules. It is initialised lazily in the browser when a site key is present.
 */
function ensureAppCheck(app: FirebaseApp): void {
  if (appCheckStarted || typeof window === "undefined" || !appCheckSiteKey) return;
  appCheckStarted = true;
  void import("firebase/app-check").then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // App Check failures must never block the app from rendering.
    }
  });
}

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const app = ensureApp();
  ensureAppCheck(app);
  const auth = getAuth(app);
  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  void setPersistence(auth, browserLocalPersistence).catch(() => {
    /* falls back to the default persistence */
  });
  authInstance = auth;
  return auth;
}

let storageInstance: FirebaseStorage | null = null;

export function getFirebaseStorage(): FirebaseStorage {
  if (storageInstance) return storageInstance;
  const app = ensureApp();
  ensureAppCheck(app);
  const storage = getStorage(app);
  if (useEmulators) {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
  storageInstance = storage;
  return storage;
}

export { isFirebaseClientConfigured };
