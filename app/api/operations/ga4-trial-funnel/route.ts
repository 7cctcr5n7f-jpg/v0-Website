import { createSign } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '338885680'

type DateRange = { startDate: string; endDate: string }
type MetricName = 'activeUsers' | 'sessions' | 'screenPageViews' | 'eventCount'

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function makeAssertion(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: GA4_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${payload}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  return `${unsigned}.${signer.sign(privateKey).toString('base64url')}`
}

async function getAccessToken() {
  const clientEmail = process.env.GA4_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!clientEmail || !privateKey) {
    throw new Error('GA4 reporting credentials are not configured in Vercel yet. Add GA4_SERVICE_ACCOUNT_EMAIL and GA4_SERVICE_ACCOUNT_PRIVATE_KEY, then grant the service account Viewer access to the GA4 property.')
  }

  const assertion = makeAssertion(clientEmail, privateKey)
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  })
  const token = await response.json() as { access_token?: string; error_description?: string; error?: string }
  if (!response.ok || !token.access_token) {
    throw new Error(`Google authentication failed: ${token.error_description || token.error || 'Unable to obtain an access token'}`)
  }
  return token.access_token
}

function exactFilter(fieldName: string, value: string) {
  return {
    filter: {
      fieldName,
      stringFilter: { matchType: 'EXACT', value, caseSensitive: true },
    },
  }
}

function andFilter(...expressions: ReturnType<typeof exactFilter>[]) {
  return { andGroup: { expressions } }
}

async function runReport(accessToken: string, dateRange: DateRange, metricNames: MetricName[], dimensionFilters: unknown) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      metrics: metricNames.map(name => ({ name })),
      dimensionFilter: dimensionFilters,
      keepEmptyRows: true,
    }),
    cache: 'no-store',
  })
  const body = await response.json() as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>
    error?: { message?: string }
  }
  if (!response.ok) throw new Error(body.error?.message || 'Google Analytics could not run the report.')
  return (body.rows?.[0]?.metricValues || []).map(value => Number(value.value || 0))
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Please sign in to the Operations dashboard again.' }, { status: 401 })

  let body: Partial<DateRange>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid refresh request.' }, { status: 400 })
  }
  const { startDate, endDate } = body
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
    return NextResponse.json({ error: 'Choose a valid date range.' }, { status: 400 })
  }
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000
  if (days > 92) return NextResponse.json({ error: 'Please choose a date range of 92 days or less.' }, { status: 400 })

  try {
    const accessToken = await getAccessToken()
    const trialPageFilter = exactFilter('pagePath', '/free-trial')
    const [landing, booked, cta, form] = await Promise.all([
      runReport(accessToken, { startDate, endDate }, ['activeUsers', 'sessions', 'screenPageViews'], trialPageFilter),
      runReport(accessToken, { startDate, endDate }, ['activeUsers', 'eventCount'], andFilter(trialPageFilter, exactFilter('eventName', 'trial_success'))),
      runReport(accessToken, { startDate, endDate }, ['eventCount'], exactFilter('eventName', 'trial_cta_click')),
      runReport(accessToken, { startDate, endDate }, ['eventCount'], andFilter(trialPageFilter, exactFilter('eventName', 'trial_form_view'))),
    ])

    const visitors = landing[0] || 0
    const bookedUsers = booked[0] || 0
    return NextResponse.json({
      dateRange: { startDate, endDate },
      refreshedAt: new Date().toISOString(),
      visitors,
      sessions: landing[1] || 0,
      pageViews: landing[2] || 0,
      bookedUsers,
      successfulBookings: booked[1] || 0,
      notBookedUsers: Math.max(0, visitors - bookedUsers),
      conversionRate: visitors ? (bookedUsers / visitors) * 100 : 0,
      dataStatus: visitors > 0 || bookedUsers > 0 || (cta[0] || 0) > 0 || (form[0] || 0) > 0 ? 'active' : 'no_activity',
      ctaClicks: cta[0] || 0,
      formViews: form[0] || 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Analytics refresh failed.'
    const status = message.includes('credentials are not configured') ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
