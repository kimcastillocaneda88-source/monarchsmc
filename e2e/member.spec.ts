import { expect, test } from "@playwright/test";
import { signIn, uploadFromPage } from "./helpers";

/**
 * Member journeys: sign in → dashboard → ride → RSVP, profile editing, and
 * confirmation that a member cannot reach administrative functions.
 */
test.describe("member", () => {
  test("signs in and reaches the dashboard", async ({ page }) => {
    await signIn(page, "member");
    await expect(page).toHaveURL(/\/member\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/welcome back/i);
  });

  test("sees a members-only ride that the public site hides", async ({ page }) => {
    await signIn(page, "member");
    await page.goto("/member/rides");
    await expect(page.getByText(/members only run/i).first()).toBeVisible();
  });

  test("RSVPs to a ride, and the response is idempotent", async ({ page }) => {
    await signIn(page, "member");
    await page.goto("/rides/demo-coast-run");

    const group = page.getByRole("radiogroup", { name: /rsvp/i });
    await expect(group).toBeVisible();

    await group.getByRole("radio", { name: "Going", exact: true }).click();
    await expect(page.getByText(/your response has been recorded/i)).toBeVisible({ timeout: 20_000 });

    // Reload: the choice persists as a single record.
    await page.reload();
    await expect(
      page.getByRole("radiogroup", { name: /rsvp/i }).getByRole("radio", { name: "Going", exact: true }),
    ).toHaveAttribute("aria-checked", "true");

    // Changing the answer updates the same record rather than adding another.
    await page
      .getByRole("radiogroup", { name: /rsvp/i })
      .getByRole("radio", { name: "Maybe", exact: true })
      .click();
    await expect(page.getByText(/your response has been recorded/i)).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(
      page.getByRole("radiogroup", { name: /rsvp/i }).getByRole("radio", { name: "Maybe", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
  });

  test("edits an allowed profile field and saves it", async ({ page }) => {
    await signIn(page, "member");
    await page.goto("/member/profile");

    const nickname = page.getByLabel(/road name/i);
    const value = `E2E ${Date.now().toString(36)}`;
    await nickname.fill(value);
    await page.getByRole("button", { name: /save profile/i }).click();

    await expect(page.getByText(/your profile has been saved/i)).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByLabel(/road name/i)).toHaveValue(value);
  });

  test("cannot edit membership status or role from the profile page", async ({ page }) => {
    await signIn(page, "member");
    await page.goto("/member/profile");
    // They are rendered as read-only facts, not as form controls.
    await expect(page.getByLabel(/membership status/i)).toHaveCount(0);
    await expect(page.getByLabel(/^role$/i)).toHaveCount(0);
  });

  test("is refused administrative pages and actions", async ({ page }) => {
    await signIn(page, "member");

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/forbidden/);

    await page.goto("/admin/members");
    await expect(page).toHaveURL(/\/forbidden/);

    // Bypassing the UI entirely: the endpoint must refuse an area this
    // member's role does not reach, even with a valid session.
    const upload = await uploadFromPage(page, {
      area: "documents",
      fileName: "x.pdf",
      mimeType: "application/pdf",
      bytes: [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34],
    });
    expect(upload.status).toBe(403);
    expect(upload.body).toMatch(/cannot upload documents/i);
  });

  test("can read the directory and announcements", async ({ page }) => {
    await signIn(page, "member");

    await page.goto("/member/announcements");
    await expect(page.getByText(/members notice/i).first()).toBeVisible();

    await page.goto("/member/directory");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/directory/i);
  });

  test("signs out and loses access", async ({ page }) => {
    await signIn(page, "member");
    await page.goto("/member/settings");
    await page.getByRole("button", { name: /sign out of this device/i }).click();
    await page.waitForURL("/", { timeout: 20_000 });

    await page.goto("/member/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("a pending account", () => {
  test("is held at the status page and cannot reach member content", async ({ page }) => {
    await signIn(page, "pending");
    await expect(page).toHaveURL(/\/member\/pending/);
    await expect(page.getByText(/membership is not active/i)).toBeVisible();

    await page.goto("/member/directory");
    await expect(page).toHaveURL(/\/member\/pending/);

    await page.goto("/member/announcements");
    await expect(page).toHaveURL(/\/member\/pending/);
  });
});
