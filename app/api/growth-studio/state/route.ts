import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const dynamic = 'force-dynamic'
const STATE_KEY = 'growth_hub_state_v1'

export async function GET() {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, STATE_KEY)).limit(1)
  if (!rows[0]) return NextResponse.json({ state: null })
  try { return NextResponse.json({ state: JSON.parse(rows[0].value) }) }
  catch { return NextResponse.json({ state: null, warning: 'Saved Growth Studio data could not be parsed.' }) }
}

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const raw = await request.text()
  if (raw.length > 500000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  let state: unknown
  try { state = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!state || typeof state !== 'object' || Array.isArray(state)) return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  const value = JSON.stringify(state)
  await db.insert(settings).values({ key: STATE_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
}
