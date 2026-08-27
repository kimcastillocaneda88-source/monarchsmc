import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { LandingSignIn } from "./LandingSignIn";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdminArea, isActiveMember } from "@/lib/auth/roles";

/**
 * The member access block on the landing page.
 *
 * Renders one of three states, decided on the server so the correct one is in
 * the initial HTML and nothing flashes:
 *
 *   signed out  — the username and password form
 *   pending     — signed in, but waiting on an officer's approval
 *   approved    — signed in and active, with links into the member area
 */
export async function MemberAccess() {
  const user = await getSessionUser();
  const active = user ? isActiveMember(user) : false;

  return (
    <section
      id="member-access"
      className="u-grain relative isolate border-t border-ash bg-charcoal/40 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-6">
            <Eyebrow>Member access</Eyebrow>
            <SectionHeading>
              {user ? `Welcome back, ${user.displayName || user.username || user.email}` : "Members sign in"}
            </SectionHeading>

            <p className="mt-6 max-w-md text-base leading-relaxed text-mist">
              {user
                ? active
                  ? "Rides, announcements, the club directory and documents are all behind your account."
                  : "Your account exists, but a club officer has not approved it yet. You will be able to sign in to the member area as soon as they do."
                : "Rides, announcements, the directory, club documents and the media library live behind this door. Sign in with the username an officer approved for you."}
            </p>

            <p className="mt-10 max-w-md border-l-2 border-gold/50 pl-5 text-sm leading-relaxed text-smoke">
              Every account is approved by a club officer before it works. Uploading photographs,
              video and files is a separate permission, granted to individual members and revocable
              at any time.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="border border-ash bg-charcoal/60 p-6 sm:p-9">
              {!user ? (
                <LandingSignIn />
              ) : active ? (
                <div className="space-y-6">
                  <p className="font-display text-[0.6875rem] tracking-[0.2em] text-gold uppercase">
                    Signed in as {user.username || user.email}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <ButtonLink href="/member/dashboard" size="lg" withArrow>
                      Member area
                    </ButtonLink>
                    {user.uploadAccess ? (
                      <ButtonLink href="/member/uploads" size="lg" variant="secondary">
                        Upload media
                      </ButtonLink>
                    ) : null}
                    {canAccessAdminArea(user) ? (
                      <ButtonLink href="/admin" size="lg" variant="secondary">
                        Admin
                      </ButtonLink>
                    ) : null}
                  </div>
                  {!user.uploadAccess ? (
                    <p className="border-t border-ash pt-5 text-xs leading-relaxed text-smoke">
                      Upload access has not been granted to your account. Ask a club officer if you
                      need it.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="font-display text-[0.6875rem] tracking-[0.2em] text-gold uppercase">
                    Awaiting approval
                  </p>
                  <p className="text-sm leading-relaxed text-mist">
                    Your request is with the club officers. Nothing more is needed from you.
                  </p>
                  <Link
                    href="/member/pending"
                    className="u-underline-grow inline-block font-display text-[0.625rem] tracking-[0.2em] text-gold uppercase"
                  >
                    Check your status →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
