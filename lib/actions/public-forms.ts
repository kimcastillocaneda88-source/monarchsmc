"use server";

import { headers } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { db, isAdminConfigured } from "@/lib/data/client";
import { applicationSchema, contactSchema, fieldErrorsOf } from "@/lib/validation/schemas";
import { consumeRateLimit, subjectFromRequest } from "@/lib/data/rate-limit";
import { RateLimitError } from "@/lib/auth/errors";
import { getSiteSettings } from "@/lib/data/settings";
import { APPLICATIONS } from "@/lib/data/applications";
import { CONTACT_MESSAGES } from "@/lib/data/messages";
import type { FormState } from "./form-state";

/** Submissions faster than this are automated, not human. */
const MIN_FILL_MS = 2500;

function fail(message: string, fieldErrors: Record<string, string> = {}): FormState {
  return { status: "error", message, fieldErrors };
}

/**
 * Abuse protection for public, unauthenticated writes.
 *
 * Three independent layers, because none is sufficient alone:
 *  1. A honeypot field that humans never see and bots fill in.
 *  2. A minimum fill time — instant submissions are scripted.
 *  3. A server-side, per-IP fixed-window rate limit in Firestore.
 *
 * The client cannot bypass any of these: they all run in the server action, and
 * Security Rules deny direct client writes to these collections entirely.
 */
async function guardPublicSubmission(
  key: string,
  honeypot: string,
  elapsedMs: number,
  limit: number,
): Promise<void> {
  if (honeypot.length > 0) throw new RateLimitError("Your submission could not be accepted.");
  if (elapsedMs > 0 && elapsedMs < MIN_FILL_MS) {
    throw new RateLimitError("That was submitted too quickly. Please try again.");
  }
  const requestHeaders = await headers();
  await consumeRateLimit({
    key,
    subject: await subjectFromRequest(requestHeaders),
    limit,
    windowMs: 60 * 60 * 1000,
  });
}

/* --------------------------------------------------- membership application */

/**
 * Records a membership application.
 *
 * Explicitly does NOT create a Firebase Auth user. An application is a request
 * to be considered — account creation and membership are separate, admin-driven
 * steps.
 */
export async function submitApplication(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isAdminConfigured()) {
    return fail("Applications are not being accepted on this deployment yet.");
  }

  const raw = {
    fullName: formData.get("fullName"),
    preferredName: formData.get("preferredName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    location: formData.get("location"),
    motorcycle: formData.get("motorcycle"),
    ridingExperience: formData.get("ridingExperience"),
    yearsRiding: formData.get("yearsRiding"),
    whyJoin: formData.get("whyJoin"),
    howHeard: formData.get("howHeard"),
    website: formData.get("website") ?? "",
    elapsedMs: formData.get("elapsedMs") ?? "0",
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
  };

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  try {
    const settings = await getSiteSettings();
    if (!settings.applicationsOpen) {
      return fail("The club is not accepting applications at the moment.");
    }

    await guardPublicSubmission("join", parsed.data.website, parsed.data.elapsedMs, 3);

    const { website: _website, elapsedMs: _elapsed, consent: _consent, ...application } = parsed.data;

    await db()
      .collection(APPLICATIONS)
      .add({
        ...application,
        status: "new",
        submittedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        reviewedBy: null,
        reviewedAt: null,
        internalNotes: null,
        linkedUid: null,
      });

    return {
      status: "success",
      // Deliberately generic: the applicant is never told anything about the
      // internal review state.
      message:
        "Your application has been received. An officer will review it and contact you if it is a fit.",
      fieldErrors: {},
    };
  } catch (error) {
    if (error instanceof RateLimitError) return fail(error.message);
    return fail("We could not submit your application. Please try again shortly.");
  }
}

/* -------------------------------------------------------------- contact */

export async function submitContact(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!isAdminConfigured()) {
    return fail("Messages cannot be sent on this deployment yet.");
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    category: formData.get("category"),
    message: formData.get("message"),
    website: formData.get("website") ?? "",
    elapsedMs: formData.get("elapsedMs") ?? "0",
  });

  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  try {
    await guardPublicSubmission("contact", parsed.data.website, parsed.data.elapsedMs, 5);

    const { website: _website, elapsedMs: _elapsed, ...message } = parsed.data;

    await db().collection(CONTACT_MESSAGES).add({
      ...message,
      status: "unread",
      handledBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      status: "success",
      message: "Your message has been sent. We read everything that comes in.",
      fieldErrors: {},
    };
  } catch (error) {
    if (error instanceof RateLimitError) return fail(error.message);
    return fail("We could not send your message. Please try again shortly.");
  }
}
