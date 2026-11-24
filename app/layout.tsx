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
    default: 'TENROUNDS | 30-Minute HIIT Gym in Garsfontein, Pretoria East',
    template: '%s | TENROUNDS',
  },
  description:
    'TENROUNDS is a boutique HIIT gym in Garsfontein, Pretoria East delivering coach-supported 30-minute workouts with no class times. Strength, cardio and functional training for real results.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    siteName: 'TENROUNDS',
    url: business.url,
    title: 'TENROUNDS | 30-Minute HIIT Gym in Garsfontein, Pretoria East',
    description:
      'Coach-supported 30-minute HIIT workouts with no class times in Garsfontein, Pretoria East.',
    images: [{ url: '/hero-athlete.png', width: 1200, height: 630, alt: 'TENROUNDS HIIT Gym in Garsfontein, Pretoria East' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TENROUNDS | 30-Minute HIIT Gym in Garsfontein, Pretoria East',
    description: 'Coach-supported 30-minute HIIT workouts with no class times in Garsfontein, Pretoria East.',
    images: ['/hero-athlete.png'],
  },
  keywords: [
    'HIIT gym Pretoria',
    'HIIT gym Garsfontein',
    'boxing gym Pretoria East',
    'boutique gym Pretoria',
    '30 minute workout Pretoria',
    'gym near Faerie Glen',
    'gym near Woodhill',
    'gym near Moreleta Park',
    'fitness classes Pretoria East',
    'weight loss gym Pretoria East',
    'kickboxing classes Pretoria East',
    'no class times gym Pretoria',
    'heart rate training Pretoria',
    'personal training alternative Pretoria',
    'corporate wellness Pretoria',
    'gym Garsfontein',
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
