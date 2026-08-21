import { describe, expect, it } from "vitest";
import {
  applicationSchema,
  contactSchema,
  isoDateSchema,
  memberProfileSchema,
  newsSchema,
  passwordSchema,
  rideSchema,
  rsvpSchema,
  slugSchema,
  timeSchema,
  fieldErrorsOf,
} from "@/lib/validation/schemas";

describe("primitive schemas", () => {
  it("accepts only slug-safe strings", () => {
    expect(slugSchema.safeParse("spring-run-2026").success).toBe(true);
    expect(slugSchema.safeParse("Spring Run").success).toBe(false);
    expect(slugSchema.safeParse("-leading").success).toBe(false);
    expect(slugSchema.safeParse("double--hyphen").success).toBe(false);
    expect(slugSchema.safeParse("../../etc/passwd").success).toBe(false);
  });

  it("accepts only real ISO dates", () => {
    expect(isoDateSchema.safeParse("2026-04-18").success).toBe(true);
    expect(isoDateSchema.safeParse("18-04-2026").success).toBe(false);
    expect(isoDateSchema.safeParse("2026-13-01").success).toBe(false);
  });

  it("accepts only 24-hour times", () => {
    expect(timeSchema.safeParse("09:30").success).toBe(true);
    expect(timeSchema.safeParse("23:59").success).toBe(true);
    expect(timeSchema.safeParse("24:00").success).toBe(false);
    expect(timeSchema.safeParse("9:30").success).toBe(false);
  });

  it("requires a password of at least 12 characters", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("a-long-enough-password").success).toBe(true);
  });
});

describe("membership application", () => {
  const valid = {
    fullName: "A Rider",
    preferredName: "",
    email: "Rider@Example.COM",
    phone: "+44 7700 900000",
    location: "Manchester",
    motorcycle: "Triumph Bonneville T120",
    ridingExperience: "experienced",
    yearsRiding: "12",
    whyJoin:
      "I have been riding for over a decade and I am looking for a club that takes the road seriously.",
    howHeard: "A friend",
    website: "",
    elapsedMs: "9000",
    consent: true,
  };

  it("accepts a complete application and normalises the email", () => {
    const result = applicationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("rider@example.com");
      expect(result.data.yearsRiding).toBe(12);
      expect(result.data.preferredName).toBeNull();
    }
  });

  it("requires explicit consent", () => {
    const result = applicationSchema.safeParse({ ...valid, consent: false });
    expect(result.success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    const result = applicationSchema.safeParse({ ...valid, website: "http://spam.example" });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short statement of intent", () => {
    const result = applicationSchema.safeParse({ ...valid, whyJoin: "bikes" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrorsOf(result.error))).toContain("whyJoin");
    }
  });
});

describe("contact message", () => {
  it("rejects an unknown category", () => {
    const result = contactSchema.safeParse({
      name: "A Rider",
      email: "rider@example.com",
      subject: "Question",
      category: "Injection",
      message: "This is a message long enough to pass validation.",
    });
    expect(result.success).toBe(false);
  });
});

describe("member profile — field-level protection", () => {
  const base = {
    displayName: "A Rider",
    nickname: "",
    motorcycle: "",
    bio: "",
    chapter: "",
    ridingSince: "",
    showInDirectory: true,
    showEmail: false,
    showPhone: false,
    phone: "",
    location: "",
  };

  it("accepts the permitted fields", () => {
    expect(memberProfileSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ["role", "superadmin"],
    ["membershipStatus", "active"],
    ["publicOfficer", true],
    ["position", "President"],
    ["officerOrder", 0],
    ["createdAt", 0],
    ["approvedBy", "someone"],
  ])("rejects an attempt to smuggle %s", (key, value) => {
    const result = memberProfileSchema.safeParse({ ...base, [key]: value });
    expect(result.success).toBe(false);
  });
});

describe("rsvp", () => {
  it("accepts only the three defined responses", () => {
    for (const response of ["going", "maybe", "not_going"]) {
      expect(rsvpSchema.safeParse({ rideId: "r1", response }).success).toBe(true);
    }
    expect(rsvpSchema.safeParse({ rideId: "r1", response: "definitely" }).success).toBe(false);
  });
});

describe("ride", () => {
  const valid = {
    title: "Spring Run",
    slug: "spring-run",
    description: "A description that is comfortably long enough to satisfy the schema.",
    date: "2026-04-18",
    startTime: "09:00",
    meetingPoint: "The usual place",
    destination: "The coast",
    distanceKm: "180",
    status: "upcoming",
    visibility: "public",
    published: true,
  };

  it("accepts a valid ride and coerces the distance", () => {
    const result = rideSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.distanceKm).toBe(180);
  });

  it("treats an empty distance as absent rather than zero", () => {
    const result = rideSchema.safeParse({ ...valid, distanceKm: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.distanceKm).toBeNull();
  });

  it("rejects an unknown status or visibility", () => {
    expect(rideSchema.safeParse({ ...valid, status: "secret" }).success).toBe(false);
    expect(rideSchema.safeParse({ ...valid, visibility: "everyone" }).success).toBe(false);
  });
});

describe("news article", () => {
  it("rejects an unknown category", () => {
    const result = newsSchema.safeParse({
      title: "A report",
      slug: "a-report",
      excerpt: "An excerpt that is long enough to pass validation checks.",
      body: "A body that is comfortably longer than the fifty character minimum imposed by the schema.",
      category: "Sponsored",
      published: true,
    });
    expect(result.success).toBe(false);
  });
});
