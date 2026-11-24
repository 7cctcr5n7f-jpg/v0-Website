import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trialBookings, membershipSignups } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { buildSignupEmailIndex, getTrialConversion, normalizeEmail, ymdInJohannesburg } from '@/lib/trial-conversion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROJECT_ID = 'prj_DIBm3OOPBpElmYcj5MZyt6ct39vk'
const TEAM_ID = 'team_qi6ojsUiGfhb4tJghfTjsnIe'

type VisitCount = { visitors: number; pageviews: number }
type DailyVisit = { date: string; visitors: number; pageviews: number }

async function getVisitCount(token: string, since: string, until: string, filter?: string): Promise<VisitCount> {
  const url = new URL('https://api.vercel.com/v1/query/web-analytics/visits/count')
  url.searchParams.set('projectId', PROJECT_ID)
  url.searchParams.set('teamId', TEAM_ID)
  url.searchParams.set('since', since)
  url.searchParams.set('until', until)
  if (filter) url.searchParams.set('filter', filter)
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const body = await response.json() as { data?: VisitCount | VisitCount[]; error?: { message?: string }; message?: string }
  if (!response.ok) throw new Error(body.error?.message || body.message || `Vercel Web Analytics returned HTTP ${response.status}.`)
  const row = Array.isArray(body.data) ? body.data[0] : body.data
  if (!row || typeof row.visitors !== 'number' || typeof row.pageviews !== 'number') throw new Error('Vercel Web Analytics returned an unexpected count response.')
  return row
}

async function getDailyVisits(token: string, since: string, until: string, filter?: string): Promise<DailyVisit[]> {
  const url = new URL('https://api.vercel.com/v1/query/web-analytics/visits/aggregate')
  url.searchParams.set('projectId', PROJECT_ID)
  url.searchParams.set('teamId', TEAM_ID)
  url.searchParams.set('since', since)
  url.searchParams.set('until', until)
  url.searchParams.set('by', 'day')
  if (filter) url.searchParams.set('filter', filter)
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const body = await response.json() as { data?: Array<{ timestamp?: string; visitors?: number; pageviews?: number }>; error?: { message?: string }; message?: string }
  if (!response.ok) throw new Error(body.error?.message || body.message || `Vercel daily analytics returned HTTP ${response.status}.`)
  return (body.data || []).map(row => ({
    date: row.timestamp ? ymdInJohannesburg(new Date(row.timestamp)) : '',
    visitors: Number(row.visitors || 0),
    pageviews: Number(row.pageviews || 0),
  })).filter(row => row.date)
}

function inRange(value: Date | string, start: string, end: string) {
  const date = ymdInJohannesburg(new Date(value))
  return date >= start && date <= end
}

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Please sign in to Operations again.' }, { status: 401 })
  let body: { startDate?: string; endDate?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid date range.' }, { status: 400 }) }
  const { startDate, endDate } = body
  if (!startDate || !endDate || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDate) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: 'Choose a valid reporting window.' }, { status: 400 })
  }
  const token = process.env.VERCEL_ANALYTICS_TOKEN
  if (!token?.trim()) return NextResponse.json({ error: 'The deployed function cannot read VERCEL_ANALYTICS_TOKEN. Check the variable value and its Production/Preview environment, then redeploy this exact deployment.' }, { status: 503 })

  try {
    const [website, trialPage, websiteDaily, trialPageDaily, bookings, signups] = await Promise.all([
      getVisitCount(token, startDate, endDate),
      getVisitCount(token, startDate, endDate, "requestPath eq '/free-trial'"),
      getDailyVisits(token, startDate, endDate),
      getDailyVisits(token, startDate, endDate, "requestPath eq '/free-trial'"),
      db.select().from(trialBookings),
      db.select().from(membershipSignups),
    ])
    const cohort = bookings.filter(row => inRange(row.createdAt, startDate, endDate))
    const today = ymdInJohannesburg()
    const signupIndex = buildSignupEmailIndex(signups)
    const conversions = cohort.map(booking => ({ booking, conversion: getTrialConversion(booking, signupIndex, new Map(), today) }))
    const trialsReached = conversions.filter(row => row.booking.appointmentDate < today).length
    const convertedEmails = new Set(conversions
      .filter(row => row.conversion.status === 'converted' && (row.conversion.source === 'membership' || row.booking.manuallyConverted))
      .map(row => normalizeEmail(row.booking.email) || `manual-${row.booking.id}`))
    const members = convertedEmails.size
    const campaignAttributedBookings = cohort.filter(row => Boolean(row.utmSource || row.utmMedium || row.utmCampaign)).length
    const campaignBreakdown = Object.values(cohort.reduce<Record<string, { source: string; medium: string; campaign: string; bookings: number; members: number }>>((acc, row) => {
      if (!row.utmSource && !row.utmMedium && !row.utmCampaign) return acc
      const key = [row.utmSource || 'unknown', row.utmMedium || 'unknown', row.utmCampaign || 'untagged'].join('|')
      if (!acc[key]) acc[key] = { source: row.utmSource || 'unknown', medium: row.utmMedium || 'unknown', campaign: row.utmCampaign || 'untagged', bookings: 0, members: 0 }
      acc[key].bookings += 1
      const converted = conversions.find(item => item.booking.id === row.id)?.conversion.status === 'converted'
      if (converted) acc[key].members += 1
      return acc
    }, {}))
    const rate = (numerator: number, denominator: number) => denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0
    return NextResponse.json({
      dateRange: { startDate, endDate },
      refreshedAt: new Date().toISOString(),
      website: { visitors: website.visitors, pageviews: website.pageviews, daily: websiteDaily },
      trialPage: { visitors: trialPage.visitors, pageviews: trialPage.pageviews, daily: trialPageDaily },
      bookings: cohort.length, trialsReached, members,
      campaigns: { attributedBookings: campaignAttributedBookings, unattributedBookings: cohort.length - campaignAttributedBookings, breakdown: campaignBreakdown },
      rates: {
        websiteToTrialPage: rate(trialPage.visitors, website.visitors),
        trialPageToBooking: rate(cohort.length, trialPage.visitors),
        bookingToTrialReached: rate(trialsReached, cohort.length),
        trialReachedToMember: rate(members, trialsReached),
        websiteToMember: rate(members, website.visitors),
      },
      notes: { trialReached: 'Scheduled trial appointment date has passed. This is the existing reporting proxy; the database does not record physical attendance.' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load the growth funnel.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
