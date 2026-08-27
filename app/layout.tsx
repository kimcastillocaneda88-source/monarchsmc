import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { siteUrl } from "@/lib/utils";
import { SkipLink } from "@/components/site/SkipLink";
import { PageViewTracker } from "@/components/site/PageViewTracker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "MONARCHS MC — Motorcycle Club",
    template: "%s · MONARCHS MC",
  },
  description:
    "MONARCHS MC is a motorcycle club built on loyalty, respect and the road we share. Rides, events and the brotherhood behind them.",
  applicationName: "MONARCHS MC",
  keywords: [
    "MONARCHS MC",
    "motorcycle club",
    "motorcycle community",
    "motorcycle rides",
    "motorcycle events",
    "riding club",
  ],
  authors: [{ name: "MONARCHS MC" }],
  creator: "MONARCHS MC",
  openGraph: {
    type: "website",
    siteName: "MONARCHS MC",
    title: "MONARCHS MC — Motorcycle Club",
    description:
      "A motorcycle club built on loyalty, respect and the road we share. Rides, events and the brotherhood behind them.",
    url: siteUrl(),
    images: [{ url: "/og-default.svg", width: 1200, height: 630, alt: "MONARCHS MC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MONARCHS MC — Motorcycle Club",
    description: "A motorcycle club built on loyalty, respect and the road we share.",
    images: ["/og-default.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-ink font-sans text-bone antialiased">
        <SkipLink />
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
