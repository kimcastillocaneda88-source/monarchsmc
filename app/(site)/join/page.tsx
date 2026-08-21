import type { Metadata } from "next";
import { PageHero, Container, Section } from "@/components/site/PageHero";
import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { JoinForm } from "@/components/forms/JoinForm";
import { FormMessage } from "@/components/ui/Field";
import { renderMarkdown } from "@/lib/markdown";
import { getPageContent, getSiteSettings, section } from "@/lib/data/settings";
import { JOIN_SECTIONS } from "@/lib/content/defaults";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Apply to ride with MONARCHS MC. Membership is by application and review — this form starts a conversation.",
  alternates: { canonical: siteUrl("/join") },
  openGraph: { title: "Join · MONARCHS MC", url: siteUrl("/join") },
};

function fb(key: string): string {
  return JOIN_SECTIONS.find((s) => s.key === key)?.fallback ?? "";
}

export default async function JoinPage() {
  const [page, settings] = await Promise.all([getPageContent("join"), getSiteSettings()]);

  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Apply to ride with us"
        lede="Membership is earned, not bought. Tell us who you are and what you ride, and an officer will read it."
      />

      <Section>
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <Eyebrow index="01">Before you apply</Eyebrow>
                <SectionHeading className="text-[clamp(1.5rem,3.6vw,2.25rem)]">
                  How this works
                </SectionHeading>
                <div className="mt-7">{renderMarkdown(section(page, "intro", fb("intro")))}</div>

                <div className="mt-10 border-t border-ash pt-8">
                  <Eyebrow>What we look for</Eyebrow>
                  <div className="mt-5">
                    {renderMarkdown(section(page, "expectations", fb("expectations")))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              {settings.applicationsOpen ? (
                <JoinForm />
              ) : (
                <FormMessage tone="info" title="Applications are closed">
                  The club is not accepting new applications at the moment. Check back later, or use
                  the contact page if you have a question.
                </FormMessage>
              )}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
