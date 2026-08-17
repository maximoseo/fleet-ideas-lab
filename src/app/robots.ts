import type { MetadataRoute } from "next";

/**
 * This is an internal operator console that can publish to client WordPress
 * sites. Nothing here belongs in a search index.
 *
 * The one exception is `/share`: those are deliberately public read-only links
 * an operator hands to someone else, and blanket-blocking them would break the
 * Android share intent preview. They are unlisted, not secret.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/share"],
        disallow: ["/"],
      },
    ],
    host: "https://fleet-ideas-lab.maximo-seo.ai",
  };
}
