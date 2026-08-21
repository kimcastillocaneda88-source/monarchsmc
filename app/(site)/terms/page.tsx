import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { getSiteSettings } from "@/lib/data/settings";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for the MONARCHS MC website and member area.",
  alternates: { canonical: siteUrl("/terms") },
};

export default async function TermsPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of use" compact />
      <Section>
        <Container size="prose">
          <div className="space-y-10 text-mist">
            <Block title="Using this site">
              <p>
                This website is operated by {settings.clubName}. By using it you agree to these terms.
                They should be reviewed by the club against the law that applies to it before launch.
              </p>
            </Block>

            <Block title="Membership applications">
              <p>
                Submitting an application does not create an account, does not create any obligation
                on the club, and does not make you a member. Applications are reviewed by club
                officers, and the club may decline any application without giving a reason.
              </p>
            </Block>

            <Block title="Member accounts">
              <ul className="list-disc space-y-2 pl-6 marker:text-gold">
                <li>Accounts are personal. Do not share your credentials with anyone.</li>
                <li>
                  Content in the member area — announcements, documents, the directory and member
                  details — is confidential to the club and must not be republished.
                </li>
                <li>
                  The club may suspend or deactivate an account at any time, in which case access to
                  the member area ends immediately.
                </li>
              </ul>
            </Block>

            <Block title="Rides and events">
              <p>
                Motorcycling carries risk. Taking part in a club ride or event is voluntary and at
                your own risk. Riders are responsible for their own licence, insurance, roadworthiness
                and conduct, and for riding within the law and within their own ability.
              </p>
              <p>
                Ride details published on this site may change. Always confirm arrangements before
                setting off.
              </p>
            </Block>

            <Block title="Content and contributions">
              <p>
                Photographs, articles and other material on this site belong to the club or its
                contributors and may not be reproduced without permission. If you submit a photograph
                for the gallery you confirm that you have the right to do so and that anyone
                identifiable in it consents to its publication.
              </p>
            </Block>

            <Block title="Availability">
              <p>
                The site is provided as it stands. The club does not guarantee that it will always be
                available or free of errors.
              </p>
            </Block>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl tracking-[0.06em] text-bone uppercase">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed">{children}</div>
    </section>
  );
}
