import { MetadataRoute } from "next";

/**
 * Dynamic Next.js Robots.txt Generator
 * Configures rules for standard search engines (Googlebot, Bingbot)
 * and generative AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended).
 * Served automatically at https://lekvya.navedhana.com/robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://lekvya.navedhana.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/plan",
          "/docs",
          "/login",
          "/signup",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: [
          "/dashboard/",
          "/master-admin/",
          "/developer/",
          "/settings/",
          "/notifications/",
          "/uploads/",
          "/api/",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "PerplexityBot",
          "ClaudeBot",
          "Google-Extended",
          "Amazonbot",
          "Applebot",
        ],
        allow: [
          "/",
          "/plan",
          "/docs",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: [
          "/dashboard/",
          "/master-admin/",
          "/developer/",
          "/settings/",
          "/notifications/",
          "/uploads/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
