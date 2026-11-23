export const FUNNEL_EVENTS = [
  'trial_cta_click',
  'whatsapp_click',
  'phone_click',
  'membership_cta_click',
  'trial_form_view',
  'trial_form_start',
  'trial_details_complete',
  'trial_slot_selected',
  'trial_agreements_complete',
  'trial_submit',
  'trial_error',
  'trial_success',
  'membership_form_view',
  'membership_form_start',
  'membership_details_complete',
  'membership_payment_complete',
  'membership_agreements_complete',
  'membership_validation_error',
  'membership_submit',
  'membership_error',
  'membership_success',
] as const

export type FunnelEvent = typeof FUNNEL_EVENTS[number]
export type AnalyticsConsentState = 'granted' | 'denied' | 'unset' | 'unavailable' | 'pending'

export function analyticsMode(consent: AnalyticsConsentState): 'full' | 'cookieless' | 'disabled' {
  if (consent === 'granted') return 'full'
  return consent === 'unset' ? 'cookieless' : 'disabled'
}

export function analyticsPath(pathname: string, allowedPaths: readonly string[]): string | null {
  // Only exact known routes are accepted; never send query strings, hashes or IDs.
  return allowedPaths.includes(pathname) ? pathname : null
}

export function resolveMeasurementId(override?: string): string {
  return override ?? 'G-3R4THL02Y6'
}

export function validMeasurementId(value: string | undefined): value is string {
  return typeof value === 'string' && /^G-[A-Z0-9]{4,20}$/.test(value)
}
