import { expect, test } from "@playwright/test";

/**
 * Visitor journey: homepage → rides → ride detail → join.
 * Also asserts that nothing private is reachable without signing in.
 */
test.describe("visitor", () => {
  test("homepage → rides → ride detail → join", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MONARCHS MC/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/MONARCHS MC/i);

    await page.goto("/rides");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/where we are headed/i);

    const rideLink = page.getByRole("link", { name: /demo: coast run/i }).first();
    await expect(rideLink).toBeVisible();
    await rideLink.click();

    await expect(page).toHaveURL(/\/rides\/demo-coast-run/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/coast run/i);
    // A signed-out visitor is offered sign-in, not an RSVP control.
    await expect(page.getByRole("radiogroup", { name: /rsvp/i })).toHaveCount(0);

    await page.goto("/join");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/apply to ride with us/i);
    await expect(page.getByLabel(/full name/i)).toBeVisible();
  });

  test("does not show members-only rides on the public site", async ({ page }) => {
    await page.goto("/rides");
    await expect(page.getByText(/members only run/i)).toHaveCount(0);

    const response = await page.goto("/rides/demo-members-only-run");
    expect(response?.status()).toBe(404);
  });

  test("does not expose an unpublished article", async ({ page }) => {
    const response = await page.goto("/news/demo-unpublished-draft");
    expect(response?.status()).toBe(404);

    await page.goto("/news");
    await expect(page.getByText(/unpublished draft/i)).toHaveCount(0);
  });

  test("redirects private routes to sign-in", async ({ page }) => {
    for (const path of ["/member/dashboard", "/member/directory", "/admin", "/admin/members"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("refuses private API routes", async ({ page }) => {
    const upload = await page.request.post("/api/admin/upload", {
      multipart: { area: "gallery", file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } },
      failOnStatusCode: false,
    });
    expect(upload.status()).toBe(401);
  });

  test("keeps private areas out of robots.txt and the sitemap", async ({ page }) => {
    const robots = await (await page.request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /member");

    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/member");
    expect(sitemap).toContain("/rides/demo-coast-run");
  });

  test("submits a contact message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel(/your name/i).fill("E2E Visitor");
    await page.getByLabel(/^email/i).fill("e2e-visitor@example.test");
    await page.getByLabel(/what is this about/i).selectOption("General");
    await page.getByLabel(/subject/i).fill("A question from the end-to-end suite");
    await page
      .getByLabel(/message/i)
      .fill("This message was sent by the automated end-to-end test suite.");

    // The form rejects sub-2.5s submissions as automated, so wait it out.
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText(/message sent/i)).toBeVisible({ timeout: 20_000 });
  });

  test("shows a polished 404 for an unknown route", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/wrong turn/i);
  });
});
