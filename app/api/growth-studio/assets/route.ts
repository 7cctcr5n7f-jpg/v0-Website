import { NextResponse } from 'next/server'
import { list, put } from '@vercel/blob'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const PREFIX = 'tenrounds/brand-assets/'
const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED = new Set(['application/pdf','image/png','image/jpeg','image/webp','image/svg+xml','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])

export async function GET() {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await list({ prefix: PREFIX, limit: 100 })
    return NextResponse.json({ assets: result.blobs.map(blob => ({ url: blob.url, pathname: blob.pathname, size: blob.size, uploadedAt: blob.uploadedAt, contentType: blob.contentType })) })
  } catch (error) {
    console.error('[growth-studio/assets:list]', error)
    return NextResponse.json({ error: 'Asset storage is not configured or could not be reached. Check the Vercel Blob store connection.' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
    if (file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: 'Files must be between 1 byte and 20 MB.' }, { status: 400 })
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG, WEBP and SVG.' }, { status: 415 })
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'brand-file'
    const blob = await put(PREFIX + Date.now() + '-' + safeName, file, { access: 'public', addRandomSuffix: true, contentType: file.type })
    return NextResponse.json({ ok: true, asset: { url: blob.url, pathname: blob.pathname, size: file.size, contentType: file.type } })
  } catch (error) {
    console.error('[growth-studio/assets:upload]', error)
    return NextResponse.json({ error: 'Upload failed. Confirm that a Vercel Blob store is connected to this project.' }, { status: 503 })
  }
}
