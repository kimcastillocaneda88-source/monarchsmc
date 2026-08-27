import { z } from "zod";
import {
  ANNOUNCEMENT_PRIORITIES,
  FACE_BLUR_STATUSES,
  MEDIA_KINDS,
  APPLICATION_STATUSES,
  CONTACT_CATEGORIES,
  DOCUMENT_CATEGORIES,
  EVENT_STATUSES,
  GALLERY_CATEGORIES,
  MEMBERSHIP_STATUSES,
  MESSAGE_STATUSES,
  NEWS_CATEGORIES,
  OFFICER_POSITIONS,
  RIDE_STATUSES,
  RIDING_EXPERIENCE,
  ROLES,
  RSVP_RESPONSES,
  VISIBILITIES,
  type MediaKind,
} from "@/types";

/**
 * Single source of truth for input validation.
 * The same schema runs in the browser (immediate feedback) and on the server
 * (the actual trust boundary). Client validation is UX, never security.
 */

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");

/** YYYY-MM-DD; stored as a string so it is timezone-stable. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "That is not a real date.");

/** 24-hour HH:MM. */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the 24-hour format HH:MM.");

const optionalTime = z
  .union([timeSchema, z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable();

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal("")])
    .transform((v) => (v === "" ? null : (v ?? null)))
    .nullable()
    .default(null);

/**
 * Optional number from a form field.
 *
 * `z.coerce.number()` turns both "" and null into 0, so neither a union with
 * z.literal("") nor a union with z.null() ever reaches the empty branch — an
 * unfilled field would be stored as zero. Normalising blanks to null first and
 * wrapping in .nullable() (which short-circuits before coercion) keeps
 * "not recorded" distinct from "zero".
 */
const optionalNumber = (min: number, max: number) =>
  z
    .preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : value),
      z.coerce.number().min(min).max(max).nullable(),
    )
    .default(null);

const optionalInt = (min: number, max: number) =>
  z
    .preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : value),
      z.coerce.number().int().min(min).max(max).nullable(),
    )
    .default(null);

const optionalUrl = z
  .union([z.string().trim().url().max(500), z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

/* ------------------------------------------------------------ auth forms */

/**
 * A sign-in name.
 *
 * Lowercased on the way in so that "RoadCaptain" and "roadcaptain" can never
 * become two accounts, and restricted to an unambiguous character set so a
 * username is always safe to use as a Firestore document id in the
 * usernames/{username} reservation collection.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters.")
  .max(24, "Use at most 24 characters.")
  .regex(
    /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/,
    "Use letters, numbers, dots, hyphens and underscores. Start and end with a letter or number.",
  );

/**
 * Derives a username candidate from arbitrary text — a display name, the local
 * part of an email address — normalising it into something
 * {@link usernameSchema} will accept. Returns an empty string when nothing
 * usable survives, which the caller must handle rather than submit.
 *
 * Capped well below the 24-character limit so a uniqueness suffix still fits.
 */
export function usernameCandidateFrom(source: string): string {
  return source
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 20);
}

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * A request for access to the club site.
 *
 * The applicant chooses their own username and password; an administrator
 * then approves or refuses the account. An email address is still required —
 * Firebase Authentication is keyed on it, and it is the only way to send a
 * password reset — but it is never what a member types to sign in.
 */
export const accessRequestSchema = z
  .object({
    username: usernameSchema,
    displayName: trimmed(2, 80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Those passwords do not match.",
    path: ["confirmPassword"],
  });
export type AccessRequestInput = z.infer<typeof accessRequestSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const setPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/* --------------------------------------------------------- applications */

export const applicationSchema = z.object({
  fullName: trimmed(2, 120),
  preferredName: optionalText(60),
  email: emailSchema,
  phone: trimmed(6, 40),
  location: trimmed(2, 120),
  motorcycle: trimmed(2, 120),
  ridingExperience: z.enum(RIDING_EXPERIENCE),
  yearsRiding: z.coerce.number().int().min(0).max(80),
  whyJoin: trimmed(40, 2000),
  howHeard: optionalText(200),
  /** Honeypot — must stay empty. Bots fill it in. */
  website: z.string().max(0).optional().default(""),
  /** Milliseconds the form was on screen; sub-second submissions are automated. */
  elapsedMs: z.coerce.number().int().min(0).optional().default(0),
  consent: z.literal(true, { message: "You must confirm before submitting." }),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const applicationStatusSchema = z.object({
  applicationId: z.string().min(1).max(200),
  status: z.enum(APPLICATION_STATUSES),
  internalNotes: optionalText(4000),
});

/* -------------------------------------------------------------- contact */

export const contactSchema = z.object({
  name: trimmed(2, 120),
  email: emailSchema,
  subject: trimmed(3, 160),
  category: z.enum(CONTACT_CATEGORIES),
  message: trimmed(20, 4000),
  website: z.string().max(0).optional().default(""),
  elapsedMs: z.coerce.number().int().min(0).optional().default(0),
});
export type ContactInput = z.infer<typeof contactSchema>;

/* ---------------------------------------------------------------- rides */

export const rideSchema = z.object({
  title: trimmed(3, 140),
  slug: slugSchema,
  description: trimmed(20, 8000),
  requirements: optionalText(2000),
  routeInfo: optionalText(2000),
  coverImagePath: optionalText(500),
  coverImageUrl: optionalUrl,
  coverImageAlt: optionalText(200),
  date: isoDateSchema,
  startTime: timeSchema,
  meetingPoint: trimmed(3, 200),
  destination: trimmed(3, 200),
  distanceKm: optionalNumber(0, 20000),
  roadCaptainId: optionalText(128),
  status: z.enum(RIDE_STATUSES),
  visibility: z.enum(VISIBILITIES),
  published: z.coerce.boolean().default(false),
});
export type RideInput = z.infer<typeof rideSchema>;

export const rsvpSchema = z.object({
  rideId: z.string().min(1).max(200),
  response: z.enum(RSVP_RESPONSES),
  note: optionalText(300),
});
export type RsvpInput = z.infer<typeof rsvpSchema>;

/* --------------------------------------------------------------- events */

export const eventSchema = z.object({
  title: trimmed(3, 140),
  slug: slugSchema,
  description: trimmed(20, 8000),
  coverImagePath: optionalText(500),
  coverImageUrl: optionalUrl,
  coverImageAlt: optionalText(200),
  date: isoDateSchema,
  startTime: timeSchema,
  endTime: optionalTime.default(null),
  location: trimmed(3, 200),
  organizer: optionalText(140),
  status: z.enum(EVENT_STATUSES),
  visibility: z.enum(VISIBILITIES),
});
export type EventInput = z.infer<typeof eventSchema>;

/* ----------------------------------------------------------------- news */

export const newsSchema = z.object({
  title: trimmed(3, 160),
  slug: slugSchema,
  excerpt: trimmed(20, 400),
  body: trimmed(50, 40000),
  coverImagePath: optionalText(500),
  coverImageUrl: optionalUrl,
  coverImageAlt: optionalText(200),
  category: z.enum(NEWS_CATEGORIES),
  published: z.coerce.boolean().default(false),
  seoTitle: optionalText(70),
  seoDescription: optionalText(180),
  ogImageUrl: optionalUrl,
});
export type NewsInput = z.infer<typeof newsSchema>;

/* -------------------------------------------------------------- gallery */

export const galleryMetadataSchema = z.object({
  title: trimmed(2, 140),
  caption: optionalText(400),
  altText: trimmed(4, 200),
  category: z.enum(GALLERY_CATEGORIES),
  rideId: optionalText(200),
  eventId: optionalText(200),
  approved: z.coerce.boolean().default(false),
  featured: z.coerce.boolean().default(false),
});
export type GalleryMetadataInput = z.infer<typeof galleryMetadataSchema>;

/* -------------------------------------------------------- announcements */

export const announcementSchema = z.object({
  title: trimmed(3, 160),
  body: trimmed(10, 8000),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES),
  published: z.coerce.boolean().default(false),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

/* ------------------------------------------------------------ documents */

export const documentMetadataSchema = z.object({
  title: trimmed(3, 160),
  description: optionalText(600),
  category: z.enum(DOCUMENT_CATEGORIES),
  requiredRole: z.enum(ROLES),
});
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;

/* -------------------------------------------------------- member profile */

/**
 * The exact set of fields a member may change on their own profile.
 * role, membershipStatus, position, audit fields and anything else are
 * absent by construction, and the server rejects unknown keys.
 */
export const memberProfileSchema = z
  .object({
    displayName: trimmed(2, 80),
    nickname: optionalText(40),
    motorcycle: optionalText(120),
    bio: optionalText(1200),
    chapter: optionalText(80),
    ridingSince: optionalInt(1900, new Date().getFullYear()),
    showInDirectory: z.coerce.boolean().default(true),
    showEmail: z.coerce.boolean().default(false),
    showPhone: z.coerce.boolean().default(false),
    phone: optionalText(40),
    location: optionalText(120),
  })
  .strict();
export type MemberProfileInput = z.infer<typeof memberProfileSchema>;

export const MEMBER_EDITABLE_PROFILE_FIELDS = Object.freeze([
  "displayName",
  "nickname",
  "motorcycle",
  "bio",
  "chapter",
  "ridingSince",
  "privacy",
  "photoPath",
  "photoUrl",
  "updatedAt",
] as const);

/** Fields no client may ever write on members/{uid}, regardless of who they are. */
export const PROTECTED_MEMBER_FIELDS = Object.freeze([
  "role",
  "membershipStatus",
  "position",
  "publicOfficer",
  "officerOrder",
  "joinedAt",
  "createdAt",
  "uid",
] as const);

/* ------------------------------------------------------- admin: members */

export const memberAdminUpdateSchema = z.object({
  uid: z.string().min(1).max(128),
  membershipStatus: z.enum(MEMBERSHIP_STATUSES).optional(),
  position: z
    .union([z.enum(OFFICER_POSITIONS), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  publicOfficer: z.coerce.boolean().optional(),
  officerOrder: z.coerce.number().int().min(0).max(99).optional(),
  notes: optionalText(4000).optional(),
});

export const roleChangeSchema = z.object({
  uid: z.string().min(1).max(128),
  role: z.enum(ROLES),
});

/* ------------------------------------------------------ admin: settings */

export const siteSettingsSchema = z.object({
  clubName: trimmed(2, 80),
  tagline: optionalText(160),
  contactEmail: z
    .union([emailSchema, z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  contactPhone: optionalText(40),
  locationLabel: optionalText(120),
  instagram: optionalUrl,
  facebook: optionalUrl,
  youtube: optionalUrl,
  tiktok: optionalUrl,
  applicationsOpen: z.coerce.boolean().default(true),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

export const pageContentSchema = z.object({
  pageId: z.enum(["home", "about", "brotherhood", "join", "contact"]),
  sections: z.record(z.string().max(60), z.string().max(20000)),
  heroImagePath: optionalText(500),
  heroImageUrl: optionalUrl,
  heroImageAlt: optionalText(200),
});

export const messageStatusSchema = z.object({
  messageId: z.string().min(1).max(200),
  status: z.enum(MESSAGE_STATUSES),
});

/* ---------------------------------------------------------- file upload */

export const ALLOWED_IMAGE_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export const ALLOWED_DOCUMENT_TYPES = Object.freeze([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_VIDEO_TYPES = Object.freeze([
  "video/webm",
  "video/mp4",
  "video/quicktime",
]);
/**
 * Videos are uploaded straight to Cloud Storage with a signed URL rather than
 * through a route handler, so this ceiling is not constrained by the 4.5 MB
 * request body limit that applies to serverless functions.
 */
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024; // 512 MB

/** The ceiling for a given kind, used by both the browser and the server. */
export function maxBytesForKind(kind: MediaKind): number {
  if (kind === "video") return MAX_VIDEO_BYTES;
  if (kind === "file") return MAX_DOCUMENT_BYTES;
  return MAX_IMAGE_BYTES;
}

/** What the browser asks for before it may upload anything. */
export const mediaUploadTicketSchema = z.object({
  kind: z.enum(MEDIA_KINDS),
  fileName: trimmed(1, 200),
  contentType: trimmed(1, 128),
  sizeBytes: z.coerce.number().int().positive(),
});
export type MediaUploadTicketInput = z.infer<typeof mediaUploadTicketSchema>;

/** What the browser reports once the bytes are in Cloud Storage. */
export const mediaCompleteSchema = z.object({
  uploadId: trimmed(8, 64),
  title: trimmed(2, 140),
  caption: optionalText(600),
  faceBlur: z.enum(FACE_BLUR_STATUSES),
  facesBlurred: z.coerce.number().int().min(0).max(1000).nullable().default(null),
});
export type MediaCompleteInput = z.infer<typeof mediaCompleteSchema>;

export const mediaMetadataSchema = z.object({
  title: trimmed(2, 140),
  caption: optionalText(600),
});

/* --------------------------------------------------------------- helper */

/** Flattens a ZodError into a { field: message } map for form rendering. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
