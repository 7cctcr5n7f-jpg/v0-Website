import type { MetadataRoute } from 'next'
import { business } from '@/lib/business'
import { publicSiteRoutes } from '@/lib/site-routes'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return publicSiteRoutes.map((route) => ({
    url: `${business.url}${route.path === '/' ? '' : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
