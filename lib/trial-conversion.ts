import type { MembershipSignup, SessionPurchase, TrialBooking } from '@/lib/db/schema'

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

export function sessionPurchaseOccurredAt(purchase: SessionPurchase): Date {
  return new Date(purchase.paidAt ?? purchase.createdAt)
}

export function isPaidSessionPurchase(purchase: SessionPurchase): boolean {
  return purchase.paymentStatus === 'Paid'
}

export function isQualifyingSessionPurchase(purchase: SessionPurchase): boolean {
  // A pending checkout is not a conversion. Only a confirmed paid pack counts.
  if (!isPaidSessionPurchase(purchase)) return false
  return purchase.packQuantity >= 30 || purchase.totalSessions >= 30
}

function trialAppointmentAt(booking: TrialBooking): Date {
  // TENROUNDS operates in South Africa (UTC+02:00 year-round).
  return new Date(`${booking.appointmentDate}T${booking.appointmentTime}:00+02:00`)
}

function occurredAfterTrial(booking: TrialBooking, occurredAt: Date): boolean {
  const appointmentAt = trialAppointmentAt(booking)
  return !Number.isNaN(appointmentAt.getTime()) && occurredAt.getTime() >= appointmentAt.getTime()
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

// Map normalised email -> most recent paid session purchase for that email.
export function buildSessionPurchaseEmailIndex(purchases: SessionPurchase[]): Map<string, SessionPurchase> {
  const map = new Map<string, SessionPurchase>()
  for (const purchase of purchases) {
    if (!isQualifyingSessionPurchase(purchase)) continue
    const key = normalizeEmail(purchase.email)
    if (!key) continue
    const existing = map.get(key)
    if (!existing || sessionPurchaseOccurredAt(purchase) > sessionPurchaseOccurredAt(existing)) {
      map.set(key, purchase)
    }
  }
  return map
}

export function uniqueQualifyingSessionPurchases(purchases: SessionPurchase[]): SessionPurchase[] {
  return [...buildSessionPurchaseEmailIndex(purchases).values()].sort(
    (a, b) => sessionPurchaseOccurredAt(b).getTime() - sessionPurchaseOccurredAt(a).getTime(),
  )
}

export type TrialConversionStatus = 'converted' | 'upcoming' | 'not_converted'
export type TrialConversionSource = 'membership' | 'sessions' | null

export interface TrialConversion {
  status: TrialConversionStatus
  signup: MembershipSignup | null
  sessionPurchase: SessionPurchase | null
  source: TrialConversionSource
  packageLabel: string | null
}

// A trial converts if a membership exists for its email. Otherwise it is
// "upcoming" while its date is today or later, and "not converted" once it has passed.
export function getTrialConversion(
  booking: TrialBooking,
  signupIndex: Map<string, MembershipSignup>,
  sessionPurchaseIndex: Map<string, SessionPurchase>,
  todayYmd: string,
): TrialConversion {
  // A membership must never convert a trial that has not happened yet.
  if (booking.appointmentDate > todayYmd) {
    return { status: 'upcoming', signup: null, sessionPurchase: null, source: null, packageLabel: null }
  }
  if (booking.manuallyConverted) {
    return { status: 'converted', signup: null, sessionPurchase: null, source: 'membership', packageLabel: 'Manual' }
  }
  const key = normalizeEmail(booking.email)
  const indexedSignup = signupIndex.get(key) ?? null
  const signup = indexedSignup && occurredAfterTrial(booking, new Date(indexedSignup.createdAt))
    ? indexedSignup
    : null
  if (signup) {
    return {
      status: 'converted',
      signup,
      sessionPurchase: null,
      source: 'membership',
      packageLabel: membershipPackageLabel(signup),
    }
  }
  const indexedSessionPurchase = sessionPurchaseIndex.get(key) ?? null
  const sessionPurchase = indexedSessionPurchase && occurredAfterTrial(booking, sessionPurchaseOccurredAt(indexedSessionPurchase))
    ? indexedSessionPurchase
    : null
  if (sessionPurchase) {
    return {
      status: 'converted',
      signup: null,
      sessionPurchase,
      source: 'sessions',
      packageLabel: 'Sessions',
    }
  }
  if (booking.appointmentDate >= todayYmd) {
    return { status: 'upcoming', signup: null, sessionPurchase: null, source: null, packageLabel: null }
  }
  return { status: 'not_converted', signup: null, sessionPurchase: null, source: null, packageLabel: null }
}
