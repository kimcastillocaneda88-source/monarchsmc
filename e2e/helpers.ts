import type { Page } from "@playwright/test";

/**
 * Seeded demo accounts. Usernames are what the sign-in form asks for; the
 * addresses are kept because some assertions still look for them on screen.
 */
export const ACCOUNTS = {
  superadmin: {
    username: "superadmin",
    email: "superadmin@monarchs.test",
    password: "monarchs-superadmin-2026",
  },
  admin: { username: "admin", email: "admin@monarchs.test", password: "monarchs-admin-2026" },
  editor: { username: "editor", email: "editor@monarchs.test", password: "monarchs-editor-2026" },
  member: { username: "member", email: "member@monarchs.test", password: "monarchs-member-2026" },
  pending: { username: "pending", email: "pending@monarchs.test", password: "monarchs-pending-2026" },
} as const;

export type AccountName = keyof typeof ACCOUNTS;

/** Signs in through the real form and waits for the session cookie exchange. */
export async function signIn(page: Page, account: AccountName, next?: string): Promise<void> {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Username").fill(ACCOUNTS[account].username);
  await page.getByLabel("Password").fill(ACCOUNTS[account].password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
}

export async function signOut(page: Page): Promise<void> {
  await page.request.delete("/api/auth/session");
  await page.context().clearCookies();
}

/** A unique slug so repeated runs never collide. */
export function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Posts to the upload endpoint from inside the page.
 *
 * Deliberately not Playwright's `page.request`: that runs in a separate
 * context which does not carry the browser's session cookie, so it can only
 * ever prove the unauthenticated case. Running `fetch` in the page is both
 * accurate and a truer simulation of someone bypassing the UI.
 */
export async function uploadFromPage(
  page: Page,
  options: { area: string; fileName: string; mimeType: string; bytes: number[] },
): Promise<{ status: number; body: string }> {
  return page.evaluate(async (opts) => {
    const form = new FormData();
    form.set("area", opts.area);
    form.set(
      "file",
      new File([new Uint8Array(opts.bytes)], opts.fileName, { type: opts.mimeType }),
    );
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    return { status: response.status, body: await response.text() };
  }, options);
}
