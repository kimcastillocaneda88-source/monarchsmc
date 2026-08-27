export interface NavLink {
  href: string;
  label: string;
}

/** Primary public navigation, shared by the header and the footer. */
export const PUBLIC_NAV: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/brotherhood", label: "Brotherhood" },
  { href: "/rides", label: "Rides" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/news", label: "News" },
  { href: "/join", label: "Join" },
];

export const MEMBER_NAV: NavLink[] = [
  { href: "/member/dashboard", label: "Dashboard" },
  { href: "/member/rides", label: "Rides" },
  { href: "/member/events", label: "Events" },
  { href: "/member/announcements", label: "Announcements" },
  { href: "/member/directory", label: "Directory" },
  { href: "/member/documents", label: "Documents" },
  { href: "/member/media", label: "Media" },
  { href: "/member/profile", label: "Profile" },
  { href: "/member/settings", label: "Settings" },
];

/**
 * Shown only to accounts an administrator has granted upload access to.
 * Hiding it is a courtesy, not a control — /member/uploads guards itself.
 */
export const UPLOAD_NAV: NavLink = { href: "/member/uploads", label: "Upload" };

export const ADMIN_NAV: NavLink[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/access", label: "Access" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/rides", label: "Rides" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit-log", label: "Audit log" },
];

/** Which admin sections an editor (content-only role) may reach. */
export const EDITOR_ADMIN_PATHS = new Set([
  "/admin",
  "/admin/news",
  "/admin/gallery",
  "/admin/media",
]);
