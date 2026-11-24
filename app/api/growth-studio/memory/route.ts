import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const dynamic = 'force-dynamic'
const MEMORY_KEY = 'tenrounds_project_memory_v1'

type MemoryRecord = {
  id: string
  category: 'decision' | 'integration' | 'campaign' | 'learning' | 'task' | 'business'
  title: string
  content: string
  status: string
  updatedAt: string
}

const initialRecords: MemoryRecord[] = [
  { id: 'brand-foundation', category: 'business', title: 'TENROUNDS brand foundation', content: 'Boutique 30-minute HIIT and kickboxing circuit gym in Garsfontein, Pretoria East. Tagline: 30 Minutes. 10 Rounds. All Heart. Brand voice: short, punchy and confident. Visual identity: dark navy/black, cobalt/bright blue, white, yellow sparingly. Prefer authentic member and gym photography over generic AI people imagery.', status: 'authoritative', updatedAt: '2026-11-24T00:00:00.000Z' },
  { id: 'marketing-architecture', category: 'decision', title: 'ChatGPT is the central marketing brain', content: 'ChatGPT leads strategy and decision-making. Growth Studio is the operational dashboard and permanent record. Do not build a separate website chatbot, OpenAI chat endpoint, autonomous agent team or background agent processes. Avoid unnecessary API costs. Require owner approval before publishing.', status: 'approved', updatedAt: '2026-11-24T00:00:00.000Z' },
  { id: 'ga4-authority', category: 'integration', title: 'Authoritative GA4 property', content: 'Use GA4 property www.tenrounds.co.za, ID 338885680, for all reporting, conversions and Growth Studio metrics. Explicitly exclude www.tenrounds.co.za - GA4, ID 361324067, unless the owner changes this rule.', status: 'verified rule', updatedAt: '2026-11-24T00:00:00.000Z' },
  { id: 'meta-integrations', category: 'integration', title: 'Meta reporting connections', content: 'Meta Ads, Instagram Insights and Facebook Page Insights are authenticated in Supermetrics. Facebook Page is Tenrounds, Page ID 105284362077730. Instagram account TenRounds is connected. Facebook organic Page publishing is not yet verified and must not be assumed available.', status: 'reporting connected; publishing pending', updatedAt: '2026-11-24T00:00:00.000Z' },
  { id: 'google-integrations', category: 'integration', title: 'Google marketing connections', content: 'Google Ads, Google Analytics 4 (authoritative property 338885680), Google Business Profile and Google Search Console are authenticated in Supermetrics. Verify live account access before relying on a data pull.', status: 'connected', updatedAt: '2026-11-24T00:00:00.000Z' },
  { id: 'canva-workflow', category: 'integration', title: 'Canva creative workflow', content: 'Canva connector is connected in ChatGPT. Use it to create editable TENROUNDS brand designs. Existing designs: https://www.canva.com/d/1dUileZda3b9lj0 ; https://www.canva.com/d/A9uPDJ5YliyYOnY ; https://www.canva.com/d/Rhxak-nLUKKhlzH . Do not claim automated Canva-to-publishing transfer without verifying an actual export/publishing path.', status: 'connected; website API not required', updatedAt: '2026-11-24T00:00:00.000Z' },
  { id: 'funnel-priority', category: 'decision', title: 'Growth measurement funnel', content: 'Measure visitors → free-trial CTA clicks → completed trial bookings → attendance → membership sign-ups. Reuse accurate native trial booking and membership signup records already in the website database. Match trial and membership email addresses for conversion analysis. Do not fabricate attendance or conversion values.', status: 'approved priority', updatedAt: '2026-11-24T00:00:00.000Z' },
  { id: 'website-cta', category: 'learning', title: 'Free-trial CTA reassurance implemented', content: 'The reassurance line below the free-trial buttons is implemented: “Your first session is FREE. No payment. No obligation.” Let the change collect data before making more simultaneous conversion changes.', status: 'implemented; monitor', updatedAt: '2026-11-24T00:00:00.000Z' },
  { id: 'growth-studio-next', category: 'task', title: 'Next implementation priorities', content: 'Complete persistent project memory and integration register; verify GA4 event flow and free-trial CTA clicks/completed bookings; connect trial attendance and membership conversion reporting; verify Facebook Page publishing separately; replace placeholder Growth Studio performance metrics only with verified data.', status: 'in progress', updatedAt: '2026-11-24T00:00:00.000Z' }
]

export async function GET() {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, MEMORY_KEY)).limit(1)
  if (!rows[0]) {
    const value = JSON.stringify(initialRecords)
    await db.insert(settings).values({ key: MEMORY_KEY, value }).onConflictDoNothing()
    return NextResponse.json({ records: initialRecords })
  }
  try {
    const records = JSON.parse(rows[0].value)
    return NextResponse.json({ records: Array.isArray(records) ? records : initialRecords })
  } catch {
    return NextResponse.json({ records: initialRecords, warning: 'Saved memory could not be parsed.' })
  }
}

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const raw = await request.text()
  if (raw.length > 300000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  let records: unknown
  try { records = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!Array.isArray(records) || records.length > 300) return NextResponse.json({ error: 'Invalid memory records' }, { status: 400 })
  const allowed = new Set(['decision', 'integration', 'campaign', 'learning', 'task', 'business'])
  for (const item of records) {
    if (!item || typeof item !== 'object' || !allowed.has(item.category) || typeof item.title !== 'string' || typeof item.content !== 'string' || typeof item.id !== 'string') {
      return NextResponse.json({ error: 'Each record needs an id, valid category, title and content.' }, { status: 400 })
    }
    if (item.title.length > 160 || item.content.length > 12000) return NextResponse.json({ error: 'Record is too long.' }, { status: 400 })
    if (/access[_ -]?token|client[_ -]?secret|private[_ -]?key|password\s*[:=]/i.test(item.content)) return NextResponse.json({ error: 'Do not store credentials or secrets in Project Memory.' }, { status: 400 })
  }
  const value = JSON.stringify(records)
  await db.insert(settings).values({ key: MEMORY_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString(), count: records.length })
}
