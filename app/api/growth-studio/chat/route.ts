import { NextResponse } from 'next/server'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const dynamic = 'force-dynamic'
type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL
  if (!apiKey || !model) return NextResponse.json({ error: 'The AI chat service is not configured yet.' }, { status: 503 })
  const body = await request.json().catch(() => null)
  const messages = Array.isArray(body?.messages) ? body.messages as Message[] : []
  if (!messages.length || messages.length > 20) return NextResponse.json({ error: 'Invalid conversation context.' }, { status: 400 })
  const safeMessages = messages.filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-16).map(m => ({ role: m.role, content: m.content.slice(0, 5000) }))
  const campaign = body?.campaign
  const context = campaign ? 'Current campaign context: ' + JSON.stringify(campaign).slice(0, 2500) : 'No campaign selected.'
  const system = [
    'You are ChatGPT collaborating directly with the owner of TENROUNDS, a boutique 30-minute HIIT and kickboxing circuit gym in Garsfontein, Pretoria East, South Africa.',
    'Brand promise: 30 Minutes. 10 Rounds. All Heart. Brand colours: black/navy, cobalt blue, white, with yellow used sparingly.',
    'Work as a strategic marketing partner, not an autonomous agent. Discuss, challenge assumptions and collaborate. Never claim to have published, approved, measured or researched something unless it actually happened.',
    'Prioritise qualified enquiries, free-trial bookings, trial attendance, new memberships, retention and revenue. Distinguish verified metrics from hypotheses. Never invent campaign results, ad spend or customer insights.',
    'Use ethical evidence-based consumer psychology: social proof, identity, commitment, friction reduction and habit formation. Avoid manipulative scarcity or unsupported health claims.',
    'TENROUNDS offers a free first session with no payment and no obligation. Historically August/September has been strong and winter softer; verify against current data.',
    'Prefer polished Canva layouts, animated designs, short-form video, member stories and authentic gym photography. Do not default every post to AI-generated people.',
    'Be concise, practical and collaborative. Ask only one important clarification at a time.'
  ].join(' ')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system + ' ' + context }, ...safeMessages], temperature: 0.7, max_tokens: 1200 }),
    signal: AbortSignal.timeout(45000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'The AI provider returned an error.' }, { status: 502 })
  const reply = data?.choices?.[0]?.message?.content
  if (typeof reply !== 'string' || !reply.trim()) return NextResponse.json({ error: 'The AI provider returned an empty response.' }, { status: 502 })
  return NextResponse.json({ reply: reply.trim(), model })
}
