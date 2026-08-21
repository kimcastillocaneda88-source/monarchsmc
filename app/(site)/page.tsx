import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { Principles } from "@/components/home/Principles";
import { FeaturedRide } from "@/components/home/FeaturedRide";
import { FeaturedGallery } from "@/components/home/FeaturedGallery";
import { LatestNews } from "@/components/home/LatestNews";
import { Mission } from "@/components/home/Mission";
import { FinalCta } from "@/components/home/FinalCta";
import { getPageContent, getSiteSettings, section } from "@/lib/data/settings";
import { getFeaturedRide } from "@/lib/data/rides";
import { listFeaturedGallery } from "@/lib/data/gallery";
import { listPublishedNews } from "@/lib/data/news";
import { HOME_SECTIONS } from "@/lib/content/defaults";
import { siteUrl } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s · MONARCHS MC" template, which
  // would otherwise brand the homepage twice.
  title: { absolute: "MONARCHS MC — Ride with purpose. Ride as one." },
  description:
    "MONARCHS MC is a motorcycle club built on loyalty, respect and the road we share. Club rides, events, photography and the brotherhood behind them.",
  alternates: { canonical: siteUrl("/") },
  openGraph: {
    title: "MONARCHS MC — Ride with purpose. Ride as one.",
    description:
      "A motorcycle club built on loyalty, respect and the road we share. Club rides, events and the brotherhood behind them.",
    url: siteUrl("/"),
  },
};

function fallbackFor(key: string): string {
  return HOME_SECTIONS.find((s) => s.key === key)?.fallback ?? "";
}

export default async function HomePage() {
  const [page, settings, ride, gallery, news] = await Promise.all([
    getPageContent("home"),
    getSiteSettings(),
    getFeaturedRide(),
    listFeaturedGallery(5),
    listPublishedNews({ limit: 3 }),
  ]);

  /** Organisation structured data. Only fields the club has actually supplied. */
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.clubName,
    url: siteUrl("/"),
    ...(settings.tagline ? { slogan: settings.tagline } : {}),
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    ...(settings.contactPhone ? { telephone: settings.contactPhone } : {}),
    ...(Object.values(settings.social).some(Boolean)
      ? { sameAs: Object.values(settings.social).filter((v): v is string => Boolean(v)) }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output of a server-built object; no user input is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd).replace(/</g, "\\u003c") }}
      />

      <Hero
        kicker={section(page, "heroKicker", fallbackFor("heroKicker"))}
        imageUrl={page?.heroImageUrl ?? null}
        imageAlt={page?.heroImageAlt ?? null}
      />

      <Intro
        title={section(page, "introTitle", fallbackFor("introTitle"))}
        body={section(page, "introBody", fallbackFor("introBody"))}
        imageUrl={gallery[0]?.imageUrl ?? null}
        imageAlt={gallery[0]?.altText ?? null}
      />

      <Principles />

      <FeaturedRide ride={ride} />

      <FeaturedGallery items={gallery} />

      <LatestNews articles={news.items} />

      <Mission
        title={section(page, "missionTitle", fallbackFor("missionTitle"))}
        body={section(page, "missionBody", fallbackFor("missionBody"))}
      />

      <FinalCta />
    </>
  );
}
