import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { getSiteSettings } from "@/lib/data/settings";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How MONARCHS MC collects, uses and protects personal information.",
  alternates: { canonical: siteUrl("/privacy") },
};

/**
 * A factual description of what this application actually does with data.
 * It is not legal advice and the club should have it reviewed before launch —
 * that caveat is stated on the page rather than hidden.
 */
export default async function PrivacyPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy" compact />
      <Section>
        <Container size="prose">
          <div className="space-y-10 text-mist">
            <Block title="Scope">
              <p>
                This notice describes how {settings.clubName} handles personal information submitted
                through this website. It reflects what the software actually does. The club should
                have it reviewed against the data-protection law that applies to it before relying on
                it.
              </p>
            </Block>

            <Block title="What we collect">
              <ul className="list-disc space-y-2 pl-6 marker:text-gold">
                <li>
                  <strong className="text-bone">Membership applications.</strong> Name, preferred
                  name, email, phone, location, motorcycle, riding experience, years riding, your
                  reasons for applying and how you heard about the club.
                </li>
                <li>
                  <strong className="text-bone">Contact messages.</strong> Name, email, subject,
                  category and message body.
                </li>
                <li>
                  <strong className="text-bone">Member accounts.</strong> Email address and
                  authentication credentials held by Firebase Authentication, plus the profile
                  information a member chooses to add.
                </li>
                <li>
                  <strong className="text-bone">Technical data.</strong> A one-way hash derived from
                  your IP address, used only to rate-limit public forms. The raw address is not
                  stored.
                </li>
              </ul>
            </Block>

            <Block title="What we do not collect">
              <p>
                We do not use advertising trackers, we do not sell or share personal information with
                third parties for marketing, and analytics events carry no names, email addresses or
                message content.
              </p>
            </Block>

            <Block title="Who can see it">
              <p>
                Applications, contact messages and member contact details are visible only to club
                officers with an administrative role. Security rules on the database enforce this
                independently of the interface, so the restriction cannot be bypassed by manipulating
                the browser.
              </p>
              <p>
                Member directory entries are visible only to signed-in active members, and each
                member controls whether their email and phone number appear there.
              </p>
            </Block>

            <Block title="Where it is held">
              <p>
                Data is stored in Google Cloud Firestore and Firebase Storage, and the site is hosted
                on Vercel. Both providers process data on the club&apos;s behalf.
              </p>
            </Block>

            <Block title="Retention">
              <p>
                Applications are retained while they are under review and archived afterwards.
                Members can request that their profile information be corrected or removed by
                contacting a club officer.
              </p>
            </Block>

            <Block title="Your rights">
              <p>
                Depending on where you live you may have the right to access, correct, export or
                delete the personal information the club holds about you, and to object to certain
                processing. To exercise any of these, contact the club
                {settings.contactEmail ? (
                  <>
                    {" "}
                    at{" "}
                    <a href={`mailto:${settings.contactEmail}`} className="text-gold underline underline-offset-4">
                      {settings.contactEmail}
                    </a>
                  </>
                ) : (
                  " using the contact form"
                )}
                .
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
