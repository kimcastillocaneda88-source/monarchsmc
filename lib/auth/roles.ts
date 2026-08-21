import type { MembershipStatus, Role } from "@/types";

/**
 * Central authorization model.
 *
 * Every server route, server action and Security Rule derives its decisions
 * from the predicates in this file so that the UI, the API layer and the
 * database rules cannot drift apart.
 */

const ROLE_RANK: Record<Role, number> = {
  member: 1,
  editor: 2,
  admin: 3,
  superadmin: 4,
};

export function roleRank(role: Role): number {
  return ROLE_RANK[role] ?? 0;
}

export function hasRoleAtLeast(role: Role, minimum: Role): boolean {
  return roleRank(role) >= roleRank(minimum);
}

export interface Principal {
  uid: string;
  role: Role;
  membershipStatus: MembershipStatus;
}

/** An account that may use the member portal at all. */
export function isActiveMember(p: Pick<Principal, "membershipStatus">): boolean {
  return p.membershipStatus === "active";
}

/** Editors and above may manage public editorial content (news, gallery, pages). */
export function canManageContent(p: Principal): boolean {
  return isActiveMember(p) && hasRoleAtLeast(p.role, "editor");
}

/** Admins and above may manage club operations. */
export function canManageClub(p: Principal): boolean {
  return isActiveMember(p) && hasRoleAtLeast(p.role, "admin");
}

/** Superadmins only: role assignment and global configuration. */
export function canManageAdministrators(p: Principal): boolean {
  return isActiveMember(p) && p.role === "superadmin";
}

/** Anyone who should be able to open /admin at all. */
export function canAccessAdminArea(p: Principal): boolean {
  return canManageContent(p) || canManageClub(p);
}

/**
 * Which roles a principal is allowed to grant.
 * A non-superadmin may never grant or revoke administrative roles, and nobody
 * may change their own role — that is enforced in the mutation itself.
 */
export function assignableRoles(p: Principal): Role[] {
  if (canManageAdministrators(p)) return ["member", "editor", "admin", "superadmin"];
  return [];
}

export function canAssignRole(p: Principal, target: Role): boolean {
  return assignableRoles(p).includes(target);
}

/** Documents carry a minimum role; membership status is checked separately. */
export function canReadDocument(p: Principal, requiredRole: Role): boolean {
  return isActiveMember(p) && hasRoleAtLeast(p.role, requiredRole);
}

export const ROLE_LABELS: Record<Role, string> = {
  member: "Member",
  editor: "Editor",
  admin: "Admin",
  superadmin: "Superadmin",
};

export const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  pending: "Pending",
  active: "Active",
  suspended: "Suspended",
  inactive: "Inactive",
};
