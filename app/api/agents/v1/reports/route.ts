import { and, count, gte, lt, sql } from 'drizzle-orm'
import { agentJson, agentReportWindow, authorizeAgentRequest } from '@/lib/agent-api'
import { db } from '@/lib/db'
import { membershipSignups, trialBookings } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = authorizeAgentRequest(request, 'metrics:read')
  if (denied) return denied

  let window: ReturnType<typeof agentReportWindow>
  try {
    window = agentReportWindow(new URL(request.url))
  } catch {
    return agentJson({ error: 'Provide valid start/end dates (YYYY-MM-DD), at most 93 inclusive days.' }, 400)
  }

  try {
    const bookingDay = sql<string>`to_char(${trialBookings.createdAt} at time zone 'Africa/Johannesburg', 'YYYY-MM-DD')`
    const signupDay = sql<string>`to_char(${membershipSignups.createdAt} at time zone 'Africa/Johannesburg', 'YYYY-MM-DD')`
    // Aggregate in SQL: never load customer rows, signatures or banking details.
    const [bookings, signups] = await Promise.all([
      db.select({ date: bookingDay, total: count() }).from(trialBookings)
        .where(and(gte(trialBookings.createdAt, window.from), lt(trialBookings.createdAt, window.until)))
        .groupBy(bookingDay),
      db.select({ date: signupDay, total: count() }).from(membershipSignups)
        .where(and(gte(membershipSignups.createdAt, window.from), lt(membershipSignups.createdAt, window.until)))
        .groupBy(signupDay),
    ])
    const bookingCounts = new Map(bookings.map((row) => [row.date, row.total]))
    const signupCounts = new Map(signups.map((row) => [row.date, row.total]))
    const daily = []
    for (let cursor = Date.parse(window.start); cursor <= Date.parse(window.end); cursor += 86400000) {
      const date = new Date(cursor).toISOString().slice(0, 10)
      daily.push({
        date,
        trialBookings: bookingCounts.get(date) ?? 0,
        membershipSignups: signupCounts.get(date) ?? 0,
      })
    }

    return agentJson({
      version: '1.0',
      generatedAt: new Date().toISOString(),
      period: { start: window.start, end: window.end, timeZone: 'Africa/Johannesburg', inclusive: true },
      totals: {
        trialBookings: bookings.reduce((total, row) => total + row.total, 0),
        membershipSignups: signups.reduce((total, row) => total + row.total, 0),
      },
      daily,
      definitions: {
        trialBookings: 'Saved bookings by submission date, not attendance or unique people.',
        membershipSignups: 'Saved applications by submission date, including later cancellations; not paid or active memberships.',
      },
      funnel: {
        source: 'Google Analytics 4 (separate read-only account access required)',
        availableInThisResponse: false,
        warning: 'Submission counts are not a conversion rate. Historical form abandonment cannot be reconstructed from these records.',
      },
    })
  } catch {
    console.error('[agents/reports] Failed to load aggregate conversion counts.')
    return agentJson({ error: 'Reports are temporarily unavailable.' }, 503)
  }
}
