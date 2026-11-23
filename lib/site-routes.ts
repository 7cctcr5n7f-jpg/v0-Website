import type { MetadataRoute } from 'next'

// Shared by sitemap.xml, the agent API, and the analytics page allowlist.
export const publicSiteRoutes: {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/memberships', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/free-trial', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/how-it-works', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/corporate-wellness', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/meet-the-team', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/gallery', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/hiit-gym-garsfontein', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/boxing-fitness-pretoria-east', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/30-minute-workout-pretoria-east', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/gym-near-woodhill', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/gym-near-faerie-glen', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/gym-near-moreleta-park', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/weight-loss-gym-pretoria-east', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/kickboxing-classes-pretoria-east', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/boxing-gym-pretoria-east', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/gym-for-busy-professionals-pretoria-east', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/group-fitness-classes-pretoria-east', priority: 0.7, changeFrequency: 'monthly' },
]
