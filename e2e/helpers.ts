import type { Page } from "@playwright/test";

export const ACCOUNTS = {
  superadmin: { email: "superadmin@monarchs.test", password: "monarchs-superadmin-2026" },
  admin: { email: "admin@monarchs.test", password: "monarchs-admin-2026" },
  editor: { email: "editor@monarchs.test", password: "monarchs-editor-2026" },
  member: { email: "member@monarchs.test", password: "monarchs-member-2026" },
  pending: { email: "pending@monarchs.test", password: "monarchs-pending-2026" },
} as const;

export type AccountName = keyof typeof ACCOUNTS;

/** Signs in through the real form and waits for the session cookie exchange. */
export async function signIn(page: Page, account: AccountName, next?: string): Promise<void> {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Email").fill(ACCOUNTS[account].email);
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
