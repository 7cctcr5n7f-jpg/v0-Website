'use client'

import { useEffect, useRef } from 'react'
import {
  analyticsMode, analyticsPath, FUNNEL_EVENTS, resolveMeasurementId, validMeasurementId,
  type AnalyticsConsentState, type FunnelEvent,
} from '@/lib/funnel-events'
import { publicSiteRoutes } from '@/lib/site-routes'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    tenroundsAnalyticsReady?: boolean
    [key: `ga-disable-${string}`]: boolean | undefined
  }
}

export const analyticsId = resolveMeasurementId(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID)
export const consentKey = 'tenrounds-analytics-consent'
export const consentEvent = 'tenrounds:analytics-consent'
const allowedPaths = [...publicSiteRoutes.map((route) => route.path), '/signup']

export function publicAnalyticsPath(pathname: string) {
  return analyticsPath(pathname, allowedPaths)
}

export function analyticsConsent(): AnalyticsConsentState {
  if (typeof window === 'undefined') return 'pending'
  if (navigator.doNotTrack === '1' || ('globalPrivacyControl' in navigator && navigator.globalPrivacyControl === true)) {
    return 'denied'
  }
  try {
    const stored = localStorage.getItem(consentKey)
    if (stored === null) return 'unset'
    return stored === 'granted' || stored === 'denied' ? stored : 'denied'
  } catch {
    return 'unavailable'
  }
}

export function trackFunnelEvent(event: FunnelEvent): boolean {
  if (
    typeof window === 'undefined' || !validMeasurementId(analyticsId) ||
    !window.tenroundsAnalyticsReady || analyticsMode(analyticsConsent()) === 'disabled' ||
    !FUNNEL_EVENTS.includes(event)
  ) return false
  const path = publicAnalyticsPath(window.location.pathname)
  if (!path) return false
  window.gtag?.('event', event, {
    send_to: analyticsId,
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: `TENROUNDS ${path}`,
    page_referrer: '',
  })
  return true
}

export function useFunnelMilestones(steps: Partial<Record<FunnelEvent, boolean>>) {
  const sent = useRef(new Set<FunnelEvent>())
  useEffect(() => {
    for (const [event, ready] of Object.entries(steps)) {
      const name = event as FunnelEvent
      if (ready && !sent.current.has(name) && trackFunnelEvent(name)) sent.current.add(name)
    }
  }, [steps])
}
