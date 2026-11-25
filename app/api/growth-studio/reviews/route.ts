import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'

export const dynamic = 'force-dynamic'
const KEY = 'tenrounds_google_reviews_v1'
type Review = { id: string; name: string; comment: string; rating: number; date: string; reply: string; category: string[]; usageStatus: 'unused' | 'planned' | 'created' | 'published'; source: 'Supermetrics'; sourceNote?: string }

const seed: Review[] = [
  { id: 'AbFvOqkB2WOcLjmj977mn_WjmpWKqHKzM7pPnPKXqlN37zEW2p_tgSqOZAKECvBtqhJv4IaSzCgF', name: 'Davey Strydom', comment: 'Friendly, knowledgeable trainers and fun, dynamic sessions! Every class is enjoyable and motivating. I love the energy here!', rating: 5, date: '2025-10-11', reply: 'Thank you Davey for the glowing feedback! We’re glad you love the energy and dynamic sessions as much as we do. See you soon!', category: ['Trainers', 'Atmosphere', 'Workout experience'], usageStatus: 'unused', source: 'Supermetrics' },
  { id: 'AbFvOqkOYYNAXazloqP7xBY_OfpTZfVwE4CepjOh6oJjXCuPccDK7scPiIpuFYBw7zU6kfKWd1G4', name: 'Riaan van Wyk', comment: 'A super workout experience with super trainers.  The vibe is great.  The whole concept works.  No booking...  No lengthy contracts... Workout when it suits you.  Visit them for a free first session.  You will be hooked.... (and learn to hook someone 😂)', rating: 5, date: '2026-10-13', reply: 'Thanks so much for the awesome review! 🥊💙 We’re glad you love the vibe, the trainers and the freedom to train on your own schedule. And that last line… we see what you did there! 😂🥊 See you for another 30 minutes of sweat, smiles and a few good hooks!', category: ['Convenience', 'Trainers', 'Workout concept', 'Free trial'], usageStatus: 'unused', source: 'Supermetrics' },
  { id: 'AbFvOqlDkkEDGu4lUI6VlC6Hg1gMV3puaKmJ4iqGYufhKUdDup3lQGXt6U2c7TuL5sOjszRb_iplvQ', name: 'Joseph De Gouveia', comment: '', rating: 5, date: '2026-09-07', reply: '', category: ['Rating only'], usageStatus: 'unused', source: 'Supermetrics', sourceNote: 'Five-star review with no written comment. Do not turn into a written testimonial.' },
  { id: 'AbFvOqlfWfD1VjxAmnCR0-6wOXilzF6REjLBd48XmWVlxe8TxrBZSJ6mcYwCKEh_iODceGXMeF00BQ', name: 'SINTEK TIC', comment: 'you’re looking for a gym that actually keeps you motivated, 10 Rounds Garsfontein is on another level. The concept is simple but incredibly effective — 10 rounds of 2 minutes each, combining boxing-style workouts with high-intensity functional training. The sessions move quickly, which makes the workout intense but also fun.\nWhat really stands out are the trainers. They are extremely supportive, knowledgeable, and constantly pushing you to get the most out of each round. Whether you’re a beginner or already fit, they adapt the training and keep you motivated throughout the workout.\nThe vibe in the gym is insane. There’s a lot of energy, music pumping, people encouraging each other, and a real sense of community. It doesn’t feel like a boring gym session — it feels more like a team pushing through a challenge together.\nAnother big advantage is that the workouts are short and efficient, but you still leave feeling like you’ve had a proper, intense training session. (I was dead...) It’s perfect if you want results without spending hours in the gym.', rating: 5, date: '2026-03-18', reply: '', category: ['Workout concept', 'Trainers', 'Atmosphere', 'Time efficient'], usageStatus: 'unused', source: 'Supermetrics' },
  { id: 'AbFvOqlgPNtEcDqorahl19cEElNIM3tRdIfNm49sZpgYJZc505adov4tivVkVthyL9UIjKBmpAHv', name: 'T Africa Occupational Health And Safety Specialists', comment: 'Words can’t fully describe the experience at 10 Rounds; it is the best gym I have ever joined. There is always a minimum of three trainers on the floor to assist you. While hiring a personal trainer at a regular gym can be quite expensive, 10 Rounds offers that personal training experience for a fraction of the cost, all included in one monthly instalment.\n\nOne aspect that stands out to me is the friendliness of everyone working there, from management to personal trainers. I highly recommend this gym to anyone looking to achieve their fitness goals. Just give it a try—your first session is free, and you will not be disappointed!', rating: 5, date: '2026-03-18', reply: 'Thank you for the kind review, it is members and reviews like this that motivates the whole team and makes us love what we do 🥊', category: ['Trainers', 'Value', 'Free trial', 'Recommendation'], usageStatus: 'unused', source: 'Supermetrics' },
  { id: 'AbFvOqnytl6hLgBZY-CmQUML9CimLsWqVT5CMoCIASuBXJk4mPMYH6Zug9j_uRdi0ch8YAtuVzmqow', name: 'Taryn Marshall', comment: 'Wow wow wow, what a beautiful find 10rounds has been. Been going there for a few months now and all I can do is sing their praises. Its an absolute pleasure training there. Sessions are always fun, different and challenging. Trainers are ALWAYS interactive and so happy to see you when you walk through the doors, no matter what time of day you go. Different packages are available to suit your lifestyle. Its a really fab way of keeping fit and keeping the mind clear. Because of the HIIT workouts you need to attend 3 sessions a week to keep on top of your game, which makes it so much easier to fit into an already busy life. If you’re wondering about where to go for fitness, I can guarantee you that you won’t regret calling them ❤️', rating: 5, date: '2025-12-07', reply: 'Thank Taryn for such an awesome review!! It is members like you that make our job fun and rewarding!💪', category: ['Trainers', 'Workout experience', 'Convenience', 'Wellbeing'], usageStatus: 'unused', source: 'Supermetrics' }
]

export async function GET() {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, KEY)).limit(1)
  if (!rows[0]) {
    const value = JSON.stringify(seed)
    await db.insert(settings).values({ key: KEY, value }).onConflictDoNothing()
    return NextResponse.json({ reviews: seed, totalGoogleReviews: 33, retrievedCount: 6, coverageNote: 'Six review records were returned by Supermetrics. The lifetime Google review count is 33; 27 reviews are not yet available in this import.' })
  }
  try { return NextResponse.json({ reviews: JSON.parse(rows[0].value), totalGoogleReviews: 33, retrievedCount: 6, coverageNote: 'Six review records were returned by Supermetrics. The lifetime Google review count is 33; 27 reviews are not yet available in this import.' }) }
  catch { return NextResponse.json({ reviews: seed, totalGoogleReviews: 33, retrievedCount: 6, warning: 'Saved review library could not be parsed.' }) }
}

export async function POST(request: Request) {
  if (!(await isOperationsAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const raw = await request.text()
  if (raw.length > 200000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  let reviews: unknown
  try { reviews = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!Array.isArray(reviews) || reviews.length > 100) return NextResponse.json({ error: 'Invalid review list' }, { status: 400 })
  for (const item of reviews) {
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.comment !== 'string' || ![1,2,3,4,5].includes(item.rating) || !['unused','planned','created','published'].includes(item.usageStatus)) return NextResponse.json({ error: 'Invalid review record' }, { status: 400 })
  }
  const value = JSON.stringify(reviews)
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  return NextResponse.json({ ok: true, count: reviews.length, savedAt: new Date().toISOString() })
}
