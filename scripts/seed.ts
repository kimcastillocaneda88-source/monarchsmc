/**
 * Development seed data.
 *
 * IMPORTANT: everything written here is clearly labelled demo content. None of
 * it is presented as real MONARCHS MC history — there are no invented founding
 * dates, member counts, achievements or officer biographies. It exists so a
 * developer can see populated states, and a production database can start
 * completely empty.
 *
 *   npm run seed                 # against the emulator (recommended)
 *   FIRESTORE_EMULATOR_HOST=...  # required unless you really mean production
 *
 * Refuses to run against a real project unless SEED_ALLOW_PRODUCTION=true.
 */
import { FieldValue } from "firebase-admin/firestore";
import { cliAuth, cliDb, isConfigured, usingEmulator } from "./firebase-admin-cli";

const DEMO = "[DEMO DATA — replace before launch]";

const allowProduction = process.env.SEED_ALLOW_PRODUCTION === "true";

interface SeedAccount {
  email: string;
  password: string;
  displayName: string;
  role: "member" | "editor" | "admin" | "superadmin";
  membershipStatus: "pending" | "active" | "suspended" | "inactive";
  position?: string;
  publicOfficer?: boolean;
  officerOrder?: number;
  motorcycle?: string;
}

const ACCOUNTS: SeedAccount[] = [
  {
    email: "superadmin@monarchs.test",
    password: "monarchs-superadmin-2026",
    displayName: "Demo Superadmin",
    role: "superadmin",
    membershipStatus: "active",
    position: "President",
    publicOfficer: true,
    officerOrder: 0,
    motorcycle: "Demo motorcycle",
  },
  {
    email: "admin@monarchs.test",
    password: "monarchs-admin-2026",
    displayName: "Demo Admin",
    role: "admin",
    membershipStatus: "active",
    position: "Road Captain",
    publicOfficer: true,
    officerOrder: 1,
    motorcycle: "Demo motorcycle",
  },
  {
    email: "editor@monarchs.test",
    password: "monarchs-editor-2026",
    displayName: "Demo Editor",
    role: "editor",
    membershipStatus: "active",
  },
  {
    email: "member@monarchs.test",
    password: "monarchs-member-2026",
    displayName: "Demo Member",
    role: "member",
    membershipStatus: "active",
    motorcycle: "Demo motorcycle",
  },
  {
    email: "pending@monarchs.test",
    password: "monarchs-pending-2026",
    displayName: "Demo Pending Member",
    role: "member",
    membershipStatus: "pending",
  },
  {
    // Exists so the membership lifecycle can be exercised without mutating an
    // account another test signs in as. Nothing signs in as this one.
    email: "lifecycle@monarchs.test",
    password: "monarchs-lifecycle-2026",
    displayName: "Demo Lifecycle Member",
    role: "member",
    membershipStatus: "pending",
  },
];

function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function upsertAccount(account: SeedAccount): Promise<string> {
  const auth = cliAuth();
  let uid: string;

  try {
    const existing = await auth.getUserByEmail(account.email);
    uid = existing.uid;
    await auth.updateUser(uid, { password: account.password, displayName: account.displayName });
  } catch {
    const created = await auth.createUser({
      email: account.email,
      password: account.password,
      displayName: account.displayName,
      emailVerified: true,
    });
    uid = created.uid;
  }

  await auth.setCustomUserClaims(uid, {
    role: account.role,
    membershipStatus: account.membershipStatus,
  });

  const db = cliDb();
  await db.collection("users").doc(uid).set(
    {
      email: account.email,
      role: account.role,
      membershipStatus: account.membershipStatus,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("members").doc(uid).set(
    {
      displayName: account.displayName,
      nickname: null,
      photoPath: null,
      photoUrl: null,
      motorcycle: account.motorcycle ?? null,
      bio: `${DEMO} Demonstration profile used for local development.`,
      chapter: null,
      ridingSince: null,
      position: account.position ?? null,
      publicOfficer: account.publicOfficer ?? false,
      officerOrder: account.officerOrder ?? 99,
      privacy: { showInDirectory: true, showEmail: false, showPhone: false },
      membershipStatus: account.membershipStatus,
      role: account.role,
      joinedAt: account.membershipStatus === "active" ? FieldValue.serverTimestamp() : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("memberContact").doc(uid).set(
    {
      email: account.email,
      phone: null,
      location: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return uid;
}

async function seed(): Promise<void> {
  if (!isConfigured()) {
    throw new Error(
      "Firebase is not configured. Set FIRESTORE_EMULATOR_HOST and FIREBASE_PROJECT_ID, or provide service account credentials.",
    );
  }

  if (!usingEmulator() && !allowProduction) {
    throw new Error(
      "Refusing to seed a non-emulator project. Set SEED_ALLOW_PRODUCTION=true only if you really mean it.",
    );
  }

  const db = cliDb();
  const uids = new Map<string, string>();

  for (const account of ACCOUNTS) {
    const uid = await upsertAccount(account);
    uids.set(account.email, uid);
    console.log(`  account  ${account.email.padEnd(28)} ${account.role}/${account.membershipStatus}`);
  }

  const adminUid = uids.get("admin@monarchs.test") ?? "seed-admin";
  const editorUid = uids.get("editor@monarchs.test") ?? "seed-editor";

  await db.collection("settings").doc("site").set(
    {
      clubName: "MONARCHS MC",
      tagline: "Ride with purpose. Ride as one.",
      // Left empty on purpose — the club supplies real contact details.
      contactEmail: null,
      contactPhone: null,
      locationLabel: null,
      social: { instagram: null, facebook: null, youtube: null, tiktok: null },
      applicationsOpen: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("rides").doc("seed-upcoming-ride").set({
    title: "Demo: Coast Run",
    slug: "demo-coast-run",
    description: `${DEMO}\n\nA demonstration ride so the rides pages have something to show during development. Replace it with a real club run.`,
    requirements: `${DEMO}\n\n- Full tank before departure\n- Valid licence and insurance`,
    routeInfo: `${DEMO} Route details go here.`,
    coverImagePath: null,
    coverImageUrl: null,
    coverImageAlt: null,
    date: isoDaysFromNow(21),
    startTime: "09:00",
    meetingPoint: "Demo meeting point",
    destination: "Demo destination",
    distanceKm: 180,
    roadCaptainId: adminUid,
    roadCaptainName: "Demo Admin",
    status: "upcoming",
    visibility: "public",
    published: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection("rides").doc("seed-members-ride").set({
    title: "Demo: Members Only Run",
    slug: "demo-members-only-run",
    description: `${DEMO}\n\nA members-only ride, used to demonstrate that member-visibility content never reaches the public site.`,
    requirements: null,
    routeInfo: null,
    coverImagePath: null,
    coverImageUrl: null,
    coverImageAlt: null,
    date: isoDaysFromNow(35),
    startTime: "10:00",
    meetingPoint: "Demo meeting point",
    destination: "Demo destination",
    distanceKm: 120,
    roadCaptainId: null,
    roadCaptainName: null,
    status: "upcoming",
    visibility: "members",
    published: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection("events").doc("seed-event").set({
    title: "Demo: Community Day",
    slug: "demo-community-day",
    description: `${DEMO}\n\nA demonstration event. Replace with a real club event.`,
    coverImagePath: null,
    coverImageUrl: null,
    coverImageAlt: null,
    date: isoDaysFromNow(45),
    startTime: "11:00",
    endTime: "16:00",
    location: "Demo location",
    organizer: "MONARCHS MC",
    status: "published",
    visibility: "public",
    publishedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection("news").doc("seed-article").set({
    title: "Demo: A Ride Report",
    slug: "demo-a-ride-report",
    excerpt: `${DEMO} A demonstration article so the journal has something to render during development.`,
    body: `${DEMO}\n\n## About this article\n\nThis is placeholder editorial copy. It exists so a developer can see the article layout, typography and metadata working.\n\n- It states no facts about the club\n- It should be deleted before launch\n\n> Replace this with something the club actually wrote.`,
    coverImagePath: null,
    coverImageUrl: null,
    coverImageAlt: null,
    authorId: editorUid,
    authorName: "Demo Editor",
    category: "Ride Reports",
    published: true,
    publishedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
  });

  await db.collection("news").doc("seed-draft").set({
    title: "Demo: Unpublished Draft",
    slug: "demo-unpublished-draft",
    excerpt: `${DEMO} A draft, used to verify that drafts never reach a public URL.`,
    body: `${DEMO}\n\nThis article is deliberately unpublished.`,
    coverImagePath: null,
    coverImageUrl: null,
    coverImageAlt: null,
    authorId: editorUid,
    authorName: "Demo Editor",
    category: "Club News",
    published: false,
    publishedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
  });

  await db.collection("announcements").doc("seed-announcement").set({
    title: "Demo: Members Notice",
    body: `${DEMO}\n\nA demonstration announcement, visible only to active members.`,
    priority: "important",
    published: true,
    authorId: adminUid,
    authorName: "Demo Admin",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection("applications").doc("seed-application").set({
    fullName: "Demo Applicant",
    preferredName: null,
    email: "applicant@monarchs.test",
    phone: "+00 000 000000",
    location: "Demo location",
    motorcycle: "Demo motorcycle",
    ridingExperience: "experienced",
    yearsRiding: 9,
    whyJoin: `${DEMO} A demonstration application so the review workflow has something to act on.`,
    howHeard: "Seed script",
    status: "new",
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
    internalNotes: null,
    linkedUid: null,
  });

  await db.collection("contactMessages").doc("seed-message").set({
    name: "Demo Sender",
    email: "sender@monarchs.test",
    subject: "Demo: a question",
    category: "General",
    message: `${DEMO} A demonstration contact message.`,
    status: "unread",
    handledBy: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`
Seed complete. All content is prefixed "${DEMO}".
Sign in with any of the accounts above; passwords are in scripts/seed.ts.
`);
}

seed().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
