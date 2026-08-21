import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit } from "firebase/firestore";
import { anonymous, as, asBare, createTestEnvironment, FIXTURES } from "./helpers";

/**
 * Firestore Security Rules — the security test matrix from the specification,
 * exercised as raw database operations rather than through the UI. Each case
 * is what a malicious client would actually attempt.
 */

let env: RulesTestEnvironment;

const MEMBER = "member-uid";
const OTHER_MEMBER = "other-member-uid";
const EDITOR = "editor-uid";
const ADMIN = "admin-uid";
const SUPERADMIN = "superadmin-uid";
const PENDING = "pending-uid";
const SUSPENDED = "suspended-uid";

beforeAll(async () => {
  env = await createTestEnvironment();
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, "users", MEMBER), FIXTURES.userRecord("member", "active"));
    await setDoc(doc(db, "users", EDITOR), FIXTURES.userRecord("editor", "active"));
    await setDoc(doc(db, "users", ADMIN), FIXTURES.userRecord("admin", "active"));
    await setDoc(doc(db, "users", SUPERADMIN), FIXTURES.userRecord("superadmin", "active"));
    await setDoc(doc(db, "users", PENDING), FIXTURES.userRecord("member", "pending"));

    await setDoc(doc(db, "members", MEMBER), FIXTURES.memberProfile());
    await setDoc(doc(db, "members", OTHER_MEMBER), FIXTURES.memberProfile({ displayName: "Other" }));
    await setDoc(
      doc(db, "members", ADMIN),
      FIXTURES.memberProfile({
        displayName: "An Officer",
        role: "admin",
        position: "President",
        publicOfficer: true,
        officerOrder: 0,
      }),
    );

    await setDoc(doc(db, "memberContact", MEMBER), {
      email: "member@example.test",
      phone: "0000",
      location: "Somewhere",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "memberContact", OTHER_MEMBER), {
      email: "other@example.test",
      phone: "1111",
      location: "Elsewhere",
      updatedAt: new Date(),
    });

    await setDoc(doc(db, "memberAdmin", MEMBER), { notes: "internal", statusHistory: [], updatedAt: new Date() });

    await setDoc(doc(db, "applications", "app1"), FIXTURES.application);

    await setDoc(doc(db, "rides", "public-ride"), FIXTURES.publicRide);
    await setDoc(doc(db, "rides", "member-ride"), FIXTURES.memberRide);
    await setDoc(doc(db, "rides", "draft-ride"), FIXTURES.draftRide);

    await setDoc(doc(db, "events", "public-event"), {
      title: "Public event",
      slug: "public-event",
      description: "d",
      date: "2099-07-01",
      startTime: "10:00",
      location: "Somewhere",
      status: "published",
      visibility: "public",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await setDoc(doc(db, "news", "published"), FIXTURES.publishedArticle);
    await setDoc(doc(db, "news", "draft"), FIXTURES.draftArticle);

    await setDoc(doc(db, "gallery", "approved"), FIXTURES.approvedPhoto);
    await setDoc(doc(db, "gallery", "pending"), FIXTURES.pendingPhoto);

    await setDoc(doc(db, "announcements", "published"), FIXTURES.announcement(true));
    await setDoc(doc(db, "announcements", "draft"), FIXTURES.announcement(false));

    await setDoc(doc(db, "documents", "member-doc"), FIXTURES.document("member"));
    await setDoc(doc(db, "documents", "admin-doc"), FIXTURES.document("admin"));

    await setDoc(doc(db, "contactMessages", "msg1"), FIXTURES.message);
    await setDoc(doc(db, "auditLogs", "log1"), {
      actorId: ADMIN,
      actorEmail: "admin@example.test",
      actorRole: "admin",
      action: "member.approve",
      targetType: "member",
      targetId: MEMBER,
      metadata: {},
      timestamp: new Date(),
    });
    await setDoc(doc(db, "settings", "site"), { clubName: "MONARCHS MC", updatedAt: new Date() });
    await setDoc(doc(db, "pages", "home"), { sections: {}, updatedAt: new Date() });
    await setDoc(doc(db, "rateLimits", "contact__abc"), { count: 1, windowStart: new Date() });
  });
});

/* ================================================== unauthenticated user */

describe("an unauthenticated visitor", () => {
  it("can read published, public rides", async () => {
    const db = anonymous(env).firestore();
    await assertSucceeds(getDoc(doc(db, "rides", "public-ride")));
  });

  it("cannot read a members-only ride or a draft", async () => {
    const db = anonymous(env).firestore();
    await assertFails(getDoc(doc(db, "rides", "member-ride")));
    await assertFails(getDoc(doc(db, "rides", "draft-ride")));
  });

  it("cannot list rides without constraining the query — rules are not filters", async () => {
    const db = anonymous(env).firestore();
    await assertFails(getDocs(collection(db, "rides")));
  });

  it("can list rides when the query matches what the rules permit", async () => {
    const db = anonymous(env).firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "rides"),
          where("published", "==", true),
          where("visibility", "==", "public"),
        ),
      ),
    );
  });

  it("cannot read unpublished news, but can read published news", async () => {
    const db = anonymous(env).firestore();
    await assertSucceeds(getDoc(doc(db, "news", "published")));
    await assertFails(getDoc(doc(db, "news", "draft")));
    await assertFails(getDocs(collection(db, "news")));
  });

  it("cannot read unapproved gallery items", async () => {
    const db = anonymous(env).firestore();
    await assertSucceeds(getDoc(doc(db, "gallery", "approved")));
    await assertFails(getDoc(doc(db, "gallery", "pending")));
  });

  it("cannot read applications", async () => {
    const db = anonymous(env).firestore();
    await assertFails(getDoc(doc(db, "applications", "app1")));
    await assertFails(getDocs(collection(db, "applications")));
  });

  it("cannot create an application directly, bypassing rate limiting", async () => {
    const db = anonymous(env).firestore();
    await assertFails(setDoc(doc(db, "applications", "forged"), FIXTURES.application));
  });

  it("cannot read or write contact messages", async () => {
    const db = anonymous(env).firestore();
    await assertFails(getDoc(doc(db, "contactMessages", "msg1")));
    await assertFails(setDoc(doc(db, "contactMessages", "forged"), FIXTURES.message));
  });

  it("cannot read member data, contact details or admin notes", async () => {
    const db = anonymous(env).firestore();
    await assertFails(getDoc(doc(db, "members", MEMBER)));
    await assertFails(getDoc(doc(db, "memberContact", MEMBER)));
    await assertFails(getDoc(doc(db, "memberAdmin", MEMBER)));
    await assertFails(getDoc(doc(db, "users", MEMBER)));
  });

  it("can read a published officer through the exact query the About page uses", async () => {
    const db = anonymous(env).firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "members"),
          where("publicOfficer", "==", true),
          where("membershipStatus", "==", "active"),
          orderBy("officerOrder", "asc"),
          limit(12),
        ),
      ),
    );
  });

  it("cannot read member-only announcements or documents", async () => {
    const db = anonymous(env).firestore();
    await assertFails(getDoc(doc(db, "announcements", "published")));
    await assertFails(getDoc(doc(db, "documents", "member-doc")));
  });

  it("can read public site settings and page copy", async () => {
    const db = anonymous(env).firestore();
    await assertSucceeds(getDoc(doc(db, "settings", "site")));
    await assertSucceeds(getDoc(doc(db, "pages", "home")));
  });

  it("cannot write public content", async () => {
    const db = anonymous(env).firestore();
    await assertFails(setDoc(doc(db, "rides", "forged"), FIXTURES.publicRide));
    await assertFails(setDoc(doc(db, "news", "forged"), FIXTURES.publishedArticle));
    await assertFails(setDoc(doc(db, "pages", "home"), { sections: {} }));
    await assertFails(setDoc(doc(db, "settings", "site"), { clubName: "Hijacked" }));
  });

  it("cannot read or write the rate limit counters", async () => {
    const db = anonymous(env).firestore();
    await assertFails(getDoc(doc(db, "rateLimits", "contact__abc")));
    await assertFails(setDoc(doc(db, "rateLimits", "contact__abc"), { count: 0 }));
  });
});

/* ============================================ authenticated but not active */

describe("a signed-in account that is not an active member", () => {
  it("is denied member content when pending", async () => {
    const db = as(env, PENDING, "member", "pending").firestore();
    await assertFails(getDoc(doc(db, "rides", "member-ride")));
    await assertFails(getDoc(doc(db, "announcements", "published")));
    await assertFails(getDoc(doc(db, "documents", "member-doc")));
    await assertFails(getDoc(doc(db, "members", OTHER_MEMBER)));
  });

  it("is denied member content when suspended, even holding an admin role", async () => {
    const db = as(env, SUSPENDED, "admin", "suspended").firestore();
    await assertFails(getDoc(doc(db, "announcements", "published")));
    await assertFails(getDoc(doc(db, "applications", "app1")));
    await assertFails(setDoc(doc(db, "rides", "forged"), FIXTURES.publicRide));
  });

  it("is denied when the token carries no claims at all", async () => {
    const db = asBare(env, "no-claims").firestore();
    await assertFails(getDoc(doc(db, "announcements", "published")));
    await assertFails(getDoc(doc(db, "members", OTHER_MEMBER)));
  });

  it("cannot RSVP to a ride", async () => {
    const db = as(env, PENDING, "member", "pending").firestore();
    await assertFails(
      setDoc(doc(db, "rides", "public-ride", "rsvps", PENDING), { response: "going" }),
    );
  });
});

/* ================================================================ member */

describe("an active member", () => {
  it("can read member-visibility rides and announcements", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertSucceeds(getDoc(doc(db, "rides", "member-ride")));
    await assertSucceeds(getDoc(doc(db, "announcements", "published")));
  });

  it("cannot read a draft ride or an unpublished announcement", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(getDoc(doc(db, "rides", "draft-ride")));
    await assertFails(getDoc(doc(db, "announcements", "draft")));
  });

  it("can read the directory", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertSucceeds(getDoc(doc(db, "members", OTHER_MEMBER)));
  });

  it("cannot read another member's contact details or admin notes", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertSucceeds(getDoc(doc(db, "memberContact", MEMBER)));
    await assertFails(getDoc(doc(db, "memberContact", OTHER_MEMBER)));
    await assertFails(getDoc(doc(db, "memberAdmin", MEMBER)));
  });

  it("can update its own permitted profile fields", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertSucceeds(
      updateDoc(doc(db, "members", MEMBER), {
        displayName: "New Name",
        bio: "A bio",
        privacy: { showInDirectory: false, showEmail: false, showPhone: false },
        updatedAt: new Date(),
      }),
    );
  });

  it("cannot change its own role", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(updateDoc(doc(db, "members", MEMBER), { role: "superadmin" }));
    await assertFails(updateDoc(doc(db, "users", MEMBER), { role: "superadmin" }));
  });

  it("cannot change its own membership status", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    // A value that genuinely differs — a no-op write of an unchanged field
    // produces no diff and is indistinguishable from not touching it at all.
    await assertFails(updateDoc(doc(db, "members", MEMBER), { membershipStatus: "suspended" }));
    await assertFails(updateDoc(doc(db, "users", MEMBER), { membershipStatus: "suspended" }));
  });

  it("cannot reinstate itself after being suspended", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "members", MEMBER), {
        membershipStatus: "suspended",
      });
    });
    // The claim still says active until the token refreshes; the field itself
    // is still not writable.
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(updateDoc(doc(db, "members", MEMBER), { membershipStatus: "active" }));
  });

  it("cannot make itself a public officer or assign itself a position", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(updateDoc(doc(db, "members", MEMBER), { publicOfficer: true }));
    await assertFails(updateDoc(doc(db, "members", MEMBER), { position: "President" }));
    await assertFails(updateDoc(doc(db, "members", MEMBER), { officerOrder: 0 }));
  });

  it("cannot rewrite audit fields", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(updateDoc(doc(db, "members", MEMBER), { createdAt: new Date(0) }));
    await assertFails(updateDoc(doc(db, "members", MEMBER), { joinedAt: new Date(0) }));
  });

  it("cannot edit another member's profile", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(updateDoc(doc(db, "members", OTHER_MEMBER), { displayName: "Hijacked" }));
  });

  it("cannot read or review applications", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(getDoc(doc(db, "applications", "app1")));
    await assertFails(updateDoc(doc(db, "applications", "app1"), { status: "accepted" }));
  });

  it("cannot publish or edit public content", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(setDoc(doc(db, "news", "forged"), FIXTURES.publishedArticle));
    await assertFails(updateDoc(doc(db, "news", "draft"), { published: true }));
    await assertFails(updateDoc(doc(db, "gallery", "pending"), { approved: true }));
    await assertFails(setDoc(doc(db, "rides", "forged"), FIXTURES.publicRide));
    await assertFails(setDoc(doc(db, "announcements", "forged"), FIXTURES.announcement(true)));
  });

  it("cannot forge or erase audit log entries", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(
      setDoc(doc(db, "auditLogs", "forged"), {
        actorId: SUPERADMIN,
        action: "role.change",
        targetType: "member",
        targetId: MEMBER,
        timestamp: new Date(),
      }),
    );
    await assertFails(deleteDoc(doc(db, "auditLogs", "log1")));
    await assertFails(getDoc(doc(db, "auditLogs", "log1")));
  });

  it("can read a member-level document but not an admin-level one", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertSucceeds(getDoc(doc(db, "documents", "member-doc")));
    await assertFails(getDoc(doc(db, "documents", "admin-doc")));
  });

  it("can RSVP once, and changing its mind overwrites the same document", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    const ref = doc(db, "rides", "public-ride", "rsvps", MEMBER);
    await assertSucceeds(setDoc(ref, { response: "going", displayName: "A Member" }));
    await assertSucceeds(setDoc(ref, { response: "maybe", displayName: "A Member" }));
  });

  it("cannot RSVP on another member's behalf", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(
      setDoc(doc(db, "rides", "public-ride", "rsvps", OTHER_MEMBER), { response: "going" }),
    );
  });

  it("cannot record an RSVP response outside the permitted set", async () => {
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(
      setDoc(doc(db, "rides", "public-ride", "rsvps", MEMBER), { response: "definitely" }),
    );
  });

  it("cannot read another member's RSVP", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "rides", "public-ride", "rsvps", OTHER_MEMBER), {
        response: "going",
      });
    });
    const db = as(env, MEMBER, "member", "active").firestore();
    await assertFails(getDoc(doc(db, "rides", "public-ride", "rsvps", OTHER_MEMBER)));
  });
});

/* ================================================================ editor */

describe("an editor", () => {
  it("can manage news and the gallery", async () => {
    const db = as(env, EDITOR, "editor", "active").firestore();
    await assertSucceeds(getDoc(doc(db, "news", "draft")));
    await assertSucceeds(updateDoc(doc(db, "news", "draft"), { published: true }));
    await assertSucceeds(updateDoc(doc(db, "gallery", "pending"), { approved: true }));
    await assertSucceeds(setDoc(doc(db, "gallery", "new"), FIXTURES.approvedPhoto));
  });

  it("can edit public page copy", async () => {
    const db = as(env, EDITOR, "editor", "active").firestore();
    await assertSucceeds(updateDoc(doc(db, "pages", "home"), { sections: { introTitle: "New" } }));
  });

  it("cannot manage members, applications, rides, events or announcements", async () => {
    const db = as(env, EDITOR, "editor", "active").firestore();
    await assertFails(getDoc(doc(db, "applications", "app1")));
    await assertFails(setDoc(doc(db, "rides", "forged"), FIXTURES.publicRide));
    await assertFails(setDoc(doc(db, "events", "forged"), { title: "x" }));
    await assertFails(setDoc(doc(db, "announcements", "forged"), FIXTURES.announcement(true)));
    await assertFails(updateDoc(doc(db, "users", MEMBER), { membershipStatus: "suspended" }));
    await assertFails(updateDoc(doc(db, "members", MEMBER), { position: "President" }));
  });

  it("cannot change global settings", async () => {
    const db = as(env, EDITOR, "editor", "active").firestore();
    await assertFails(updateDoc(doc(db, "settings", "site"), { clubName: "Changed" }));
  });
});

/* ================================================================= admin */

describe("an admin", () => {
  it("can manage club operations", async () => {
    const db = as(env, ADMIN, "admin", "active").firestore();
    await assertSucceeds(getDoc(doc(db, "applications", "app1")));
    await assertSucceeds(updateDoc(doc(db, "applications", "app1"), { status: "reviewing" }));
    await assertSucceeds(updateDoc(doc(db, "contactMessages", "msg1"), { status: "read" }));
    await assertSucceeds(setDoc(doc(db, "rides", "new-ride"), FIXTURES.publicRide));
    await assertSucceeds(setDoc(doc(db, "announcements", "new"), FIXTURES.announcement(true)));
    await assertSucceeds(getDoc(doc(db, "contactMessages", "msg1")));
    await assertSucceeds(getDoc(doc(db, "auditLogs", "log1")));
    await assertSucceeds(getDoc(doc(db, "memberAdmin", MEMBER)));
  });

  it("can set an officer position on a member profile", async () => {
    const db = as(env, ADMIN, "admin", "active").firestore();
    await assertSucceeds(
      updateDoc(doc(db, "members", MEMBER), { position: "Road Captain", publicOfficer: true }),
    );
  });

  it("cannot change a role — even via the member profile mirror", async () => {
    const db = as(env, ADMIN, "admin", "active").firestore();
    await assertFails(updateDoc(doc(db, "users", MEMBER), { role: "admin" }));
    await assertFails(updateDoc(doc(db, "members", MEMBER), { role: "admin" }));
  });

  it("cannot change a membership status directly — that is server-only", async () => {
    const db = as(env, ADMIN, "admin", "active").firestore();
    await assertFails(updateDoc(doc(db, "users", MEMBER), { membershipStatus: "suspended" }));
    await assertFails(updateDoc(doc(db, "members", MEMBER), { membershipStatus: "suspended" }));
  });

  it("cannot change global settings — that is superadmin-only", async () => {
    const db = as(env, ADMIN, "admin", "active").firestore();
    await assertFails(updateDoc(doc(db, "settings", "site"), { clubName: "Changed" }));
  });

  it("cannot rewrite an applicant's own answers or delete the record", async () => {
    const db = as(env, ADMIN, "admin", "active").firestore();
    await assertFails(updateDoc(doc(db, "applications", "app1"), { whyJoin: "Rewritten" }));
    await assertFails(deleteDoc(doc(db, "applications", "app1")));
  });

  it("cannot edit or delete the body of a contact message", async () => {
    const db = as(env, ADMIN, "admin", "active").firestore();
    await assertFails(updateDoc(doc(db, "contactMessages", "msg1"), { message: "Rewritten" }));
    await assertFails(deleteDoc(doc(db, "contactMessages", "msg1")));
  });

  it("cannot forge audit entries", async () => {
    const db = as(env, ADMIN, "admin", "active").firestore();
    await assertFails(setDoc(doc(db, "auditLogs", "forged"), { action: "role.change" }));
    await assertFails(deleteDoc(doc(db, "auditLogs", "log1")));
  });
});

/* ============================================================ superadmin */

describe("a superadmin", () => {
  it("can change global settings", async () => {
    const db = as(env, SUPERADMIN, "superadmin", "active").firestore();
    await assertSucceeds(updateDoc(doc(db, "settings", "site"), { clubName: "MONARCHS MC" }));
  });

  it("still cannot write roles directly — role changes go through trusted server code", async () => {
    const db = as(env, SUPERADMIN, "superadmin", "active").firestore();
    await assertFails(updateDoc(doc(db, "users", MEMBER), { role: "admin" }));
  });

  it("still cannot forge audit entries", async () => {
    const db = as(env, SUPERADMIN, "superadmin", "active").firestore();
    await assertFails(setDoc(doc(db, "auditLogs", "forged"), { action: "role.change" }));
  });
});

/* ===================================================== unknown collection */

describe("the default deny rule", () => {
  it("denies access to a collection the rules do not name", async () => {
    const db = as(env, SUPERADMIN, "superadmin", "active").firestore();
    await assertFails(getDoc(doc(db, "somethingNew", "x")));
    await assertFails(setDoc(doc(db, "somethingNew", "x"), { a: 1 }));
  });
});
