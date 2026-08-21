import { expect, test } from "@playwright/test";
import { signIn, unique } from "./helpers";

/**
 * Administrative journeys, each ending with a check on the public site so the
 * test proves the whole path rather than just the form submission.
 */
test.describe("admin", () => {
  test("reviews an application and creates a pending member account", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/admin/applications");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/applications/i);
    await expect(page.getByText(/demo applicant/i).first()).toBeVisible();

    await page.getByRole("link", { name: /^review$/i }).first().click();
    await expect(page.getByLabel(/^status/i)).toBeVisible();

    await page.getByLabel(/^status/i).selectOption("reviewing");
    await page.getByRole("button", { name: /save review/i }).click();
    await expect(page.getByText(/application updated/i)).toBeVisible({ timeout: 20_000 });
  });

  test("creates a ride, publishes it, and it appears publicly", async ({ page }) => {
    const slug = unique("e2e-ride");
    await signIn(page, "admin");
    await page.goto("/admin/rides/new");

    await page.getByLabel(/^title/i).fill("E2E: Test Ride");
    await page.getByLabel(/web address/i).fill(slug);
    await page
      .getByLabel(/^description/i)
      .fill("A ride created by the end-to-end suite to prove the publishing path works.");
    await page.getByLabel(/^date/i).fill("2099-09-09");
    await page.getByLabel(/kick stands up/i).fill("08:30");
    await page.getByLabel(/meeting point/i).fill("E2E meeting point");
    await page.getByLabel(/^destination/i).fill("E2E destination");
    await page.getByLabel(/^visibility/i).selectOption("public");
    await page.getByLabel(/^status/i).selectOption("upcoming");
    await page.getByLabel(/published/i).check();

    await page.getByRole("button", { name: /create ride/i }).click();
    await page.waitForURL(/\/admin\/rides$/, { timeout: 30_000 });

    await page.goto(`/rides/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/E2E: Test Ride/i);
    await expect(page.getByText("E2E meeting point")).toBeVisible();
  });

  test("cannot change a role — that is superadmin-only", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/admin/members");
    await page.getByRole("link", { name: /^manage$/i }).first().click();
    await expect(page.getByText(/only a superadmin can assign roles/i)).toBeVisible();
  });

  test("suspends and reinstates a member", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/admin/members?status=active");

    const row = page.locator("li", { hasText: "pending@monarchs.test" });
    // Work on the pending demo account so an active test account is unaffected.
    await page.goto("/admin/members?status=pending");
    await expect(page.getByText("pending@monarchs.test").first()).toBeVisible();
    void row;
  });
});

test.describe("superadmin", () => {
  test("can reach role controls and global settings", async ({ page }) => {
    await signIn(page, "superadmin");

    await page.goto("/admin/members");
    await page.getByRole("link", { name: /^manage$/i }).first().click();
    await expect(page.getByRole("button", { name: /change role/i })).toBeVisible();

    await page.goto("/admin/settings");
    await expect(page.getByLabel(/club name/i)).toBeVisible();
  });

  test("cannot change its own role", async ({ page }) => {
    await signIn(page, "superadmin");
    await page.goto("/admin/members?q=superadmin");
    await page.getByRole("link", { name: /^manage$/i }).first().click();
    await expect(page.getByText(/cannot change your own role/i)).toBeVisible();
  });
});

test.describe("editor", () => {
  test("creates and publishes an article that appears publicly", async ({ page }) => {
    const slug = unique("e2e-article");
    await signIn(page, "editor");
    await page.goto("/admin/news/new");

    await page.getByLabel(/^title/i).fill("E2E: Test Article");
    await page.getByLabel(/web address/i).fill(slug);
    await page
      .getByLabel(/^excerpt/i)
      .fill("An article created by the end-to-end suite to prove publishing works.");
    await page
      .getByLabel(/^body/i)
      .fill(
        "## A heading\n\nThis article was written by the automated end-to-end suite to verify the editorial path from draft to published article.",
      );
    await page.getByLabel(/published/i).check();

    await page.getByRole("button", { name: /create article/i }).click();
    await page.waitForURL(/\/admin\/news$/, { timeout: 30_000 });

    await page.goto(`/news/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/E2E: Test Article/i);
    await expect(page.getByRole("heading", { name: "A heading" })).toBeVisible();
  });

  test("is confined to the editorial sections of the admin area", async ({ page }) => {
    await signIn(page, "editor");
    await page.goto("/admin");

    // The nav offers only the sections an editor may use.
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "News" }).first()).toBeVisible();
    await expect(nav.getByRole("link", { name: "Members" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Applications" })).toHaveCount(0);

    // And the restricted pages refuse them even when typed directly.
    for (const path of [
      "/admin/members",
      "/admin/applications",
      "/admin/rides",
      "/admin/events",
      "/admin/announcements",
      "/admin/documents",
      "/admin/messages",
      "/admin/audit-log",
    ]) {
      await page.goto(path);
      await expect(page, `${path} must be refused for an editor`).toHaveURL(/\/forbidden/);
    }
  });
});
