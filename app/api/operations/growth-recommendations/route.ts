import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEY = 'growth_recommendation_history_v1'
type Metrics = {
  seo: { clicks: number; previousClicks: number; impressions: number; previousImpressions: number; ctr: number; previousCtr: number; position: number; previousPosition: number }
  website: { trialVisitors: number; trialBookings: number; trialToBookingRate: number; campaignAttributedBookings: number; websiteVisitors: number | null; websiteToTrialRate: number | null; trialReached: number; members: number; memberRate: number | null }
}
type Recommendation = {
  id: string; baseId: string; area: 'search' | 'website'; title: string; insight: string; action: string
  kpi: string; metricKey: string; direction: 'up' | 'down'; baseline: number | null; baselineDate: string
  createdDate: string; status: 'open' | 'implemented' | 'dismissed'; implementedDate?: string
  outcome?: { checkedDate: string; value: number | null; delta: number | null; improved: boolean | null; summary: string }
}
type Store = { recommendations: Recommendation[]; lastReviewDate?: string; lastMetrics?: Metrics }

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
async function readStore(): Promise<Store> {
  const rows = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1)
  if (!rows[0]) return { recommendations: [] }
  try {
    const value = JSON.parse(rows[0].value) as Store
    return { recommendations: Array.isArray(value.recommendations) ? value.recommendations : [], lastReviewDate: value.lastReviewDate, lastMetrics: value.lastMetrics }
  } catch { return { recommendations: [] } }
}
async function writeStore(store: Store) {
  await db.insert(settings).values({ key: KEY, value: JSON.stringify(store), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(store), updatedAt: new Date() } })
}
function metricValue(metrics: Metrics, key: string): number | null {
  const value = key.split('.').reduce<unknown>((obj, part) => obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[part] : undefined, metrics)
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
function percent(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}
function candidate(metrics: Metrics) {
  const seoImpressionChange = percent(metrics.seo.impressions, metrics.seo.previousImpressions)
  const seoClickChange = percent(metrics.seo.clicks, metrics.seo.previousClicks)
  const ctr = metrics.seo.ctr
  const position = metrics.seo.position
  const trialRate = metrics.website.trialToBookingRate
  const memberRate = metrics.website.memberRate

  const search = seoImpressionChange <= -5
    ? { baseId: 'seo-reach', area: 'search' as const, title: 'Recover search visibility without sacrificing rankings', insight: `Impressions are ${Math.abs(seoImpressionChange)}% lower than the previous comparable window, while clicks are ${seoClickChange >= 0 ? 'still growing' : 'also declining'}.`, action: 'Review the pages and queries losing impressions in Search Console. Refresh the most relevant page with clearer local intent, stronger service detail and links from related pages. Recheck impressions and clicks in the next review.', kpi: 'Search impressions', metricKey: 'seo.impressions', direction: 'up' as const }
    : ctr < 5
      ? { baseId: 'seo-ctr', area: 'search' as const, title: 'Win more clicks from the rankings you already have', insight: `Organic CTR is ${ctr.toFixed(2)}%. There is room to earn more clicks from existing search visibility.`, action: 'Review the highest-impression queries and pages. Rewrite title tags and meta descriptions to make the Pretoria East location, 30-minute workout and free-trial offer clearer. Change only a small group first, then compare CTR.', kpi: 'Organic CTR', metricKey: 'seo.ctr', direction: 'up' as const }
      : position > 8
        ? { baseId: 'seo-position', area: 'search' as const, title: 'Push near-page-one pages higher', insight: `Average organic position is ${position.toFixed(1)}. Stronger page relevance and internal links may move valuable pages closer to the top results.`, action: 'Identify pages ranking between positions 8 and 20, strengthen their local service content and add contextual links from relevant high-traffic pages. Track average position for those pages.', kpi: 'Average position (lower is better)', metricKey: 'seo.position', direction: 'down' as const }
        : { baseId: 'seo-scale', area: 'search' as const, title: 'Scale the search topics already attracting clicks', insight: `Clicks are ${seoClickChange >= 0 ? 'up' : 'down'} ${Math.abs(seoClickChange)}% against the previous comparison window.`, action: 'Use Search Console query and landing-page reports to identify the strongest local-intent topics. Expand the best-performing topic into a useful supporting page and link it to the free-trial journey.', kpi: 'Organic clicks', metricKey: 'seo.clicks', direction: 'up' as const }

  const web = trialRate > 0 && trialRate < 35
    ? { baseId: 'web-booking', area: 'website' as const, title: 'Turn more free-trial visitors into bookings', insight: `${metrics.website.trialVisitors} trial-page visitors produced ${metrics.website.trialBookings} bookings, a ${trialRate.toFixed(1)}% page-to-booking rate in the available snapshot.`, action: 'Run a focused trial-page conversion test: make the booking action visible above the fold, shorten the explanatory copy before the form and repeat the “no payment, no obligation” reassurance beside the CTA. Change one element at a time and compare the next reporting window.', kpi: 'Trial-page → booking rate', metricKey: 'website.trialToBookingRate', direction: 'up' as const }
    : memberRate !== null && memberRate < 20
      ? { baseId: 'web-member', area: 'website' as const, title: 'Improve the hand-off from trial to membership', insight: `The current matured trial-to-member rate is ${memberRate.toFixed(1)}%.`, action: 'Introduce a consistent same-day follow-up: coach feedback, one clear membership recommendation and a direct signup link. Compare matured trial cohorts, not bookings whose appointment dates have not passed.', kpi: 'Matured trial → member rate', metricKey: 'website.memberRate', direction: 'up' as const }
      : metrics.website.campaignAttributedBookings === 0
        ? { baseId: 'web-campaign', area: 'website' as const, title: 'Make every campaign measurable', insight: 'No trial bookings in the available booking cohort are attributed to a tagged campaign yet. UTM capture is now being added to new trial bookings; older bookings will remain unattributed.', action: 'Use consistent UTM links for every paid and social campaign. Set utm_source, utm_medium, utm_campaign and utm_content, then compare campaign-attributed bookings and eventual member signups before increasing spend.', kpi: 'Campaign-attributed trial bookings', metricKey: 'website.campaignAttributedBookings', direction: 'up' as const }
        : { baseId: 'web-discovery', area: 'website' as const, title: 'Send more visitors into the free-trial journey', insight: metrics.website.websiteToTrialRate === null ? 'Website-wide visitor data is not available yet, so the top-of-site-to-trial-page rate cannot be measured reliably.' : `Only ${metrics.website.websiteToTrialRate.toFixed(1)}% of website visitors reached the trial page.`, action: 'Place a consistent free-trial CTA in the homepage hero and primary navigation, and add contextual trial links to How It Works and Pricing. Measure website visitors → trial-page visitors using the same analytics source.', kpi: 'Website → trial-page rate', metricKey: 'website.websiteToTrialRate', direction: 'up' as const }

  return [search, web]
}
function nextVariant(store: Store, baseId: string, date: string) {
  const matching = store.recommendations.filter(item => item.baseId === baseId)
  const todayItem = matching.find(item => item.createdDate === date && item.status !== 'dismissed')
  if (todayItem) return todayItem
  const open = matching.find(item => item.status === 'open')
  if (open) return open
  const count = matching.length + 1
  return null
}

export async function GET() {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Please sign in to Operations again.' }, { status: 401 })
  return NextResponse.json({ ...(await readStore()), today: today() })
}

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Please sign in to Operations again.' }, { status: 401 })
  let body: { action?: string; metrics?: Metrics; id?: string; status?: 'implemented' | 'dismissed' }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid recommendation request.' }, { status: 400 }) }
  const store = await readStore()
  const date = today()

  if (body.action === 'status') {
    const item = store.recommendations.find(row => row.id === body.id)
    if (!item || (body.status !== 'implemented' && body.status !== 'dismissed')) return NextResponse.json({ error: 'Recommendation not found.' }, { status: 404 })
    item.status = body.status
    if (body.status === 'implemented') {
      item.implementedDate = date
      item.baseline = body.metrics ? metricValue(body.metrics, item.metricKey) : item.baseline
      item.baselineDate = date
      item.outcome = undefined
    }
    await writeStore(store)
    return NextResponse.json(store)
  }

  if (body.action !== 'review' || !body.metrics) return NextResponse.json({ error: 'A metrics snapshot is required to review recommendations.' }, { status: 400 })
  const metrics = body.metrics
  for (const item of store.recommendations) {
    if (item.status !== 'implemented' || !item.implementedDate || item.implementedDate >= date || item.outcome?.checkedDate === date) continue
    const value = metricValue(metrics, item.metricKey)
    if (value === null || item.baseline === null) continue
    const delta = item.direction === 'down' ? item.baseline - value : value - item.baseline
    const improved = delta > 0
    item.outcome = { checkedDate: date, value, delta, improved, summary: improved ? 'The KPI moved in the intended direction since implementation.' : delta === 0 ? 'No measurable movement yet. Keep monitoring before drawing a conclusion.' : 'The KPI moved in the opposite direction. Review the change and consider a different action.' }
  }

  const generated = candidate(metrics)
  const chosen: Recommendation[] = []
  for (const item of generated) {
    const sameDay = store.recommendations.find(row => row.baseId === item.baseId && row.createdDate === date && row.status !== 'dismissed')
    const open = store.recommendations.find(row => row.baseId === item.baseId && row.status === 'open')
    if (sameDay || open) { chosen.push(sameDay || open!); continue }
    const count = store.recommendations.filter(row => row.baseId === item.baseId).length + 1
    const rec: Recommendation = {
      ...item,
      id: `${item.baseId}-${count}`,
      baseline: metricValue(metrics, item.metricKey),
      baselineDate: date,
      createdDate: date,
      status: 'open',
    }
    store.recommendations.push(rec)
    chosen.push(rec)
  }
  store.lastReviewDate = date
  store.lastMetrics = metrics
  store.recommendations = store.recommendations.slice(-60)
  await writeStore(store)
  return NextResponse.json({ recommendations: chosen, history: store.recommendations, lastReviewDate: date, today: date })
}
