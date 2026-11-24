import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEY = 'growth_recommendation_history_v1'
type SearchDetail = { pages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>; queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }> }
type Metrics = {
  searchDetail?: SearchDetail
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
const ACTION_VARIANTS: Record<string, Array<{ title: string; action: string }>> = {
  'seo-canonical': [
    { title: 'Consolidate duplicate homepage URL signals', action: 'Confirm HTTP permanently redirects to HTTPS, the canonical points to the HTTPS URL, and all sitemap/internal links use the preferred hostname. Check Search Console again after recrawl.' },
    { title: 'Audit preferred hostname consistency', action: 'Check both www and non-www variants, protocol redirects, canonical tags and sitemap URLs. Select one canonical hostname and ensure every alternate version redirects to it.' },
    { title: 'Remove alternate homepage URLs from internal links', action: 'Search the site for old HTTP or alternate-hostname links and update them to the canonical HTTPS homepage. Re-submit the sitemap after validating redirects.' },
  ],
  'seo-page-ctr': [
    { title: 'Rewrite the title and description for the highest-impression page', action: 'Make the page title specific to the service and Pretoria East. Use the description to explain the 30-minute workout and why the free trial is worth clicking. Compare page-level CTR after the update.' },
    { title: 'Align the landing page headline with its search snippet', action: 'Ensure the page H1 and first screen deliver exactly what the title and description promise. Add concise answers to the questions searchers are likely to have, then measure CTR and engagement.' },
    { title: 'Add stronger local proof to the search landing page', action: 'Add accurate location details, coach-supported session information and genuine customer proof to the high-impression page. Keep title and meta copy distinct from other service pages.' },
  ],
  'seo-query-intent': [
    { title: 'Improve the landing page for the selected high-intent query', action: 'Match the page title, opening copy and FAQs to the exact query intent. Make the free-trial next step prominent and compare clicks and CTR for that query.' },
    { title: 'Add a useful answer for the selected search query', action: 'Add a short, original section that answers the selected query directly. Avoid keyword stuffing. Link the answer to the relevant service page and free-trial booking.' },
    { title: 'Strengthen the query-to-trial journey', action: 'Check whether the page ranking for this query offers a clear next step. Add one contextual free-trial CTA and track trial-page visits from the organic landing page.' },
  ],

  'seo-reach': [
    { title: 'Recover search visibility on pages losing impressions', action: 'Open Search Console and compare page/query pairs against the previous period. Pick the three pages with the largest impression losses, refresh their local service detail and add internal links from relevant pages. Recheck impressions next review.' },
    { title: 'Build content around proven local search demand', action: 'Use Search Console queries with rising impressions but weak clicks to choose one focused Pretoria East topic. Add a genuinely useful section to the most relevant page before creating a new page. Measure impressions and clicks for that query group.' },
    { title: 'Strengthen local relevance on your highest-value pages', action: 'Review the key service pages for clear Garsfontein and Pretoria East relevance, accurate service descriptions, useful FAQs and links to the free-trial journey. Compare page-level impressions after the changes.' },
  ],
  'seo-ctr': [
    { title: 'Win more clicks from the rankings you already have', action: 'Rewrite title tags and meta descriptions for the highest-impression pages. Lead with the local benefit, 30-minute workout and free-trial offer. Change a small group first and compare CTR.' },
    { title: 'Make search snippets more compelling', action: 'Review the search result wording for the pages with the most impressions. Make each title distinct, state the specific service and location, and use the description to answer why a first-time visitor should choose TENROUNDS.' },
    { title: 'Test stronger local proof in search snippets', action: 'Where accurate and supported on-page, bring coach support, beginner friendliness, 30-minute sessions and genuine review proof into page titles/descriptions. Avoid repeating the same title pattern across every page.' },
  ],
  'seo-position': [
    { title: 'Push near-page-one pages higher', action: 'Identify pages ranking between positions 8 and 20. Improve the page that best matches local search intent, add missing useful detail and link to it from relevant high-visibility pages. Track its average position.' },
    { title: 'Improve internal links to priority service pages', action: 'Choose one valuable page outside the top results and add contextual links from the homepage, How It Works and related service content. Use natural descriptive anchor text and measure page-level position.' },
    { title: 'Close the content gap on a priority search page', action: 'Compare the top-ranking local results with one TENROUNDS page. Identify missing questions or practical details, add original useful content, and check whether impressions and average position improve.' },
  ],
  'seo-scale': [
    { title: 'Expand the local topic already earning clicks', action: 'Find the best-performing non-brand query and its landing page in Search Console. Add a supporting section that answers the next question a searcher is likely to have, then link it to the free-trial page.' },
    { title: 'Turn organic visits into measurable trial interest', action: 'Add a contextual free-trial link to the organic landing pages receiving the most clicks. Use a consistent CTA and measure trial-page visits from those entry pages.' },
    { title: 'Protect the search gains with a focused content refresh', action: 'Refresh one established organic landing page with current, accurate service details, stronger internal links and helpful FAQs. Record its baseline clicks, impressions and position before editing.' },
  ],
  'web-booking': [
    { title: 'Make the free-trial booking action clearer', action: 'Make the booking action visible above the fold, shorten the copy before the form and repeat “no payment, no obligation” beside the CTA. Change one element at a time and compare the next page-to-booking rate.' },
    { title: 'Reduce friction in the trial booking form', action: 'Review the form on a phone. Make the next step obvious, keep field labels clear and explain why date/time and agreement details are needed. Do not remove legally required agreements. Compare form starts with successful bookings.' },
    { title: 'Add reassurance at the moment of booking', action: 'Place concise beginner reassurance, what to bring, session length and a genuine review near the booking decision. Keep the calendar and booking action visually prominent, then compare booking completion.' },
  ],
  'web-member': [
    { title: 'Improve the first follow-up after a trial', action: 'Create a same-day follow-up routine: personal coach feedback, one recommended membership and a direct signup link. Compare matured trial cohorts rather than appointments that have not happened yet.' },
    { title: 'Make the trial-to-membership next step personal', action: 'Have the coach record one goal and one positive observation after the session, then use both in a personal follow-up. Measure membership signups among trials whose appointment dates have passed.' },
    { title: 'Remove uncertainty from the membership decision', action: 'Make pricing, what is included and how to start easy to understand after the trial. Give each trial visitor one clear next step rather than several competing offers.' },
  ],
  'web-campaign': [
    { title: 'Tag every paid and social campaign consistently', action: 'Use utm_source, utm_medium, utm_campaign and utm_content on each campaign link. Keep naming consistent between Meta, Google and social posts. New trial bookings now store first-touch campaign tags after analytics consent.' },
    { title: 'Compare campaign quality, not just click volume', action: 'For the next campaign, use a unique campaign and creative UTM value. Compare tagged trial bookings and later matched memberships, not only landing-page clicks, before moving budget.' },
    { title: 'Give each campaign a measurable landing path', action: 'Use distinct campaign tags and send each ad to the most relevant page. Make sure its promise matches the page headline and CTA, then compare tagged bookings and member outcomes.' },
  ],
  'web-discovery': [
    { title: 'Make the free trial the clearest next step', action: 'Place a consistent free-trial CTA in the homepage hero and primary navigation. Add contextual links to How It Works and Pricing, then measure website visitors who reach /free-trial.' },
    { title: 'Connect high-intent pages to the trial page', action: 'Add a clear next-step CTA to the pages explaining the workout and membership options. Use copy that answers “what happens next?” and compare the share of visitors reaching /free-trial.' },
    { title: 'Improve the homepage path for first-time visitors', action: 'Make the first screen explain what TENROUNDS is, who it suits and how to try it. Use one dominant free-trial CTA and compare the homepage-to-trial journey.' },
  ],
}

function candidate(metrics: Metrics) {
  const seoImpressionChange = percent(metrics.seo.impressions, metrics.seo.previousImpressions)
  const seoClickChange = percent(metrics.seo.clicks, metrics.seo.previousClicks)
  const ctr = metrics.seo.ctr
  const position = metrics.seo.position
  const trialRate = metrics.website.trialToBookingRate
  const memberRate = metrics.website.memberRate
  const pages = metrics.searchDetail?.pages || []
  const queries = metrics.searchDetail?.queries || []
  const httpHome = pages.find(row => { try { const url = new URL(row.page); return url.protocol === 'http:' && url.pathname === '/' } catch { return false } })
  const httpsHome = pages.find(row => { try { const url = new URL(row.page); return url.protocol === 'https:' && url.pathname === '/' } catch { return false } })
  const weakPage = pages.filter(row => row.impressions >= 100 && row.position >= 3 && row.position <= 15 && row.ctr < 0.025).sort((a, b) => b.impressions - a.impressions)[0]
  const weakQuery = queries.filter(row => row.impressions >= 25 && row.position <= 15 && row.ctr < 0.08 && !/(tenrounds|10 rounds)/i.test(row.query)).sort((a, b) => b.impressions - a.impressions)[0]

  const search = httpHome && httpsHome
    ? { baseId: 'seo-canonical', area: 'search' as const, title: 'Consolidate HTTP and HTTPS search signals', insight: `Search Console reports both ${httpHome.clicks} clicks from the HTTP homepage and ${httpsHome.clicks} from the HTTPS homepage. Search signals are split across two URL variants.`, action: 'Verify that every HTTP homepage request redirects permanently (301) to the HTTPS homepage. Ensure the HTTPS page has a self-referencing canonical, and that the sitemap and internal links use HTTPS only. Recheck the two URL variants in Search Console after Google recrawls.', kpi: 'Clicks consolidated on the HTTPS homepage', metricKey: 'seo.clicks', direction: 'up' as const }
    : weakPage
      ? { baseId: 'seo-page-ctr', area: 'search' as const, title: 'Improve the search result for a high-impression page', insight: `${weakPage.page} earned ${weakPage.impressions.toLocaleString()} impressions but only ${(weakPage.ctr * 100).toFixed(2)}% CTR at average position ${weakPage.position.toFixed(1)}.`, action: `Review the title tag and meta description for ${weakPage.page}. Make the page's Pretoria East relevance, exact service and 30-minute workout benefit clearer. Ensure the search snippet promise matches the page's first screen, then measure CTR and clicks for this URL.`, kpi: 'Page-level organic CTR', metricKey: 'seo.ctr', direction: 'up' as const }
      : weakQuery
        ? { baseId: 'seo-query-intent', area: 'search' as const, title: 'Capture more clicks for a high-intent search', insight: `“${weakQuery.query}” generated ${weakQuery.impressions} impressions, ${weakQuery.clicks} clicks and ${(weakQuery.ctr * 100).toFixed(1)}% CTR at position ${weakQuery.position.toFixed(1)}.`, action: `Check which TENROUNDS page is ranking for “${weakQuery.query}”. Improve its title and description to answer that search intent directly, add useful supporting content and make the free-trial next step clear. Track this exact query in the next review.`, kpi: 'Clicks for the selected search query', metricKey: 'seo.clicks', direction: 'up' as const }
        : seoImpressionChange <= -5
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
    const variants = ACTION_VARIANTS[item.baseId] || []
    const variant = variants.length ? variants[(count - 1) % variants.length] : null
    const rec: Recommendation = {
      ...item,
      ...(variant || {}),
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
