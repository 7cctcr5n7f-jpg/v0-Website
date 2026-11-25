import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpecialsGlobal } from '@/components/specials/specials-global'
import { JsonLd } from '@/components/json-ld'
import { SiteShell } from '@/components/site-shell'
import { AnalyticsConsent } from '@/components/analytics-consent'
import { CampaignAttributionCapture } from '@/components/campaign-attribution-capture'
import { localBusinessSchema, websiteSchema } from '@/lib/seo'
import { business } from '@/lib/business'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(business.url),
  title: {
    default: 'HIIT Fitness Studio Pretoria East | 30-Minute Workouts | TENROUNDS',
    template: '%s | TENROUNDS',
  },
  description:
    'TENROUNDS is a boutique HIIT fitness studio in Pretoria East. Get leaner, stronger and fitter with coach-supported 30-minute workouts combining strength, cardio and boxing-inspired fitness. Book your free trial.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    siteName: 'TENROUNDS',
    url: business.url,
    title: 'HIIT Fitness Studio Pretoria East | 30-Minute Workouts | TENROUNDS',
    description:
      'Get leaner, stronger and fitter with coach-supported 30-minute HIIT workouts in Pretoria East. No class times. Book your free trial.',
    images: [{ url: '/hero-athlete.png', width: 1200, height: 630, alt: 'Coach-supported HIIT fitness at TENROUNDS in Pretoria East' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HIIT Fitness Studio Pretoria East | 30-Minute Workouts | TENROUNDS',
    description: 'Coach-supported 30-minute HIIT workouts in Pretoria East. Strength, cardio and boxing-inspired fitness. No class times.',
    images: ['/hero-athlete.png'],
  },
  keywords: [
    'HIIT gym Pretoria East',
    'fitness studio Pretoria East',
    '30 minute workout Pretoria East',
    'HIIT Garsfontein',
    'weight loss gym Pretoria East',
    'functional fitness Pretoria East',
    'fitness classes Pretoria East',
    'gym for busy professionals Pretoria',
    'boutique fitness studio Pretoria',
    'boxing-inspired fitness Pretoria East',
    'gym near Faerie Glen',
    'gym near Woodhill',
    'gym near Moreleta Park',
    'no class times gym Pretoria',
    'heart rate training Pretoria',
    'corporate wellness Pretoria',
    'gym Garsfontein Pretoria',
  ],
  robots: { index: true, follow: true },
}

export const viewport = {
  themeColor: '#0b0b0b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <JsonLd data={[localBusinessSchema(), websiteSchema()]} />
        <CampaignAttributionCapture />
        <SpecialsGlobal />
        <SiteShell>
          {children}
        </SiteShell>
        <AnalyticsConsent />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
