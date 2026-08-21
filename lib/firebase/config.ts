/**
 * Public Firebase web configuration.
 *
 * These values are safe to ship to the browser — the Firebase web SDK requires
 * them and they are not secrets. Access is controlled by Security Rules and
 * App Check, never by hiding this config.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const isFirebaseClientConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain,
);

export const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY ?? "";

export const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
