import type { MetadataRoute } from 'next'

// Canonical public routes used by the sitemap and analytics allowlist.
// SEO-only doorway pages are intentionally excluded; keep pages with established
// search visibility in the sitemap even when they are campaign-focused.
export const publicSiteRoutes: {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/memberships', priority: 0.9, changeFrequency: 'weekly' }, // Pricing
  { path: '/gallery', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/corporate-wellness', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/free-trial', priority: 0.95, changeFrequency: 'monthly' },
  { path: '/boxing-gym-pretoria-east', priority: 0.85, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms-and-conditions', priority: 0.2, changeFrequency: 'yearly' },
]
