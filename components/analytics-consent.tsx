'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import {
  analyticsConsent, analyticsId, consentEvent, consentKey,
  publicAnalyticsPath, trackFunnelEvent,
} from '@/lib/analytics'
import { analyticsMode, validMeasurementId } from '@/lib/funnel-events'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(consentEvent, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(consentEvent, callback)
  }
}

function forgetAnalyticsCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (!/^_ga(?:_|$)/.test(name)) continue
    const expired = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
    document.cookie = expired
    document.cookie = `${expired}; Domain=${window.location.hostname}`
  }
}

export function AnalyticsConsent() {
  const pathname = usePathname()
  const consent = useSyncExternalStore(subscribe, analyticsConsent, () => 'pending' as const)
  const mode = analyticsMode(consent)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [prepared, setPrepared] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const lastPage = useRef<string | null>(null)
  const initialized = useRef(false)
  const preferencesPanel = useRef<HTMLElement>(null)
  const preferencesTrigger = useRef<HTMLButtonElement>(null)
  const path = publicAnalyticsPath(pathname)
  const configured = validMeasurementId(analyticsId)

  function choose(granted: boolean) {
    try {
      if (!granted) {
        if (configured) window[`ga-disable-${analyticsId}`] = true
        window.tenroundsAnalyticsReady = false
        window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
        forgetAnalyticsCookies()
      }
      localStorage.setItem(consentKey, granted ? 'granted' : 'denied')
      window.dispatchEvent(new Event(consentEvent))
      setPreferencesOpen(false)
      preferencesTrigger.current?.focus({ preventScroll: true })
      setStorageError(false)
    } catch {
      if (configured) window[`ga-disable-${analyticsId}`] = true
      window.tenroundsAnalyticsReady = false
      setStorageError(true)
    }
  }

  useEffect(() => {
    const panel = preferencesPanel.current
    if (!preferencesOpen || !panel) return
    panel.focus({ preventScroll: true })
    panel.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
  }, [preferencesOpen])

  useEffect(() => {
    if (!configured) return
    const enabled = mode !== 'disabled' && !storageError && path !== null
    window[`ga-disable-${analyticsId}`] = !enabled
    window.tenroundsAnalyticsReady = false
    if (!enabled) {
      lastPage.current = null
      return
    }
    if (mode === 'cookieless') forgetAnalyticsCookies()
    window.dataLayer ??= []
    window.gtag ??= function () {
      // eslint-disable-next-line prefer-rest-params -- Google expects an Arguments command, not an array.
      window.dataLayer?.push(arguments)
    }
    const pageSettings = {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ads_data_redaction: true,
      url_passthrough: false,
      page_location: `${window.location.origin}${path}`,
      page_referrer: '',
      page_title: `TENROUNDS ${path}`,
    }
    if (!initialized.current) {
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
    }
    window.gtag('set', pageSettings)
    if (!initialized.current) {
      window.gtag('js', new Date())
      initialized.current = true
    }
    window.gtag('consent', 'update', { analytics_storage: mode === 'full' ? 'granted' : 'denied' })
    window.gtag('config', analyticsId, pageSettings)
    setPrepared(true)
    if (!loaded) return
    window.tenroundsAnalyticsReady = true
    if (lastPage.current !== path) {
      window.gtag('event', 'page_view', {
        send_to: analyticsId,
        page_location: `${window.location.origin}${path}`,
        page_path: path,
        page_title: `TENROUNDS ${path}`,
        page_referrer: '',
      })
      if (path === '/free-trial') trackFunnelEvent('trial_form_view')
      if (path === '/signup') trackFunnelEvent('membership_form_view')
      lastPage.current = path
    }
  }, [configured, mode, storageError, path, loaded])

  useEffect(() => {
    if (!configured || mode === 'disabled' || storageError || !path) return
    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return
      const anchor = event.target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement) || anchor.origin !== window.location.origin) return
      if (anchor.pathname === '/free-trial') trackFunnelEvent('trial_cta_click')
      if (anchor.pathname === '/signup') trackFunnelEvent('membership_cta_click')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [configured, mode, storageError, path])

  if (!configured || !path) return null

  return (
    <>
      {mode !== 'disabled' && !storageError && prepared ? (
        <Script
          id="tenrounds-ga4"
          src={`https://www.googletagmanager.com/gtm.js?id=${analyticsId}`}
          strategy="afterInteractive"
          onReady={() => setLoaded(true)}
          onError={() => console.warn('[analytics] Optional analytics could not load; website forms remain available.')}
        />
      ) : null}
      <div className="border-t border-steel bg-charcoal px-5 py-3 text-center">
        <button
          ref={preferencesTrigger}
          type="button"
          aria-expanded={preferencesOpen}
          aria-controls="analytics-preferences"
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true })
            setPreferencesOpen(!preferencesOpen)
          }}
          className="text-xs text-light-grey underline hover:text-foreground"
        >
          Analytics preferences
        </button>
        {preferencesOpen ? (
          <section
            ref={preferencesPanel}
            id="analytics-preferences"
            aria-label="Optional analytics preferences"
            tabIndex={-1}
            className="mx-auto mt-3 max-w-xl scroll-mt-24 rounded-lg border border-steel p-4 text-left text-foreground"
          >
            <p className="text-sm font-bold">Analytics preferences</p>
            <p className="mt-2 text-xs leading-relaxed text-light-grey">
              Google Analytics sends limited measurements without analytics cookies unless you allow them.
              Google still receives network and device information. We do not send form answers, contact or banking details.
              You can turn analytics off completely.
            </p>
            <p className="mt-2 text-xs text-light-grey">
              {mode === 'full' && !storageError
                ? 'Analytics cookies are enabled with your permission.'
                : mode === 'cookieless' && !storageError
                  ? 'Limited cookieless measurement is on.'
                  : 'Optional analytics is off.'}
            </p>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => choose(false)} className="flex-1 rounded-md border border-steel px-3 py-2 text-sm font-bold hover:border-neon-blue">
                Turn off analytics
              </button>
              <button type="button" onClick={() => choose(true)} className="flex-1 rounded-md border border-steel px-3 py-2 text-sm font-bold hover:border-neon-blue">
                Allow analytics cookies
              </button>
            </div>
            {storageError || consent === 'unavailable' ? (
              <p role="alert" className="mt-2 text-xs text-amber-300">Your preference could not be saved. Optional analytics remains off.</p>
            ) : null}
            <p className="mt-2 text-xs text-light-grey">Browser Do Not Track and Global Privacy Control settings always take priority.</p>
          </section>
        ) : null}
      </div>
    </>
  )
}
