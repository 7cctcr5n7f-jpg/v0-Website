/**
 * Cron route: fires every 15 minutes (see vercel.json).
 * Checks all upcoming trial bookings and sends WhatsApp reminders when due:
 *   - "day_before" : sent between 08:00–09:00 the day before the trial
 *   - "same_day"   : sent X hours before the trial time on the day itself
 *
 * Uses whatsapp_reminder_log to ensure each reminder fires exactly once.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trialBookings, whatsappReminderLog } from '@/lib/db/schema'
import { getWhatsappSettings, sendWhatsAppText, interpolate } from '@/lib/whatsapp'
import { formatDateLong } from '@/lib/trial-slots'
import { and, eq, gte, inArray, lt } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Converts a "HH:MM" string to total minutes from midnight.
function hhmm(s: string): number {
  const [h, m] = (s ?? '09:00').split(':').map(Number)
  return (h || 9) * 60 + (m || 0)
}

// Converts an "HH:MM AM/PM" slot string (e.g. "06:00 AM") to minutes from midnight.
function slotToMinutes(slot: string): number {
  const [time, ampm] = slot.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + m
}

export async function GET(req: Request) {
  // Simple shared-secret guard — set CRON_SECRET in your env vars.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const settings = await getWhatsappSettings()

  if (settings.reminders_enabled !== 'true') {
    return NextResponse.json({ skipped: 'reminders disabled' })
  }

  const dayBeforeTime = hhmm(settings.day_before_time ?? '09:00')
  const sameDayHoursBefore = Number(settings.same_day_hours_before ?? '2')

  // SA timezone offset in hours (UTC+2, no daylight saving)
  const SA_OFFSET = 2
  const nowUtc = new Date()
  const nowSa = new Date(nowUtc.getTime() + SA_OFFSET * 60 * 60 * 1000)

  const nowMinutes = nowSa.getUTCHours() * 60 + nowSa.getUTCMinutes()

  // Build today & tomorrow in SA time as "YYYY-MM-DD"
  const pad = (n: number) => String(n).padStart(2, '0')
  const saDateStr = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

  const todaySa = saDateStr(nowSa)
  const tomorrowSa = saDateStr(new Date(nowSa.getTime() + 24 * 60 * 60 * 1000))

  // Fetch bookings for today and tomorrow only
  const bookings = await db
    .select()
    .from(trialBookings)
    .where(
      and(
        // appointmentDate is a plain string like "2025-07-04"
        gte(trialBookings.appointmentDate, todaySa),
        lt(trialBookings.appointmentDate, saDateStr(new Date(nowSa.getTime() + 2 * 24 * 60 * 60 * 1000))),
      ),
    )

  if (bookings.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  // Fetch already-sent log entries for these bookings
  const bookingIds = bookings.map((b) => b.id)
  const sentLogs = await db
    .select()
    .from(whatsappReminderLog)
    .where(inArray(whatsappReminderLog.bookingId, bookingIds))

  const alreadySent = new Set(sentLogs.map((l) => `${l.bookingId}:${l.reminderType}`))

  const dayBeforeTemplate = settings.reminder_day_before_message ?? 'Hi {{name}}, reminder: your free trial at TENROUNDS is tomorrow, {{date}} at {{time}}!'
  const sameDayTemplate = settings.reminder_same_day_message ?? 'Hi {{name}}, your free trial at TENROUNDS is TODAY at {{time}}. See you soon!'

  let sent = 0

  for (const booking of bookings) {
    const phone = booking.phone
    if (!phone) continue

    const bookingDate = booking.appointmentDate // "YYYY-MM-DD"
    const bookingTime = booking.appointmentTime // e.g. "06:00 AM"
    const name = booking.fullName.split(' ')[0]
    const dateLong = formatDateLong(bookingDate)

    const vars = { name, date: dateLong, time: bookingTime, phone, email: booking.email }

    // ── Day-before reminder ──────────────────────────────────────────────────
    if (
      bookingDate === tomorrowSa &&
      !alreadySent.has(`${booking.id}:day_before`) &&
      nowMinutes >= dayBeforeTime &&
      nowMinutes < dayBeforeTime + 60 // fire within the configured hour
    ) {
      const body = interpolate(dayBeforeTemplate, vars)
      const ok = await sendWhatsAppText(phone, body, settings)
      if (ok) {
        await db.insert(whatsappReminderLog).values({ bookingId: booking.id, reminderType: 'day_before' }).onConflictDoNothing()
        sent++
      }
    }

    // ── Same-day reminder ────────────────────────────────────────────────────
    if (
      bookingDate === todaySa &&
      !alreadySent.has(`${booking.id}:same_day`)
    ) {
      const trialMinutes = slotToMinutes(bookingTime)
      const fireAt = trialMinutes - sameDayHoursBefore * 60
      // Fire if we're within a 15-minute window of the target time
      if (nowMinutes >= fireAt && nowMinutes < fireAt + 15) {
        const body = interpolate(sameDayTemplate, vars)
        const ok = await sendWhatsAppText(phone, body, settings)
        if (ok) {
          await db.insert(whatsappReminderLog).values({ bookingId: booking.id, reminderType: 'same_day' }).onConflictDoNothing()
          sent++
        }
      }
    }
  }

  return NextResponse.json({ processed: bookings.length, sent })
}
