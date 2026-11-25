import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const dynamic = 'force-dynamic'
const KEY = 'tenrounds_google_drive_folders_v1'
const categories = ['01 - Brand Identity', '02 - Original Video', '03 - Photography', '04 - Campaign Material', '05 - Approved Creative']
type DriveFolder = { id: string; name: string; category: string; addedAt: string }

async function readFolders(): Promise<DriveFolder[]> {
  const rows = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, KEY)).limit(1)
  if (!rows[0]) return []
  try { const parsed = JSON.parse(rows[0].value); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}
export async function GET() {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ folders: await readFolders(), categories })
}
export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!Array.isArray(body.folders) || body.folders.length > 20) return NextResponse.json({ error: 'Choose up to 20 folders.' }, { status: 400 })
  const map = new Map((await readFolders()).map(folder => [folder.id, folder]))
  for (const item of body.folders) {
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string') continue
    const category = categories.find(value => item.name.startsWith(value)) || categories[0]
    map.set(item.id.slice(0, 300), { id: item.id.slice(0, 300), name: item.name.slice(0, 500), category, addedAt: new Date().toISOString() })
  }
  const folders = Array.from(map.values()).slice(-20)
  const value = JSON.stringify(folders)
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  return NextResponse.json({ ok: true, folders })
}
export async function DELETE(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Invalid folder id.' }, { status: 400 })
  const folders = (await readFolders()).filter(folder => folder.id !== body.id)
  const value = JSON.stringify(folders)
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  return NextResponse.json({ ok: true, folders })
}
