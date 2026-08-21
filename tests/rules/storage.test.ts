import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Storage Security Rules.
 *
 * The posture under test: public imagery is readable by anyone, everything else
 * is readable by nobody, and NO client may write anywhere. Uploads must go
 * through /api/admin/upload, which authenticates, authorises, rate-limits and
 * content-sniffs — rules that allowed a direct client write would let all of
 * that be skipped.
 */

let env: RulesTestEnvironment;

const IMAGE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "monarchs-mc-test",
    storage: {
      rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });

  await env.withSecurityRulesDisabled(async (context) => {
    const storage = context.storage();
    await uploadBytes(ref(storage, "gallery/photo.jpg"), IMAGE, { contentType: "image/jpeg" });
    await uploadBytes(ref(storage, "news/cover.jpg"), IMAGE, { contentType: "image/jpeg" });
    await uploadBytes(ref(storage, "rides/cover.jpg"), IMAGE, { contentType: "image/jpeg" });
    await uploadBytes(ref(storage, "events/cover.jpg"), IMAGE, { contentType: "image/jpeg" });
    await uploadBytes(ref(storage, "members/member-uid/avatar.jpg"), IMAGE, {
      contentType: "image/jpeg",
    });
    await uploadBytes(ref(storage, "documents/handbook.pdf"), IMAGE, {
      contentType: "application/pdf",
    });
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe("public imagery", () => {
  it("is readable without signing in", async () => {
    const storage = env.unauthenticatedContext().storage();
    for (const path of ["gallery/photo.jpg", "news/cover.jpg", "rides/cover.jpg", "events/cover.jpg"]) {
      await assertSucceeds(getBytes(ref(storage, path)));
    }
  });
});

describe("private areas", () => {
  it("denies an unauthenticated read of a member photograph", async () => {
    const storage = env.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(storage, "members/member-uid/avatar.jpg")));
  });

  it("denies a member reading their own photograph directly — the API serves it", async () => {
    const storage = env
      .authenticatedContext("member-uid", { role: "member", membershipStatus: "active" })
      .storage();
    await assertFails(getBytes(ref(storage, "members/member-uid/avatar.jpg")));
  });

  it("denies reading a private document even knowing its exact path", async () => {
    const anon = env.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(anon, "documents/handbook.pdf")));

    const member = env
      .authenticatedContext("member-uid", { role: "member", membershipStatus: "active" })
      .storage();
    await assertFails(getBytes(ref(member, "documents/handbook.pdf")));

    const admin = env
      .authenticatedContext("admin-uid", { role: "admin", membershipStatus: "active" })
      .storage();
    await assertFails(getBytes(ref(admin, "documents/handbook.pdf")));
  });
});

describe("uploads", () => {
  it("denies an unauthenticated upload anywhere", async () => {
    const storage = env.unauthenticatedContext().storage();
    await assertFails(uploadBytes(ref(storage, "gallery/evil.jpg"), IMAGE));
    await assertFails(uploadBytes(ref(storage, "documents/evil.pdf"), IMAGE));
    await assertFails(uploadBytes(ref(storage, "members/member-uid/evil.jpg"), IMAGE));
  });

  it("denies a member uploading directly, bypassing content validation", async () => {
    const storage = env
      .authenticatedContext("member-uid", { role: "member", membershipStatus: "active" })
      .storage();
    await assertFails(uploadBytes(ref(storage, "members/member-uid/avatar.jpg"), IMAGE));
    await assertFails(uploadBytes(ref(storage, "gallery/evil.jpg"), IMAGE));
  });

  it("denies an editor or admin uploading directly", async () => {
    const editor = env
      .authenticatedContext("editor-uid", { role: "editor", membershipStatus: "active" })
      .storage();
    await assertFails(uploadBytes(ref(editor, "gallery/evil.jpg"), IMAGE));

    const admin = env
      .authenticatedContext("admin-uid", { role: "admin", membershipStatus: "active" })
      .storage();
    await assertFails(uploadBytes(ref(admin, "documents/evil.pdf"), IMAGE));
  });

  it("denies a superadmin writing outside the defined areas", async () => {
    const storage = env
      .authenticatedContext("root-uid", { role: "superadmin", membershipStatus: "active" })
      .storage();
    await assertFails(uploadBytes(ref(storage, "anything-else/evil.jpg"), IMAGE));
    await assertFails(getBytes(ref(storage, "anything-else/evil.jpg")));
  });
});
