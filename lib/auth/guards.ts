import "server-only";

import { redirect } from "next/navigation";
import { getSessionUser } from "./session";
import { ForbiddenError, UnauthorizedError } from "./errors";
import {
  canAccessAdminArea,
  canManageAdministrators,
  canManageClub,
  canManageContent,
  canUploadMedia,
  hasRoleAtLeast,
  isActiveMember,
  type Principal,
} from "./roles";
import type { Role, SessionUser } from "@/types";

/**
 * Authorization guards for trusted server code.
 *
 * The Admin SDK bypasses Security Rules, so every server action and route
 * handler that touches privileged data must start with one of these.
 */

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireActiveMember(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isActiveMember(user)) {
    throw new ForbiddenError("Your membership is not active. Contact a club officer.");
  }
  return user;
}

export async function requireRole(minimum: Role): Promise<SessionUser> {
  const user = await requireActiveMember();
  if (!hasRoleAtLeast(user.role, minimum)) throw new ForbiddenError();
  return user;
}

export async function requireContentManager(): Promise<SessionUser> {
  const user = await requireSession();
  if (!canManageContent(user as Principal)) throw new ForbiddenError();
  return user;
}

export async function requireClubManager(): Promise<SessionUser> {
  const user = await requireSession();
  if (!canManageClub(user as Principal)) throw new ForbiddenError();
  return user;
}

/**
 * Requires the administrator-granted permission to contribute media.
 *
 * Checked afresh on every request from users/{uid} rather than from the
 * session cookie, so revoking the grant stops the next upload rather than the
 * one after the token expires.
 */
export async function requireUploader(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isActiveMember(user)) {
    throw new ForbiddenError("Your membership is not active. Contact a club officer.");
  }
  if (!canUploadMedia(user as Principal)) {
    throw new ForbiddenError("You have not been granted permission to upload.");
  }
  return user;
}

export async function requireSuperadmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!canManageAdministrators(user as Principal)) throw new ForbiddenError();
  return user;
}

export async function requireAdminArea(): Promise<SessionUser> {
  const user = await requireSession();
  if (!canAccessAdminArea(user as Principal)) throw new ForbiddenError();
  return user;
}

/* ---- page-level variants: redirect rather than throw ------------------- */

export async function requireSessionPage(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireActiveMemberPage(returnTo: string): Promise<SessionUser> {
  const user = await requireSessionPage(returnTo);
  if (!isActiveMember(user)) redirect("/member/pending");
  return user;
}

export async function requireAdminAreaPage(returnTo: string): Promise<SessionUser> {
  const user = await requireSessionPage(returnTo);
  if (!canAccessAdminArea(user as Principal)) redirect("/forbidden");
  return user;
}

export async function requireClubManagerPage(returnTo: string): Promise<SessionUser> {
  const user = await requireSessionPage(returnTo);
  if (!canManageClub(user as Principal)) redirect("/forbidden");
  return user;
}

export async function requireUploaderPage(returnTo: string): Promise<SessionUser> {
  const user = await requireActiveMemberPage(returnTo);
  if (!canUploadMedia(user as Principal)) redirect("/member/no-upload-access");
  return user;
}

export async function requireSuperadminPage(returnTo: string): Promise<SessionUser> {
  const user = await requireSessionPage(returnTo);
  if (!canManageAdministrators(user as Principal)) redirect("/forbidden");
  return user;
}
