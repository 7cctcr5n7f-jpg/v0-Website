import type { MembershipSignup, TrialBooking } from '@/lib/db/schema'

// YYYY-MM-DD for the gym's timezone (South Africa) — stable across server/client renders.
export function ymdInJohannesburg(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

// e.g. "12 Month Unlimited"
export function membershipPackageLabel(s: MembershipSignup): string {
  const months = s.contractLength > 0 ? `${s.contractLength} Month` : ''
  const tier = (s.accessType || '').trim()
  const label = [months, tier].filter(Boolean).join(' ').trim()
  return label || s.accessType || s.membershipType || 'Member'
}

// Map normalised email -> most recent membership signup for that email.
export function buildSignupEmailIndex(signups: MembershipSignup[]): Map<string, MembershipSignup> {
  const map = new Map<string, MembershipSignup>()
  for (const s of signups) {
    const key = normalizeEmail(s.email)
    if (!key) continue
    const existing = map.get(key)
    if (!existing || new Date(s.createdAt) > new Date(existing.createdAt)) {
      map.set(key, s)
    }
  }
  return map
}

export type TrialConversionStatus = 'converted' | 'upcoming' | 'not_converted'

export interface TrialConversion {
  status: TrialConversionStatus
  signup: MembershipSignup | null
  packageLabel: string | null
}

// A trial converts if a membership exists for its email. Otherwise it is
// "upcoming" while its date is today or later, and "not converted" once it has passed.
export function getTrialConversion(
  booking: TrialBooking,
  index: Map<string, MembershipSignup>,
  todayYmd: string,
): TrialConversion {
  const signup = index.get(normalizeEmail(booking.email)) ?? null
  if (signup) {
    return { status: 'converted', signup, packageLabel: membershipPackageLabel(signup) }
  }
  if (booking.appointmentDate >= todayYmd) {
    return { status: 'upcoming', signup: null, packageLabel: null }
  }
  return { status: 'not_converted', signup: null, packageLabel: null }
}
