/**
 * MONARCHS MC — domain types.
 * These mirror the Firestore data model documented in README.md.
 * Timestamps crossing the server/client boundary are serialized to epoch millis.
 */

export type Millis = number;

/* ------------------------------------------------------------------ roles */

export const ROLES = ["member", "editor", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export const MEMBERSHIP_STATUSES = ["pending", "active", "suspended", "inactive"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/* ------------------------------------------------------------- identity */

/** users/{uid} — authentication identity + authorization state. Never client-writable. */
export interface UserRecord {
  uid: string;
  email: string;
  role: Role;
  membershipStatus: MembershipStatus;
  createdAt: Millis;
  updatedAt: Millis;
  lastLoginAt?: Millis | null;
  approvedBy?: string | null;
  approvedAt?: Millis | null;
  applicationId?: string | null;
}

/** Officer positions. A club may not fill every position — only populated ones render. */
export const OFFICER_POSITIONS = [
  "President",
  "Vice President",
  "Road Captain",
  "Secretary",
  "Treasurer",
  "Sergeant at Arms",
] as const;
export type OfficerPosition = (typeof OFFICER_POSITIONS)[number];

export interface MemberPrivacy {
  /** Show this member in the member-only directory. */
  showInDirectory: boolean;
  /** Share email with other active members. */
  showEmail: boolean;
  /** Share phone with other active members. */
  showPhone: boolean;
}

/** members/{uid} — club-facing profile. Owner may edit an allow-listed subset. */
export interface MemberProfile {
  uid: string;
  displayName: string;
  nickname: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  motorcycle: string | null;
  bio: string | null;
  chapter: string | null;
  ridingSince: number | null;
  /** Officer position, admin-assigned. Drives the public leadership section. */
  position: OfficerPosition | null;
  /** Admin-controlled: show this officer on the public /about leadership grid. */
  publicOfficer: boolean;
  officerOrder: number | null;
  privacy: MemberPrivacy;
  /** Denormalised from users/{uid}; written only by trusted server code. */
  membershipStatus: MembershipStatus;
  role: Role;
  joinedAt: Millis | null;
  createdAt: Millis;
  updatedAt: Millis;
}

/** memberContact/{uid} — contact details, restricted. Never exposed publicly. */
export interface MemberContact {
  uid: string;
  email: string;
  phone: string | null;
  location: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  updatedAt: Millis;
}

/** memberAdmin/{uid} — internal administrative notes. Admin+ only. */
export interface MemberAdminRecord {
  uid: string;
  notes: string | null;
  statusHistory: Array<{ status: MembershipStatus; at: Millis; by: string; note?: string }>;
  updatedAt: Millis;
}

/** The directory entry other members are allowed to see. */
export interface DirectoryEntry {
  uid: string;
  displayName: string;
  nickname: string | null;
  photoUrl: string | null;
  motorcycle: string | null;
  bio: string | null;
  chapter: string | null;
  ridingSince: number | null;
  position: OfficerPosition | null;
  email: string | null;
  phone: string | null;
}

/* --------------------------------------------------------- applications */

export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "invited",
  "accepted",
  "declined",
  "archived",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const RIDING_EXPERIENCE = ["new", "intermediate", "experienced", "veteran"] as const;
export type RidingExperience = (typeof RIDING_EXPERIENCE)[number];

export interface MembershipApplication {
  id: string;
  fullName: string;
  preferredName: string | null;
  email: string;
  phone: string;
  location: string;
  motorcycle: string;
  ridingExperience: RidingExperience;
  yearsRiding: number;
  whyJoin: string;
  howHeard: string | null;
  status: ApplicationStatus;
  submittedAt: Millis;
  updatedAt: Millis;
  reviewedBy: string | null;
  reviewedAt: Millis | null;
  internalNotes: string | null;
  /** uid created when the application was accepted. */
  linkedUid: string | null;
}

/* ---------------------------------------------------------------- rides */

export const RIDE_STATUSES = ["draft", "upcoming", "completed", "cancelled"] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

export const VISIBILITIES = ["public", "members"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export interface Ride {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements: string | null;
  routeInfo: string | null;
  coverImagePath: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  /** ISO date, e.g. 2026-04-18 — stored as a string so it is timezone-stable. */
  date: string;
  startTime: string;
  meetingPoint: string;
  destination: string;
  /** Distance in kilometres. */
  distanceKm: number | null;
  roadCaptainId: string | null;
  roadCaptainName: string | null;
  status: RideStatus;
  visibility: Visibility;
  published: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

export const RSVP_RESPONSES = ["going", "maybe", "not_going"] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

/** rides/{rideId}/rsvps/{uid} — idempotent by construction: the doc id is the uid. */
export interface Rsvp {
  uid: string;
  rideId: string;
  response: RsvpResponse;
  displayName: string;
  note: string | null;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface RsvpTally {
  going: number;
  maybe: number;
  not_going: number;
}

/* --------------------------------------------------------------- events */

export const EVENT_STATUSES = ["draft", "published", "cancelled", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export interface ClubEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImagePath: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  location: string;
  organizer: string | null;
  status: EventStatus;
  visibility: Visibility;
  publishedAt: Millis | null;
  createdAt: Millis;
  updatedAt: Millis;
}

/* -------------------------------------------------------------- gallery */

export const GALLERY_CATEGORIES = [
  "rides",
  "events",
  "brotherhood",
  "machines",
  "community",
] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface GalleryItem {
  id: string;
  title: string;
  caption: string | null;
  altText: string;
  storagePath: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  category: GalleryCategory;
  rideId: string | null;
  eventId: string | null;
  uploadedBy: string;
  approved: boolean;
  featured: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

/* ----------------------------------------------------------------- news */

export const NEWS_CATEGORIES = [
  "Club News",
  "Ride Reports",
  "Member Stories",
  "Community",
  "Announcements",
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** Markdown-subset body. Rendered through a sanitising renderer — never dangerouslySetInnerHTML. */
  body: string;
  coverImagePath: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorId: string;
  authorName: string;
  category: NewsCategory;
  published: boolean;
  publishedAt: Millis | null;
  createdAt: Millis;
  updatedAt: Millis;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
}

/* -------------------------------------------------------- announcements */

export const ANNOUNCEMENT_PRIORITIES = ["normal", "important", "urgent"] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  published: boolean;
  authorId: string;
  authorName: string;
  createdAt: Millis;
  updatedAt: Millis;
}

/* ------------------------------------------------------------ documents */

export const DOCUMENT_CATEGORIES = [
  "Handbook",
  "Ride Guidelines",
  "Meeting Minutes",
  "Member Resources",
  "Forms",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

/** Metadata only. The file itself lives in Storage under /documents and is never public. */
export interface ClubDocument {
  id: string;
  title: string;
  description: string | null;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  category: DocumentCategory;
  /** Minimum role required to download. */
  requiredRole: Role;
  uploadedBy: string;
  createdAt: Millis;
  updatedAt: Millis;
}

/* ------------------------------------------------------------- messages */

export const CONTACT_CATEGORIES = [
  "General",
  "Membership",
  "Events",
  "Community",
  "Media",
  "Other",
] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const MESSAGE_STATUSES = ["unread", "read", "replied", "archived", "spam"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  category: ContactCategory;
  message: string;
  status: MessageStatus;
  createdAt: Millis;
  updatedAt: Millis;
  handledBy: string | null;
}

/* ---------------------------------------------------- editorial content */

/** pages/{pageId} — admin-editable copy for otherwise static marketing pages. */
export interface PageContent {
  id: string;
  sections: Record<string, string>;
  heroImagePath: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  updatedAt: Millis;
  updatedBy: string | null;
}

/** settings/site — global configuration. Superadmin-writable, publicly readable. */
export interface SiteSettings {
  clubName: string;
  tagline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  locationLabel: string | null;
  social: {
    instagram: string | null;
    facebook: string | null;
    youtube: string | null;
    tiktok: string | null;
  };
  /** Accepting new membership applications. */
  applicationsOpen: boolean;
  updatedAt: Millis;
}

/* ------------------------------------------------------------ audit log */

export const AUDIT_ACTIONS = [
  "member.approve",
  "member.suspend",
  "member.reactivate",
  "member.deactivate",
  "member.update",
  "role.change",
  "application.status_change",
  "application.accept",
  "ride.create",
  "ride.update",
  "ride.delete",
  "event.create",
  "event.update",
  "event.delete",
  "news.create",
  "news.update",
  "news.publish",
  "news.unpublish",
  "news.delete",
  "gallery.upload",
  "gallery.approve",
  "gallery.update",
  "gallery.delete",
  "announcement.create",
  "announcement.update",
  "announcement.delete",
  "document.upload",
  "document.download",
  "document.delete",
  "message.update",
  "settings.update",
  "page.update",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: Role;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata: Record<string, string | number | boolean | null>;
  timestamp: Millis;
}

/* --------------------------------------------------------------- shared */

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** The authenticated principal resolved from the session cookie. */
export interface SessionUser {
  uid: string;
  email: string;
  role: Role;
  membershipStatus: MembershipStatus;
  displayName: string | null;
}
