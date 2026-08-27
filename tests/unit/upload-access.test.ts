import { describe, expect, it } from "vitest";
import { canUploadMedia, type Principal } from "@/lib/auth/roles";
import {
  accessRequestSchema,
  maxBytesForKind,
  usernameCandidateFrom,
  usernameSchema,
} from "@/lib/validation/schemas";
import { detectImage, detectVideo, detectDocument } from "@/lib/storage/validate";
import type { MembershipStatus, Role } from "@/types";

function principal(
  role: Role,
  membershipStatus: MembershipStatus = "active",
  uploadAccess = false,
): Principal {
  return { uid: "u1", role, membershipStatus, uploadAccess };
}

describe("upload permission", () => {
  it("refuses a member who has not been granted it", () => {
    expect(canUploadMedia(principal("member"))).toBe(false);
  });

  it("allows a member the administrator has granted it to", () => {
    expect(canUploadMedia(principal("member", "active", true))).toBe(true);
  });

  it("allows editors and above without an explicit grant", () => {
    expect(canUploadMedia(principal("editor"))).toBe(true);
    expect(canUploadMedia(principal("admin"))).toBe(true);
    expect(canUploadMedia(principal("superadmin"))).toBe(true);
  });

  it("refuses an account that is not active, grant or no grant", () => {
    // Revoking membership must end uploading even if the grant is still on the
    // record — otherwise a suspension would leave a way back in.
    expect(canUploadMedia(principal("member", "pending", true))).toBe(false);
    expect(canUploadMedia(principal("member", "suspended", true))).toBe(false);
    expect(canUploadMedia(principal("member", "inactive", true))).toBe(false);
    expect(canUploadMedia(principal("editor", "suspended"))).toBe(false);
    expect(canUploadMedia(principal("admin", "suspended", true))).toBe(false);
  });

  it("treats a missing grant as no grant", () => {
    // Accounts created before the permission existed have no such field.
    const legacy: Principal = { uid: "u2", role: "member", membershipStatus: "active" };
    expect(canUploadMedia(legacy)).toBe(false);
  });
});

describe("usernames", () => {
  it("lowercases so one name cannot become two accounts", () => {
    expect(usernameSchema.parse("RoadCaptain")).toBe("roadcaptain");
    expect(usernameSchema.parse("  Prez  ")).toBe("prez");
  });

  it("accepts the documented character set", () => {
    for (const value of ["ace", "road_captain", "prez.1", "a-b-c", "member99"]) {
      expect(usernameSchema.safeParse(value).success).toBe(true);
    }
  });

  it("rejects names that would be unsafe as a document id or ambiguous", () => {
    for (const value of ["ab", "a".repeat(25), "has space", "slash/es", ".leading", "trailing-", "no#hash"]) {
      expect(usernameSchema.safeParse(value).success).toBe(false);
    }
  });

  it("derives a usable candidate from arbitrary text", () => {
    expect(usernameCandidateFrom("Road Captain")).toBe("road-captain");
    expect(usernameCandidateFrom("  José's Bike!  ")).toBe("jose-s-bike");
    expect(usernameCandidateFrom("!!!")).toBe("");
  });
});

describe("access requests", () => {
  const valid = {
    username: "newrider",
    displayName: "New Rider",
    email: "New.Rider@example.com",
    password: "a-long-enough-password",
    confirmPassword: "a-long-enough-password",
  };

  it("accepts a complete request and normalises the email", () => {
    const parsed = accessRequestSchema.parse(valid);
    expect(parsed.email).toBe("new.rider@example.com");
    expect(parsed.username).toBe("newrider");
  });

  it("rejects mismatched passwords against the confirmation field", () => {
    const result = accessRequestSchema.safeParse({ ...valid, confirmPassword: "something-else" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects a short password", () => {
    const short = "abc123";
    expect(
      accessRequestSchema.safeParse({ ...valid, password: short, confirmPassword: short }).success,
    ).toBe(false);
  });
});

/** Builds a buffer with the given leading bytes, padded to a sniffable length. */
function bytes(...leading: number[]): Uint8Array {
  const buffer = new Uint8Array(32);
  buffer.set(leading, 0);
  return buffer;
}

const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

describe("video detection", () => {
  it("identifies WebM from the EBML magic number", () => {
    expect(detectVideo(bytes(0x1a, 0x45, 0xdf, 0xa3))).toEqual({
      mime: "video/webm",
      extension: "webm",
    });
  });

  it("identifies MP4 from its ftyp box", () => {
    expect(detectVideo(bytes(0, 0, 0, 0x20, ...ascii("ftypisom")))).toEqual({
      mime: "video/mp4",
      extension: "mp4",
    });
  });

  it("identifies QuickTime by its brand", () => {
    expect(detectVideo(bytes(0, 0, 0, 0x14, ...ascii("ftypqt  ")))).toEqual({
      mime: "video/quicktime",
      extension: "mov",
    });
  });

  it("does not claim AVIF as video, though it is also an ftyp container", () => {
    const avif = bytes(0, 0, 0, 0x20, ...ascii("ftypavif"));
    expect(detectVideo(avif)).toBeNull();
    expect(detectImage(avif)).toEqual({ mime: "image/avif", extension: "avif" });
  });

  it("rejects an image or a document offered as video", () => {
    expect(detectVideo(bytes(0xff, 0xd8, 0xff))).toBeNull();
    expect(detectVideo(bytes(...ascii("%PDF-1.7")))).toBeNull();
  });

  it("rejects a buffer too short to identify", () => {
    expect(detectVideo(new Uint8Array([0x1a, 0x45]))).toBeNull();
  });

  it("leaves the existing image and document detection intact", () => {
    expect(detectImage(bytes(0xff, 0xd8, 0xff))).toEqual({ mime: "image/jpeg", extension: "jpg" });
    expect(detectDocument(bytes(...ascii("%PDF-1.7")), "application/pdf")).toEqual({
      mime: "application/pdf",
      extension: "pdf",
    });
  });
});

describe("size ceilings", () => {
  it("gives video far more room than images, since it bypasses the request body limit", () => {
    expect(maxBytesForKind("video")).toBeGreaterThan(maxBytesForKind("image"));
    expect(maxBytesForKind("video")).toBeGreaterThan(maxBytesForKind("file"));
  });
});
