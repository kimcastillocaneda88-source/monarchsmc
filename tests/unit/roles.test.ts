import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  canAccessAdminArea,
  canAssignRole,
  canManageAdministrators,
  canManageClub,
  canManageContent,
  canReadDocument,
  hasRoleAtLeast,
  isActiveMember,
  type Principal,
} from "@/lib/auth/roles";
import type { MembershipStatus, Role } from "@/types";

function principal(role: Role, membershipStatus: MembershipStatus = "active"): Principal {
  return { uid: "u1", role, membershipStatus };
}

describe("role ranking", () => {
  it("orders roles from member up to superadmin", () => {
    expect(hasRoleAtLeast("superadmin", "admin")).toBe(true);
    expect(hasRoleAtLeast("admin", "editor")).toBe(true);
    expect(hasRoleAtLeast("editor", "member")).toBe(true);
    expect(hasRoleAtLeast("member", "editor")).toBe(false);
    expect(hasRoleAtLeast("editor", "admin")).toBe(false);
    expect(hasRoleAtLeast("admin", "superadmin")).toBe(false);
  });
});

describe("membership status gates every privilege", () => {
  it.each(["pending", "suspended", "inactive"] as const)(
    "a %s account holds no privileges even with an elevated role",
    (status) => {
      const p = principal("superadmin", status);
      expect(isActiveMember(p)).toBe(false);
      expect(canManageContent(p)).toBe(false);
      expect(canManageClub(p)).toBe(false);
      expect(canManageAdministrators(p)).toBe(false);
      expect(canAccessAdminArea(p)).toBe(false);
      expect(canReadDocument(p, "member")).toBe(false);
    },
  );

  it("an active member holds member privileges only", () => {
    const p = principal("member");
    expect(isActiveMember(p)).toBe(true);
    expect(canManageContent(p)).toBe(false);
    expect(canManageClub(p)).toBe(false);
    expect(canAccessAdminArea(p)).toBe(false);
  });
});

describe("editor", () => {
  const editor = principal("editor");

  it("may manage editorial content and reach the admin area", () => {
    expect(canManageContent(editor)).toBe(true);
    expect(canAccessAdminArea(editor)).toBe(true);
  });

  it("may not manage club operations or administrators", () => {
    expect(canManageClub(editor)).toBe(false);
    expect(canManageAdministrators(editor)).toBe(false);
    expect(assignableRoles(editor)).toEqual([]);
    expect(canAssignRole(editor, "member")).toBe(false);
  });
});

describe("admin", () => {
  const admin = principal("admin");

  it("may manage club operations and content", () => {
    expect(canManageClub(admin)).toBe(true);
    expect(canManageContent(admin)).toBe(true);
  });

  it("may not perform superadmin-only role changes", () => {
    expect(canManageAdministrators(admin)).toBe(false);
    expect(assignableRoles(admin)).toEqual([]);
    for (const role of ["member", "editor", "admin", "superadmin"] as const) {
      expect(canAssignRole(admin, role)).toBe(false);
    }
  });
});

describe("superadmin", () => {
  const superadmin = principal("superadmin");

  it("may assign every role", () => {
    expect(canManageAdministrators(superadmin)).toBe(true);
    expect(assignableRoles(superadmin)).toEqual(["member", "editor", "admin", "superadmin"]);
    expect(canAssignRole(superadmin, "superadmin")).toBe(true);
  });
});

describe("document access", () => {
  it("requires the member's role to reach the document's required role", () => {
    expect(canReadDocument(principal("member"), "member")).toBe(true);
    expect(canReadDocument(principal("member"), "admin")).toBe(false);
    expect(canReadDocument(principal("editor"), "admin")).toBe(false);
    expect(canReadDocument(principal("admin"), "admin")).toBe(true);
    expect(canReadDocument(principal("superadmin"), "admin")).toBe(true);
  });

  it("denies an inactive member regardless of the required role", () => {
    expect(canReadDocument(principal("admin", "suspended"), "member")).toBe(false);
  });
});
