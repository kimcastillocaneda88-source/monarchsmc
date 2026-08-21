import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderNav } from "@/components/site/HeaderNav";
import { PortalNav } from "@/components/member/PortalNav";
import { ADMIN_NAV, EDITOR_ADMIN_PATHS, MEMBER_NAV } from "@/components/site/nav-links";

const pathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  pathname.value = "/";
});

describe("public header navigation", () => {
  it("shows a sign-in link when signed out", () => {
    render(<HeaderNav session={null} clubName="MONARCHS MC" />);
    expect(screen.getAllByRole("link", { name: /member login/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it("shows the member area but no admin link for an ordinary member", () => {
    render(
      <HeaderNav
        session={{ displayName: "A Rider", isActiveMember: true, canAccessAdmin: false }}
        clubName="MONARCHS MC"
      />,
    );
    expect(screen.getAllByRole("link", { name: /member area/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it("shows the admin link only when the session may reach the admin area", () => {
    render(
      <HeaderNav
        session={{ displayName: "An Officer", isActiveMember: true, canAccessAdmin: true }}
        clubName="MONARCHS MC"
      />,
    );
    expect(screen.getAllByRole("link", { name: /^admin$/i }).length).toBeGreaterThan(0);
  });

  it("routes a non-active member to the status page rather than the dashboard", () => {
    render(
      <HeaderNav
        session={{ displayName: "A Rider", isActiveMember: false, canAccessAdmin: false }}
        clubName="MONARCHS MC"
      />,
    );
    const links = screen.getAllByRole("link", { name: /member area/i });
    expect(links[0]).toHaveAttribute("href", "/member/pending");
  });

  it("marks the current page with aria-current", () => {
    pathname.value = "/rides";
    render(<HeaderNav session={null} clubName="MONARCHS MC" />);
    const current = screen.getAllByRole("link", { name: "Rides" });
    expect(current.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });

  it("opens and closes the mobile drawer, reporting state to assistive technology", async () => {
    const user = userEvent.setup();
    render(<HeaderNav session={null} clubName="MONARCHS MC" />);

    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "mobile-navigation");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: /close menu/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await user.click(screen.getByRole("button", { name: /close menu/i }));
    expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("portal navigation", () => {
  it("labels the navigation landmark and marks the active section", () => {
    pathname.value = "/member/rides";
    render(<PortalNav links={MEMBER_NAV} ariaLabel="Member area" />);
    expect(screen.getByRole("navigation", { name: "Member area" })).toBeInTheDocument();
    const active = screen.getAllByRole("link", { name: "Rides" });
    expect(active.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });
});

describe("admin navigation scoping", () => {
  it("limits an editor to the editorial sections", () => {
    const editorLinks = ADMIN_NAV.filter((link) => EDITOR_ADMIN_PATHS.has(link.href));
    expect(editorLinks.map((link) => link.href).sort()).toEqual([
      "/admin",
      "/admin/gallery",
      "/admin/news",
    ]);
    expect(editorLinks.some((link) => link.href === "/admin/members")).toBe(false);
    expect(editorLinks.some((link) => link.href === "/admin/applications")).toBe(false);
  });
});
