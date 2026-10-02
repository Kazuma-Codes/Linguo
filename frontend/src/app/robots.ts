import type { MetadataRoute } from 'next';

/**
 * Generates /robots.txt at build time.
 *
 * Allows crawling of the public landing page while blocking
 * authenticated chat rooms that contain private conversations.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://mosa1c.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/chat/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
