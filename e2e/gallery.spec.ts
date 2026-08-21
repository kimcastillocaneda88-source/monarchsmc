import { expect, test } from "@playwright/test";
import { signIn, unique, uploadFromPage } from "./helpers";

/** Editor uploads a gallery image → approves it → it appears in the public gallery. */
test.describe("gallery", () => {
  // A minimal but genuine 1x1 JPEG, so the server's magic-byte check passes.
  const JPEG = Buffer.from(
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
    "base64",
  );

  test("upload → approve → visible publicly", async ({ page }) => {
    const title = `E2E Photo ${unique("g")}`;
    await signIn(page, "editor");
    await page.goto("/admin/gallery");

    await page.getByLabel(/^photograph/i).setInputFiles({
      name: "e2e.jpg",
      mimeType: "image/jpeg",
      buffer: JPEG,
    });

    // Wait for the upload to report a stored path before saving metadata.
    await expect(page.getByRole("button", { name: /^remove$/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel(/^title/i).fill(title);
    await page.getByLabel(/image description/i).fill("A photograph uploaded by the test suite");
    await page.getByLabel(/^category/i).selectOption("rides");
    await page.getByLabel(/approved/i).check();

    await page.getByRole("button", { name: /add photograph/i }).click();
    await expect(page.getByText(/photograph added/i)).toBeVisible({ timeout: 30_000 });

    await page.goto("/gallery");
    await expect(page.getByRole("button", { name: new RegExp(title, "i") })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("rejects a file that is not really an image", async ({ page }) => {
    await signIn(page, "editor");

    // A shell script renamed to .jpg and declared as image/jpeg. The filename
    // and the declared MIME type both say "image"; the leading bytes do not,
    // and the server believes the bytes.
    const response = await uploadFromPage(page, {
      area: "gallery",
      fileName: "payload.jpg",
      mimeType: "image/jpeg",
      bytes: Array.from(new TextEncoder().encode("#!/bin/sh\necho pwned\n")),
    });

    expect(response.status).toBe(415);
    expect(response.body).toMatch(/not a supported image/i);
  });
});
