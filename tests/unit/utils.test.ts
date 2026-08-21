import { describe, expect, it } from "vitest";
import {
  formatDistance,
  formatIsoDate,
  formatTime,
  initialsOf,
  isUpcoming,
  readingTimeMinutes,
  safeNextPath,
  slugify,
  truncate,
} from "@/lib/utils";
import { isRenderableImageUrl } from "@/lib/images";
import { markdownToPlainText } from "@/lib/markdown";
import { detectDocument, detectImage, safeObjectName } from "@/lib/storage/validate";

describe("slugify", () => {
  it("produces URL-safe slugs", () => {
    expect(slugify("Spring Run 2026")).toBe("spring-run-2026");
    expect(slugify("  Coast & Moors  ")).toBe("coast-moors");
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
  });
});

describe("date handling", () => {
  it("renders an ISO date without a timezone shift", () => {
    // Rendered at UTC noon so no timezone can move it to the previous day.
    expect(formatIsoDate("2026-01-01")).toContain("2026");
    expect(formatIsoDate("2026-01-01")).toContain("1");
  });

  it("treats today as upcoming and yesterday as past", () => {
    const now = new Date("2026-04-18T12:00:00Z");
    expect(isUpcoming("2026-04-18", now)).toBe(true);
    expect(isUpcoming("2026-04-19", now)).toBe(true);
    expect(isUpcoming("2026-04-17", now)).toBe(false);
  });

  it("rejects a malformed time", () => {
    expect(formatTime("09:30")).toBe("09:30");
    expect(formatTime("9:3")).toBe("—");
  });
});

describe("formatDistance", () => {
  it("hides an unknown or zero distance", () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(0)).toBeNull();
    expect(formatDistance(180)).toBe("180 km");
  });
});

describe("safeNextPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/member/rides")).toBe("/member/rides");
  });

  it("rejects open-redirect attempts", () => {
    expect(safeNextPath("//evil.example/steal")).toBe("/member/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/member/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/member/dashboard");
    expect(safeNextPath(null)).toBe("/member/dashboard");
  });
});

describe("isRenderableImageUrl", () => {
  it("accepts only configured Firebase Storage hosts over https", () => {
    expect(isRenderableImageUrl("https://storage.googleapis.com/bucket/gallery/a.jpg")).toBe(true);
    expect(isRenderableImageUrl("https://firebasestorage.googleapis.com/v0/b/x/o/y")).toBe(true);
    expect(isRenderableImageUrl("https://my-app.firebasestorage.app/a.jpg")).toBe(true);
  });

  it("rejects other hosts, protocols and junk", () => {
    expect(isRenderableImageUrl("https://evil.example/a.jpg")).toBe(false);
    expect(isRenderableImageUrl("http://storage.googleapis.com/a.jpg")).toBe(false);
    expect(isRenderableImageUrl("javascript:alert(1)")).toBe(false);
    expect(isRenderableImageUrl(null)).toBe(false);
    expect(isRenderableImageUrl("")).toBe(false);
  });
});

describe("text helpers", () => {
  it("truncates with an ellipsis only when needed", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a much longer string", 10)).toHaveLength(10);
  });

  it("derives initials", () => {
    expect(initialsOf("Sam Whitfield")).toBe("SW");
    expect(initialsOf("Sam")).toBe("SA");
    expect(initialsOf("   ")).toBe("M");
  });

  it("estimates reading time of at least one minute", () => {
    expect(readingTimeMinutes("one two three")).toBe(1);
    expect(readingTimeMinutes("word ".repeat(660))).toBe(3);
  });

  it("strips markdown for plain-text previews", () => {
    const text = markdownToPlainText("## Heading\n\nSome **bold** copy with a [link](https://x.test).");
    expect(text).not.toContain("**");
    expect(text).not.toContain("##");
    expect(text).toContain("bold");
    expect(text).toContain("link");
  });
});

describe("upload content sniffing", () => {
  function bytes(...values: number[]): Uint8Array {
    const out = new Uint8Array(32);
    values.forEach((value, index) => {
      out[index] = value;
    });
    return out;
  }

  it("identifies real image signatures", () => {
    expect(detectImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe("image/jpeg");
    expect(detectImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))?.mime).toBe("image/png");
  });

  it("rejects a file that only claims to be an image", () => {
    // A PHP/HTML payload renamed to .jpg has no image signature.
    const payload = new TextEncoder().encode("<?php system($_GET['c']); ?>            ");
    expect(detectImage(payload)).toBeNull();
  });

  it("rejects a script disguised with a document extension", () => {
    const payload = new TextEncoder().encode("#!/bin/sh\nrm -rf /\n");
    expect(detectDocument(payload, "application/pdf")).toBeNull();
  });

  it("identifies a PDF by signature", () => {
    expect(detectDocument(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "application/pdf")?.mime).toBe(
      "application/pdf",
    );
  });

  it("never lets a client filename become a path", () => {
    const name = safeObjectName("../../../etc/passwd.jpg", "jpg");
    expect(name).not.toContain("/");
    expect(name).not.toContain("..");
    expect(name.endsWith(".jpg")).toBe(true);
  });

  it("always produces a usable name even from a hostile filename", () => {
    const name = safeObjectName("...", "png");
    expect(name.startsWith("file-")).toBe(true);
    expect(name.endsWith(".png")).toBe(true);
  });
});
