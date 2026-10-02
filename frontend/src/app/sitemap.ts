import type { MetadataRoute } from 'next';

/**
 * Generates /sitemap.xml at build time.
 *
 * Only publicly accessible, crawlable pages are listed.
 * Dynamic authenticated routes like /chat/[roomId] are excluded
 * because they require login and contain user-specific content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://mosa1c.vercel.app';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ];
}
