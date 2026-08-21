import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { EditorialBlock } from "@/components/site/EditorialBlock";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { EmptyState } from "@/components/ui/States";
import { AvatarPlate } from "@/components/ui/Avatar";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { getPageContent, section } from "@/lib/data/settings";
import { listPublicOfficers } from "@/lib/data/members";
import { ABOUT_SECTIONS, PRINCIPLES } from "@/lib/content/defaults";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    "About MONARCHS MC — the club's story, philosophy, values, leadership and identity, written by the club itself.",
  alternates: { canonical: siteUrl("/about") },
  openGraph: { title: "About · MONARCHS MC", url: siteUrl("/about") },
};

function fb(key: string): string {
  return ABOUT_SECTIONS.find((s) => s.key === key)?.fallback ?? "";
}

export default async function AboutPage() {
  const [page, officers] = await Promise.all([getPageContent("about"), listPublicOfficers()]);

  return (
    <>
      <PageHero
        eyebrow="About the club"
        title="Monarchs MC"
        lede="A motorcycle club is not its logo or its bikes. It is the standard it keeps. This is ours."
        imageUrl={page?.heroImageUrl ?? null}
        imageAlt={page?.heroImageAlt ?? null}
        imageLabel="About page photograph"
      />

      <Section>
        <Container>
          <EditorialBlock
            index="01"
            eyebrow="Our story"
            title={section(page, "storyTitle", fb("storyTitle"))}
            body={section(page, "storyBody", fb("storyBody"))}
          />
        </Container>
      </Section>

      <Section tone="charcoal">
        <Container>
          <EditorialBlock
            index="02"
            eyebrow="Our philosophy"
            title={section(page, "philosophyTitle", fb("philosophyTitle"))}
            body={section(page, "philosophyBody", fb("philosophyBody"))}
            reversed
          />
        </Container>
      </Section>

      {/* Values — structural, kept in code rather than the CMS. */}
      <Section>
        <Container>
          <Eyebrow index="03">Our values</Eyebrow>
          <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">
            What the club is built on
          </SectionHeading>
          <dl className="mt-12 grid gap-px bg-ash sm:grid-cols-2">
            {PRINCIPLES.map((principle, i) => (
              <Reveal key={principle.title} delay={i * 80} className="bg-ink p-7 sm:p-9">
                <dt className="font-display text-xl tracking-[0.06em] text-gold uppercase">
                  <span className="mr-3 text-[0.625rem] tracking-[0.28em] text-gold/50">
                    {principle.index}
                  </span>
                  {principle.title}
                </dt>
                <dd className="mt-4 text-sm leading-relaxed text-mist">{principle.body}</dd>
              </Reveal>
            ))}
          </dl>
        </Container>
      </Section>

      {/* Leadership — Firestore driven. Only officers an admin has published. */}
      <Section tone="charcoal">
        <Container>
          <Eyebrow index="04">Leadership</Eyebrow>
          <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">
            Those who carry the responsibility
          </SectionHeading>

          {officers.length === 0 ? (
            <EmptyState
              className="mt-12"
              title="Leadership has not been published"
              description="Officer positions appear here once an administrator assigns them and marks them public. Positions the club has not filled are never shown."
            />
          ) : (
            <ul className="mt-12 grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
              {officers.map((officer, i) => (
                <Reveal key={officer.uid} delay={i * 70} as="li" className="bg-ink">
                  <AvatarPlate
                    uid={officer.uid}
                    name={`${officer.displayName}, ${officer.position}`}
                    hasPhoto={Boolean(officer.photoUrl)}
                  />
                  <div className="p-6">
                    <p className="u-eyebrow">{officer.position}</p>
                    <h3 className="mt-3 font-display text-2xl tracking-[0.02em] text-bone uppercase">
                      {officer.displayName}
                    </h3>
                    {officer.nickname ? (
                      <p className="mt-1 text-sm text-smoke">“{officer.nickname}”</p>
                    ) : null}
                    {officer.motorcycle ? (
                      <p className="mt-4 font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
                        {officer.motorcycle}
                      </p>
                    ) : null}
                    {officer.bio ? (
                      <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-mist">{officer.bio}</p>
                    ) : null}
                  </div>
                </Reveal>
              ))}
            </ul>
          )}
        </Container>
      </Section>

      <Section>
        <Container>
          <EditorialBlock
            index="05"
            eyebrow="Club identity"
            title={section(page, "identityTitle", fb("identityTitle"))}
            body={section(page, "identityBody", fb("identityBody"))}
          />
          <div className="mt-14 flex flex-wrap gap-4">
            <ButtonLink href="/brotherhood" withArrow>
              The brotherhood
            </ButtonLink>
            <ButtonLink href="/join" variant="secondary">
              Apply to join
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
