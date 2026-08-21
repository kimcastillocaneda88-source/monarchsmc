import { getSessionUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { canAccessAdminArea, isActiveMember } from "@/lib/auth/roles";
import { HeaderNav } from "./HeaderNav";

/**
 * Server component: resolves the session once per request and hands the
 * minimum necessary shape to the interactive nav. No role data beyond
 * "can this person see these links" reaches the client.
 */
export async function SiteHeader() {
  const [user, settings] = await Promise.all([getSessionUser(), getSiteSettings()]);

  return (
    <HeaderNav
      clubName={settings.clubName}
      session={
        user
          ? {
              displayName: user.displayName,
              isActiveMember: isActiveMember(user),
              canAccessAdmin: canAccessAdminArea(user),
            }
          : null
      }
    />
  );
}
