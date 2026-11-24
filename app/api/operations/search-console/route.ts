import { createSign } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:tenrounds.co.za'

type SearchRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }
type QueryRequest = { startDate: string; endDate: string; dimensions: string[]; rowLimit: number; startRow: number; dataState: 'final' }

function base64Url(value: string | Buffer) { return Buffer.from(value).toString('base64url') }

async function accessToken() {
  const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL || process.env.GA4_SERVICE_ACCOUNT_EMAIL
  const key = (process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY)?.replace(/\\n/g, '\n')
  if (!email?.trim() || !key?.trim()) {
    throw new Error('Search Console credentials are not configured. Add GSC_SERVICE_ACCOUNT_EMAIL and GSC_SERVICE_ACCOUNT_PRIVATE_KEY in Vercel, then grant that service account access to the Search Console property.')
  }
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }))
  const unsigned = header + '.' + payload
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const assertion = unsigned + '.' + signer.sign(key).toString('base64url')
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  })
  const result = await response.json() as { access_token?: string; error?: string; error_description?: string }
  if (!response.ok || !result.access_token) throw new Error('Google authentication failed: ' + (result.error_description || result.error || 'Could not obtain access token'))
  return result.access_token
}

async function query(token: string, startDate: string, endDate: string, dimensions: string[]): Promise<SearchRow[]> {
  const request: QueryRequest = { startDate, endDate, dimensions, rowLimit: 25000, startRow: 0, dataState: 'final' }
  const url = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(SITE_URL) + '/searchAnalytics/query'
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    cache: 'no-store',
  })
  const result = await response.json() as { rows?: SearchRow[]; error?: { message?: string } }
  if (!response.ok) throw new Error(result.error?.message || 'Search Console API request failed with HTTP ' + response.status)
  return result.rows || []
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Please sign in to Operations again.' }, { status: 401 })
  let body: { startDate?: unknown; endDate?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid Search Console reporting window.' }, { status: 400 }) }
  const { startDate, endDate } = body
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) return NextResponse.json({ error: 'Choose a valid Search Console reporting window.' }, { status: 400 })
  const days = (Date.parse(endDate + 'T00:00:00Z') - Date.parse(startDate + 'T00:00:00Z')) / 86400000
  if (days > 92) return NextResponse.json({ error: 'Search Console detail is limited to 92 days per review.' }, { status: 400 })
  try {
    const token = await accessToken()
    const [daily, pages, queries] = await Promise.all([
      query(token, startDate, endDate, ['date']),
      query(token, startDate, endDate, ['page']),
      query(token, startDate, endDate, ['query']),
    ])
    const totals = daily.reduce((sum, row) => ({
      clicks: sum.clicks + Number(row.clicks || 0),
      impressions: sum.impressions + Number(row.impressions || 0),
    }), { clicks: 0, impressions: 0 })
    return NextResponse.json({
      property: SITE_URL,
      dateRange: { startDate, endDate },
      refreshedAt: new Date().toISOString(),
      dataState: 'final',
      totals: { ...totals, ctr: totals.impressions ? totals.clicks / totals.impressions : 0 },
      daily: daily.map(row => ({ date: row.keys?.[0] || '', clicks: Number(row.clicks || 0), impressions: Number(row.impressions || 0), ctr: Number(row.ctr || 0), position: Number(row.position || 0) })),
      pages: pages.slice(0, 50).map(row => ({ page: row.keys?.[0] || '', clicks: Number(row.clicks || 0), impressions: Number(row.impressions || 0), ctr: Number(row.ctr || 0), position: Number(row.position || 0) })),
      queries: queries.slice(0, 50).map(row => ({ query: row.keys?.[0] || '', clicks: Number(row.clicks || 0), impressions: Number(row.impressions || 0), ctr: Number(row.ctr || 0), position: Number(row.position || 0) })),
      notes: ['Search Console final data is normally delayed by a few days.', 'Google may omit anonymized queries and limit returned rows. Page and query totals can therefore differ from property-level totals.'],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search Console refresh failed.'
    const status = message.includes('credentials are not configured') ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
