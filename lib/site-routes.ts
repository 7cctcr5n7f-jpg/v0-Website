import type { MetadataRoute } from 'next'

// Canonical public routes used by the sitemap and analytics allowlist.
// SEO-only doorway pages are intentionally excluded; retire them with
// one-to-one redirects after checking backlinks and the final URL inventory.
export const publicSiteRoutes: {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/memberships', priority: 0.9, changeFrequency: 'weekly' }, // Pricing
  { path: '/members', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/gallery', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/corporate-wellness', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/free-trial', priority: 0.95, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms-and-conditions', priority: 0.2, changeFrequency: 'yearly' },
]
