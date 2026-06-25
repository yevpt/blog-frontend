import type { MetadataRoute } from "next";
import { getCanonicalUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/notifications", "/oauth"],
      },
    ],
    sitemap: getCanonicalUrl("/sitemap.xml").toString(),
    host: siteUrl,
  };
}
