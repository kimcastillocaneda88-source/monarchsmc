import Link from "next/link";
import { getSiteSettings } from "@/lib/data/settings";
import { Monogram } from "@/components/ui/SmartImage";
import { PUBLIC_NAV } from "./nav-links";

/**
 * Social links, contact details and location render only when an administrator
 * has actually supplied them. Nothing here is invented.
 */
const SOCIAL_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
} as const;

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();

  const socials = (Object.keys(SOCIAL_LABELS) as Array<keyof typeof SOCIAL_LABELS>)
    .map((key) => ({ key, label: SOCIAL_LABELS[key], href: settings.social[key] }))
    .flatMap((item) => (item.href ? [{ ...item, href: item.href }] : []));

  return (
    <footer className="relative border-t border-ash bg-charcoal">
      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <Monogram className="h-9 w-9 text-gold" />
              <span className="font-display text-xl tracking-[0.24em] text-bone uppercase">
                {settings.clubName}
              </span>
            </div>
            {settings.tagline ? (
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-smoke">{settings.tagline}</p>
            ) : null}
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-smoke">
              A motorcycle club built on loyalty, respect and the road we share.
            </p>
          </div>

          <nav aria-label="Footer" className="lg:col-span-3">
            <h2 className="u-eyebrow">Navigate</h2>
            <ul className="mt-6 space-y-3">
              {PUBLIC_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="u-underline-grow font-display text-sm tracking-[0.14em] text-mist uppercase transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h2 className="u-eyebrow">Contact</h2>
            <ul className="mt-6 space-y-3 text-sm text-mist">
              {settings.contactEmail ? (
                <li>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="u-underline-grow transition-colors hover:text-gold"
                  >
                    {settings.contactEmail}
                  </a>
                </li>
              ) : null}
              {settings.contactPhone ? (
                <li>
                  <a
                    href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
                    className="u-underline-grow transition-colors hover:text-gold"
                  >
                    {settings.contactPhone}
                  </a>
                </li>
              ) : null}
              {settings.locationLabel ? <li className="text-smoke">{settings.locationLabel}</li> : null}
              <li>
                <Link href="/contact" className="u-underline-grow transition-colors hover:text-gold">
                  Send a message
                </Link>
              </li>
            </ul>

            {socials.length > 0 ? (
              <>
                <h2 className="u-eyebrow mt-10">Follow</h2>
                <ul className="mt-6 flex flex-wrap gap-3">
                  {socials.map((social) => (
                    <li key={social.key}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="inline-flex min-h-11 items-center border border-iron px-4 font-display text-[0.625rem] tracking-[0.2em] text-mist uppercase transition hover:border-gold hover:text-gold"
                      >
                        {social.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>

        <hr className="u-hairline mt-14" />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase">
            © {year} {settings.clubName}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-6">
            <li>
              <Link
                href="/privacy"
                className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase transition hover:text-gold"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase transition hover:text-gold"
              >
                Terms
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="font-display text-[0.625rem] tracking-[0.2em] text-smoke uppercase transition hover:text-gold"
              >
                Member Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
