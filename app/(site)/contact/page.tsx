import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { ContactForm } from "@/components/forms/ContactForm";
import { renderMarkdown } from "@/lib/markdown";
import { getPageContent, getSiteSettings, section } from "@/lib/data/settings";
import { CONTACT_SECTIONS } from "@/lib/content/defaults";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with MONARCHS MC about the club, events, community work or media.",
  alternates: { canonical: siteUrl("/contact") },
  openGraph: { title: "Contact · MONARCHS MC", url: siteUrl("/contact") },
};

export default async function ContactPage() {
  const [page, settings] = await Promise.all([getPageContent("contact"), getSiteSettings()]);
  const fallback = CONTACT_SECTIONS.find((s) => s.key === "intro")?.fallback ?? "";

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in touch"
        lede="Officers read every message that comes through this page."
      />

      <Section>
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <Eyebrow index="01">Before you write</Eyebrow>
                <SectionHeading className="text-[clamp(1.5rem,3.6vw,2.25rem)]">
                  Reaching the club
                </SectionHeading>
                <div className="mt-7">{renderMarkdown(section(page, "intro", fallback))}</div>

                {settings.contactEmail || settings.contactPhone || settings.locationLabel ? (
                  <dl className="mt-10 divide-y divide-ash border-t border-ash">
                    {settings.contactEmail ? (
                      <div className="py-4">
                        <dt className="font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase">
                          Email
                        </dt>
                        <dd className="mt-1.5">
                          <a
                            href={`mailto:${settings.contactEmail}`}
                            className="u-underline-grow text-sm text-bone"
                          >
                            {settings.contactEmail}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    {settings.contactPhone ? (
                      <div className="py-4">
                        <dt className="font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase">
                          Phone
                        </dt>
                        <dd className="mt-1.5">
                          <a
                            href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
                            className="u-underline-grow text-sm text-bone"
                          >
                            {settings.contactPhone}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    {settings.locationLabel ? (
                      <div className="py-4">
                        <dt className="font-display text-[0.625rem] tracking-[0.22em] text-smoke uppercase">
                          Based in
                        </dt>
                        <dd className="mt-1.5 text-sm text-bone">{settings.locationLabel}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
