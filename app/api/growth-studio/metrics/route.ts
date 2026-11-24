import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { trialBookings, membershipSignups, sessionPurchases } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { buildSignupEmailIndex, getTrialConversion, ymdInJohannesburg, normalizeEmail } from '@/lib/trial-conversion'

export const dynamic = 'force-dynamic'

function monthKey(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit' }).format(new Date(value)).slice(0, 7)
}

export async function GET() {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [trials, signups, purchases] = await Promise.all([
      db.select().from(trialBookings).orderBy(desc(trialBookings.createdAt)),
      db.select().from(membershipSignups).orderBy(desc(membershipSignups.createdAt)),
      db.select().from(sessionPurchases).orderBy(desc(sessionPurchases.createdAt)),
    ])
    const today = ymdInJohannesburg()
    const currentMonth = today.slice(0, 7)
    const signupIndex = buildSignupEmailIndex(signups)
    const cohort = trials.map(booking => ({ booking, conversion: getTrialConversion(booking, signupIndex, new Map(), today) }))
    const monthTrials = cohort.filter(row => monthKey(row.booking.createdAt) === currentMonth)
    const monthSignups = signups.filter(row => monthKey(row.createdAt) === currentMonth)
    const matchedEmails = new Set(monthTrials.filter(row => row.conversion.status === 'converted' || row.booking.manuallyConverted).map(row => normalizeEmail(row.booking.email)).filter(Boolean))
    const manualConversions = monthTrials.filter(row => row.booking.manuallyConverted && !normalizeEmail(row.booking.email)).length
    const matched = matchedEmails.size + manualConversions
    const paidSessionRevenue = purchases.filter(row => row.paymentStatus === 'Paid').reduce((sum, row) => sum + Number(row.amount || 0), 0)
    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      period: currentMonth,
      trials: { total: trials.length, month: monthTrials.length },
      members: { month: monthSignups.length, matchedFromTrials: Math.min(matched, monthSignups.length) },
      conversion: { rate: monthTrials.length ? Math.round(matched / monthTrials.length * 100) : null },
      attendance: { value: null, reason: 'Attendance is not currently stored as a verified field in the website database.' },
      retention: { value: null, reason: 'Reliable active-member and cancellation history is not currently available.' },
      campaignRoi: { value: null, reason: 'Campaign-level spend and attributed membership revenue are not yet joined.' },
      revenue: { paidSessionPurchases: paidSessionRevenue, currency: 'ZAR' },
      sources: ['trial_bookings', 'membership_signups', 'session_purchases'],
    })
  } catch (error) {
    console.error('[growth-studio/metrics]', error)
    return NextResponse.json({ error: 'Could not load Growth Studio metrics.' }, { status: 500 })
  }
}
