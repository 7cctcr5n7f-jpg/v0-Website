'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'tenrounds-first-touch-attribution'
const CONSENT_KEY = 'tenrounds-analytics-consent'
const CONSENT_EVENT = 'tenrounds:analytics-consent'

export function CampaignAttributionCapture() {
  const pathname = usePathname()

  useEffect(() => {
    function capture() {
      try {
        // Campaign attribution is stored only after the visitor has allowed analytics.
        if (localStorage.getItem(CONSENT_KEY) !== 'granted') return
        const params = new URLSearchParams(window.location.search)
        const incoming = {
          utmSource: params.get('utm_source') || '',
          utmMedium: params.get('utm_medium') || '',
          utmCampaign: params.get('utm_campaign') || '',
          utmContent: params.get('utm_content') || '',
          utmTerm: params.get('utm_term') || '',
        }
        const hasCampaign = Object.values(incoming).some(Boolean)
        const saved = localStorage.getItem(STORAGE_KEY)
        const previous = saved ? JSON.parse(saved) as Record<string, string> : {}
        const hasSavedCampaign = Boolean(previous.utmSource || previous.utmMedium || previous.utmCampaign)

        if (hasCampaign && !hasSavedCampaign) {
          const referrer = (() => {
            try { const url = new URL(document.referrer); return url.origin + url.pathname } catch { return '' }
          })()
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...previous, ...incoming, landingPage: window.location.pathname, referrer }))
        } else if (!saved) {
          const referrer = (() => {
            try { const url = new URL(document.referrer); return url.origin + url.pathname } catch { return '' }
          })()
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '', utmTerm: '',
            landingPage: window.location.pathname, referrer,
          }))
        }
      } catch {
        // Campaign tracking is optional and must never block website use.
      }
    }

    capture()
    window.addEventListener(CONSENT_EVENT, capture)
    return () => window.removeEventListener(CONSENT_EVENT, capture)
  }, [pathname])

  return null
}
