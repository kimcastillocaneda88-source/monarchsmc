import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

/**
 * Private areas are excluded from crawling here and independently carry
 * noindex metadata — robots.txt is a request, not an access control.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/member",
          "/member/",
          "/admin",
          "/admin/",
          "/api/",
          "/login",
          "/forgot-password",
          "/forbidden",
          "/unauthorized",
        ],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/"),
  };
}
