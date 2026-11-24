import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const dynamic = 'force-dynamic'
const KEY = 'tenrounds_google_drive_assets_v1'
const categories = ['01 - Brand Identity', '02 - Original Video', '03 - Photography', '04 - Campaign Material', '05 - Approved Creative']
type DriveAsset = { id: string; name: string; mimeType: string; url: string; category: string; addedAt: string; iconUrl?: string; sizeBytes?: number }

async function readAssets(): Promise<DriveAsset[]> {
  const rows = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, KEY)).limit(1)
  if (!rows[0]) return []
  try { const parsed = JSON.parse(rows[0].value); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}
export async function GET() {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ assets: await readAssets(), categories })
}
export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!Array.isArray(body.assets) || body.assets.length > 100) return NextResponse.json({ error: 'Expected an asset list of up to 100 files.' }, { status: 400 })
  const current = await readAssets()
  const map = new Map(current.map(asset => [asset.id, asset]))
  for (const item of body.assets) {
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.mimeType !== 'string') continue
    const category = categories.includes(item.category) ? item.category : categories[0]
    map.set(item.id, { id: item.id.slice(0, 300), name: item.name.slice(0, 500), mimeType: item.mimeType.slice(0, 200), url: 'https://drive.google.com/open?id=' + encodeURIComponent(item.id), category, addedAt: new Date().toISOString(), ...(typeof item.iconUrl === 'string' ? { iconUrl: item.iconUrl.slice(0, 2000) } : {}), ...(Number.isFinite(item.sizeBytes) ? { sizeBytes: item.sizeBytes } : {}) })
  }
  const assets = Array.from(map.values()).slice(-500)
  const value = JSON.stringify(assets)
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  return NextResponse.json({ ok: true, assets })
}
export async function PATCH(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (typeof body.id !== 'string' || typeof body.category !== 'string' || !categories.includes(body.category)) return NextResponse.json({ error: 'Invalid asset update.' }, { status: 400 })
  const assets = await readAssets()
  const updated = assets.map(asset => asset.id === body.id ? { ...asset, category: body.category } : asset)
  const value = JSON.stringify(updated)
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  return NextResponse.json({ ok: true, assets: updated })
}
export async function DELETE(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Invalid asset id.' }, { status: 400 })
  const assets = (await readAssets()).filter(asset => asset.id !== body.id)
  const value = JSON.stringify(assets)
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  return NextResponse.json({ ok: true, assets })
}
