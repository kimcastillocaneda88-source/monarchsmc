import type { Metadata } from "next";
import { requireActiveMemberPage } from "@/lib/auth/guards";
import { PortalHeader } from "@/components/member/PortalShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { AvatarPlate } from "@/components/ui/Avatar";
import { listDirectory } from "@/lib/data/members";

export const metadata: Metadata = { title: "Directory" };

/**
 * Member directory.
 *
 * The data comes from a projection built server-side, not from raw member
 * documents: email and phone are present only where that member opted in, and
 * administrative fields, application data and internal notes never leave the
 * server.
 */
export default async function MemberDirectoryPage() {
  await requireActiveMemberPage("/member/directory");
  const members = await listDirectory(48);

  return (
    <>
      <PortalHeader
        eyebrow="Member area"
        title="Directory"
        description="Active members who have chosen to be listed. Contact details appear only where a member has shared them."
      />

      {members.length === 0 ? (
        <EmptyState
          title="No members listed"
          description="Members appear here once their membership is active and they have opted into the directory."
        />
      ) : (
        <ul className="grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <li key={member.uid} className="bg-ink">
              <AvatarPlate
                uid={member.uid}
                name={member.displayName}
                hasPhoto={Boolean(member.photoUrl)}
              />
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {member.position ? <Badge tone="gold">{member.position}</Badge> : null}
                  {member.chapter ? <Badge tone="muted">{member.chapter}</Badge> : null}
                </div>

                <h2 className="mt-3 font-display text-xl tracking-[0.02em] text-bone uppercase">
                  {member.displayName}
                </h2>
                {member.nickname ? (
                  <p className="mt-1 text-sm text-smoke">“{member.nickname}”</p>
                ) : null}

                <dl className="mt-4 space-y-2 text-sm">
                  {member.motorcycle ? (
                    <div>
                      <dt className="sr-only">Motorcycle</dt>
                      <dd className="text-mist">{member.motorcycle}</dd>
                    </div>
                  ) : null}
                  {member.ridingSince ? (
                    <div>
                      <dt className="sr-only">Riding since</dt>
                      <dd className="font-display text-[0.5625rem] tracking-[0.2em] text-smoke uppercase">
                        Riding since {member.ridingSince}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {member.bio ? (
                  <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-smoke">{member.bio}</p>
                ) : null}

                {member.email || member.phone ? (
                  <ul className="mt-5 space-y-1.5 border-t border-ash pt-4 text-sm">
                    {member.email ? (
                      <li>
                        <a
                          href={`mailto:${member.email}`}
                          className="u-underline-grow break-all text-mist transition hover:text-gold"
                        >
                          {member.email}
                        </a>
                      </li>
                    ) : null}
                    {member.phone ? (
                      <li>
                        <a
                          href={`tel:${member.phone.replace(/[^\d+]/g, "")}`}
                          className="u-underline-grow text-mist transition hover:text-gold"
                        >
                          {member.phone}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
