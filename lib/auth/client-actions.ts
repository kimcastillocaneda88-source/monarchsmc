"use client";

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * Browser-side auth operations.
 *
 * Firebase Auth runs in the browser; the resulting ID token is immediately
 * exchanged for an httpOnly session cookie so that server components and route
 * handlers have a trustworthy identity. The ID token itself is never stored.
 */

async function exchangeForSessionCookie(idToken: string): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "We could not start your session. Please try again.");
  }
}

/**
 * Resolves a sign-in username to the address Firebase is keyed on.
 *
 * The endpoint answers for unknown usernames too, with an address that cannot
 * exist, so this never tells the caller whether an account is there. The
 * sign-in that follows fails identically either way.
 */
async function emailForUsername(username: string): Promise<string> {
  const response = await fetch("/api/auth/username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const body = (await response.json().catch(() => ({}))) as { email?: string; message?: string };
  if (!response.ok || !body.email) {
    throw new Error(body.message ?? "We could not sign you in. Please try again.");
  }
  return body.email;
}

export async function signIn(username: string, password: string): Promise<void> {
  const email = await emailForUsername(username);
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken(true);
  await exchangeForSessionCookie(idToken);
}

export interface AccessRequest {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Submits a request for access. Creating the account is the server's job — the
 * browser is never allowed to mint one, because that would decide membership
 * without an officer in the loop.
 */
export async function requestAccess(
  input: AccessRequest,
): Promise<{ message: string; fieldErrors?: Record<string, string> }> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    fieldErrors?: Record<string, string>;
  };
  if (!response.ok) {
    const error = new Error(body.message ?? "We could not send that request. Please try again.");
    (error as Error & { fieldErrors?: Record<string, string> }).fieldErrors = body.fieldErrors;
    throw error;
  }
  return { message: body.message ?? "Your request has been sent." };
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } finally {
    try {
      await firebaseSignOut(getFirebaseAuth());
    } catch {
      // The server cookie is already gone; a client-side failure is not fatal.
    }
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  });
}

/** Used by an invited applicant completing their account setup. */
export async function createAccount(email: string, password: string): Promise<void> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken(true);
  await exchangeForSessionCookie(idToken);
}

export async function changePassword(newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in again before changing your password.");
  await updatePassword(user, newPassword);
}

/** Refreshes the session cookie from the currently signed-in browser session. */
export async function refreshSessionCookie(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;
  const idToken = await user.getIdToken(true);
  await exchangeForSessionCookie(idToken);
}
