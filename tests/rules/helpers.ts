import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type RulesTestContext,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MembershipStatus, Role } from "@/types";

export const PROJECT_ID = "monarchs-mc-test";

export async function createTestEnvironment(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
}

/**
 * A signed-in context whose custom claims mirror what trusted server code sets
 * on the real account: role and membershipStatus.
 */
export function as(
  env: RulesTestEnvironment,
  uid: string,
  role: Role,
  membershipStatus: MembershipStatus,
): RulesTestContext {
  return env.authenticatedContext(uid, { role, membershipStatus });
}

/** A signed-in account with no claims at all — e.g. a brand-new sign-up. */
export function asBare(env: RulesTestEnvironment, uid: string): RulesTestContext {
  return env.authenticatedContext(uid, {});
}

export function anonymous(env: RulesTestEnvironment): RulesTestContext {
  return env.unauthenticatedContext();
}

const now = new Date();

export const FIXTURES = {
  publicRide: {
    title: "Public ride",
    slug: "public-ride",
    description: "A public ride",
    date: "2099-04-18",
    startTime: "09:00",
    meetingPoint: "Somewhere",
    destination: "Elsewhere",
    status: "upcoming",
    visibility: "public",
    published: true,
    createdAt: now,
    updatedAt: now,
  },
  memberRide: {
    title: "Members ride",
    slug: "members-ride",
    description: "A members-only ride",
    date: "2099-05-18",
    startTime: "09:00",
    meetingPoint: "Somewhere",
    destination: "Elsewhere",
    status: "upcoming",
    visibility: "members",
    published: true,
    createdAt: now,
    updatedAt: now,
  },
  draftRide: {
    title: "Draft ride",
    slug: "draft-ride",
    description: "Not published",
    date: "2099-06-18",
    startTime: "09:00",
    meetingPoint: "Somewhere",
    destination: "Elsewhere",
    status: "draft",
    visibility: "public",
    published: false,
    createdAt: now,
    updatedAt: now,
  },
  publishedArticle: {
    title: "Published",
    slug: "published",
    excerpt: "x",
    body: "y",
    category: "Club News",
    published: true,
    publishedAt: now,
    authorId: "editor",
    authorName: "Editor",
    createdAt: now,
    updatedAt: now,
  },
  draftArticle: {
    title: "Draft",
    slug: "draft",
    excerpt: "x",
    body: "y",
    category: "Club News",
    published: false,
    publishedAt: null,
    authorId: "editor",
    authorName: "Editor",
    createdAt: now,
    updatedAt: now,
  },
  approvedPhoto: {
    title: "Approved",
    altText: "An approved photograph",
    storagePath: "gallery/a.jpg",
    imageUrl: "https://storage.googleapis.com/b/gallery/a.jpg",
    category: "rides",
    approved: true,
    featured: false,
    uploadedBy: "editor",
    createdAt: now,
    updatedAt: now,
  },
  pendingPhoto: {
    title: "Pending",
    altText: "A pending photograph",
    storagePath: "gallery/b.jpg",
    imageUrl: "https://storage.googleapis.com/b/gallery/b.jpg",
    category: "rides",
    approved: false,
    featured: false,
    uploadedBy: "editor",
    createdAt: now,
    updatedAt: now,
  },
  memberProfile: (overrides: Record<string, unknown> = {}) => ({
    displayName: "A Member",
    nickname: null,
    photoPath: null,
    photoUrl: null,
    motorcycle: null,
    bio: null,
    chapter: null,
    ridingSince: null,
    position: null,
    publicOfficer: false,
    officerOrder: 99,
    privacy: { showInDirectory: true, showEmail: false, showPhone: false },
    membershipStatus: "active",
    role: "member",
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }),
  userRecord: (role: Role = "member", membershipStatus: MembershipStatus = "active") => ({
    email: `${role}@example.test`,
    role,
    membershipStatus,
    createdAt: now,
    updatedAt: now,
  }),
  application: {
    fullName: "An Applicant",
    email: "applicant@example.test",
    phone: "0000",
    location: "Somewhere",
    motorcycle: "A bike",
    ridingExperience: "experienced",
    yearsRiding: 10,
    whyJoin: "Because",
    status: "new",
    submittedAt: now,
    updatedAt: now,
  },
  announcement: (published: boolean) => ({
    title: "Notice",
    body: "Body",
    priority: "normal",
    published,
    authorId: "admin",
    authorName: "Admin",
    createdAt: now,
    updatedAt: now,
  }),
  document: (requiredRole: Role) => ({
    title: `${requiredRole} document`,
    description: null,
    storagePath: `documents/${requiredRole}.pdf`,
    fileName: "file.pdf",
    contentType: "application/pdf",
    sizeBytes: 100,
    category: "Handbook",
    requiredRole,
    uploadedBy: "admin",
    createdAt: now,
    updatedAt: now,
  }),
  message: {
    name: "Someone",
    email: "someone@example.test",
    subject: "Hello",
    category: "General",
    message: "A message",
    status: "unread",
    handledBy: null,
    createdAt: now,
    updatedAt: now,
  },
} as const;
