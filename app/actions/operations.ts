'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  blockedDays,
  shiftAssignments,
  shiftSettings,
  staff,
  stockConfirmations,
  stockItems,
  trialBookings,
  trialBookingNotes,
  waterAuditLog,
  waterCredits,
  whatsappReminderLog,
} from '@/lib/db/schema'
import {
  clearOperationsCookie,
  verifyOperationsActionToken,
  isOperationsAuthed,
  setOperationsCookie,
  verifyOpsPasscode,
} from '@/lib/operations-auth'
import { sendEmail } from '@/lib/email'
import { business } from '@/lib/business'
import { getWhatsappSettings, sendWhatsAppText } from '@/lib/whatsapp'
import { formatDateLong, parseDateString, slotToMinutes, todayDateString, validSlotsForDay } from '@/lib/trial-slots'

async function requireOps() {
  if (!(await isOperationsAuthed())) throw new Error('Unauthorized')
}

function revalidateOps() {
  revalidatePath('/operations')
}

// ── Staff CRUD ──────────────────────────────────────────────────────────────

export async function saveStaffMember(formData: FormData) {
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const iconRaw = formData.get('icon')
  if (!name) return
  if (id > 0) {
    const values: { name: string; phone: string; icon?: string } = { name, phone }
    if (iconRaw !== null) values.icon = String(iconRaw).trim()
    await db.update(staff).set(values).where(eq(staff.id, id))
  } else {
    await db.insert(staff).values({ name, phone, icon: iconRaw !== null ? String(iconRaw).trim() : '' })
  }
  revalidateOps()
}

export async function deleteStaffMember(formData: FormData) {
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  if (id > 0) await db.delete(staff).where(eq(staff.id, id))
  revalidateOps()
}

// ── Shift assignments ────────────────────────────────────────────────────────

export async function saveShiftAssignment(formData: FormData) {
  const authToken = String(formData.get('authToken') ?? '')
  if (!(await isOperationsAuthed()) && !verifyOperationsActionToken(authToken)) {
    throw new Error('Unauthorized')
  }
  const id = Number(formData.get('id') ?? 0)
  const shiftDate = String(formData.get('shiftDate') ?? '').trim()
  const shiftType = String(formData.get('shiftType') ?? '').trim()
  const staffId = Number(formData.get('staffId') ?? 0)
  const hours = String(formData.get('hours') ?? '').trim()
  const applyWholeWeek = String(formData.get('applyWholeWeek') ?? '') === '1'
  if (!shiftDate || !shiftType || !staffId) return

  async function upsertSingle(date: string) {
    const existing = await db
      .select()
      .from(shiftAssignments)
      .where(
        and(
          eq(shiftAssignments.shiftDate, date),
          eq(shiftAssignments.shiftType, shiftType),
          eq(shiftAssignments.staffId, staffId),
        ),
      )
      .limit(1)
    if (existing.length > 0) {
      await db.update(shiftAssignments).set({ hours }).where(eq(shiftAssignments.id, existing[0].id))
    } else {
      await db.insert(shiftAssignments).values({ shiftDate: date, shiftType, staffId, hours })
    }
  }

  function weekDatesMonToFri(fromYmd: string) {
    const [y, m, d] = fromYmd.split('-').map(Number)
    const base = new Date(Date.UTC(y, m - 1, d))
    const day = base.getUTCDay()
    const mondayOffset = (day + 6) % 7
    base.setUTCDate(base.getUTCDate() - mondayOffset)
    const dates: string[] = []
    for (let i = 0; i < 5; i += 1) {
      const x = new Date(base)
      x.setUTCDate(base.getUTCDate() + i)
      dates.push(x.toISOString().slice(0, 10))
    }
    return dates
  }

  if (id > 0) {
    await db.update(shiftAssignments).set({ shiftDate, shiftType, staffId, hours }).where(eq(shiftAssignments.id, id))
  } else if (applyWholeWeek && shiftType !== 'saturday') {
    for (const date of weekDatesMonToFri(shiftDate)) {
      await upsertSingle(date)
    }
  } else {
    await upsertSingle(shiftDate)
  }
  revalidateOps()
}

export async function deleteShiftAssignment(formData: FormData) {
  const authToken = String(formData.get('authToken') ?? '')
  if (!(await isOperationsAuthed()) && !verifyOperationsActionToken(authToken)) {
    throw new Error('Unauthorized')
  }
  const id = Number(formData.get('id') ?? 0)
  if (id > 0) await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id))
  revalidateOps()
}

// ── Shift settings ────────────────────────────────────────────────────────

export async function saveShiftSettings(formData: FormData) {
  await requireOps()
  for (const type of ['morning', 'afternoon', 'saturday']) {
    const label = String(formData.get(`${type}_label`) ?? '').trim()
    const startTime = String(formData.get(`${type}_startTime`) ?? '').trim()
    const endTime = String(formData.get(`${type}_endTime`) ?? '').trim()
    const defaultHours = String(formData.get(`${type}_defaultHours`) ?? '').trim()
    await db
      .update(shiftSettings)
      .set({ label, startTime, endTime, defaultHours, updatedAt: new Date() })
      .where(eq(shiftSettings.shiftType, type))
  }
  revalidateOps()
}

// ── Trial booking notes ──────────────────────────────────────────────────────

export async function saveTrialNote(formData: FormData) {
  await requireOps()
  const bookingId = Number(formData.get('bookingId') ?? 0)
  const note = String(formData.get('note') ?? '').trim()
  if (!bookingId || !note) return
  await db.insert(trialBookingNotes).values({ bookingId, note })
  revalidateOps()
}

export async function deleteTrialNote(formData: FormData) {
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  if (id > 0) await db.delete(trialBookingNotes).where(eq(trialBookingNotes.id, id))
  revalidateOps()
}

export async function updateTrialBookingSchedule(formData: FormData) {
  await requireOps()
  const bookingId = Number(formData.get('bookingId') ?? 0)
  const appointmentDate = String(formData.get('appointmentDate') ?? '').trim()
  const appointmentTime = String(formData.get('appointmentTime') ?? '').trim()
  if (!bookingId || !appointmentDate || !appointmentTime) {
    return { ok: false, error: 'Please choose a new trial date and time.' }
  }

  const booking = await db.select().from(trialBookings).where(eq(trialBookings.id, bookingId)).limit(1)
  if (booking.length === 0) {
    return { ok: false, error: 'That trial booking could not be found.' }
  }

  const nextDate = parseDateString(appointmentDate)
  if (!nextDate) {
    return { ok: false, error: 'Please choose a valid date.' }
  }

  const current = booking[0]
  const today = todayDateString()
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 90)
  const maxYmd = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`

  if (appointmentDate < today) {
    return { ok: false, error: 'Trials cannot be moved to a past date.' }
  }
  if (appointmentDate > maxYmd) {
    return { ok: false, error: 'Trials cannot be moved more than 90 days ahead.' }
  }
  if (!validSlotsForDay(nextDate.getDay()).includes(appointmentTime)) {
    return {
      ok: false,
      error: `The selected time (${appointmentTime}) is not available on that day. Please choose a valid slot.`,
    }
  }

  const blocked = await db.select({ id: blockedDays.id }).from(blockedDays).where(eq(blockedDays.day, appointmentDate)).limit(1)
  if (blocked.length > 0) {
    return { ok: false, error: 'That day is unavailable. Please choose another date.' }
  }

  if (appointmentDate === today) {
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (slotToMinutes(appointmentTime) <= nowMinutes) {
      return { ok: false, error: 'That time has already passed today. Please choose another date.' }
    }
  }

  if (current.appointmentDate === appointmentDate && current.appointmentTime === appointmentTime) {
    return { ok: false, error: 'Please choose a different date or time to reschedule this trial.' }
  }

  const dateLong = formatDateLong(appointmentDate)
  const firstName = current.fullName.trim().split(/\s+/)[0] || current.fullName
  const previousReminderLogs = await db
    .select()
    .from(whatsappReminderLog)
    .where(eq(whatsappReminderLog.bookingId, bookingId))

  await db
    .update(trialBookings)
    .set({ appointmentDate, appointmentTime })
    .where(eq(trialBookings.id, bookingId))
  await db.delete(whatsappReminderLog).where(eq(whatsappReminderLog.bookingId, bookingId))

  try {
    await sendEmail({
      to: current.email,
      subject: 'Your TENROUNDS trial has been rescheduled',
      replyTo: business.email,
      text: `Hi ${firstName},

Your TENROUNDS trial has been rescheduled to ${dateLong} at ${appointmentTime}.

If you need to make another change, just reply to this email and we will help you.

Looking forward to seeing you!

Kind regards,
TENROUNDS Team`,
    })
  } catch (error) {
    console.error('[operations] failed to send trial reschedule email:', error)
    await db
    .update(trialBookings)
    .set({ appointmentDate: current.appointmentDate, appointmentTime: current.appointmentTime })
    .where(eq(trialBookings.id, bookingId))
    if (previousReminderLogs.length > 0) {
    await db.insert(whatsappReminderLog).values(previousReminderLogs.map((log) => ({
      bookingId: log.bookingId,
      reminderType: log.reminderType,
      sentAt: log.sentAt,
    })))
    }
    return { ok: false, error: 'The confirmation email could not be sent, so the reschedule was not saved.' }
  }

  revalidatePath('/operations')
  revalidatePath('/admin')

  try {
    const waSettings = await getWhatsappSettings()
    await sendWhatsAppText(
    current.phone,
    `Hi ${firstName}, your TENROUNDS trial has been rescheduled to ${dateLong} at ${appointmentTime}. We look forward to seeing you!`,
    waSettings,
    )
  } catch (error) {
    console.error('[operations] failed to send trial reschedule WhatsApp:', error)
  }

  return { ok: true }
}

// ── Water credits ────────────────────────────────────────────────────────────

export async function adjustWaterCredit(formData: FormData) {
  await requireOps()
  const memberName = String(formData.get('memberName') ?? '').trim()
  const delta = Number(formData.get('delta') ?? 0)
  const note = String(formData.get('note') ?? '').trim()
  if (!memberName || delta === 0) return

  // Get or create member credit record
  const existing = await db.select().from(waterCredits).where(eq(waterCredits.memberName, memberName)).limit(1)
  let creditId: number
  if (existing.length > 0) {
    const newBalance = existing[0].balance + delta
    await db.update(waterCredits).set({ balance: newBalance, updatedAt: new Date() }).where(eq(waterCredits.id, existing[0].id))
    creditId = existing[0].id
  } else {
    const inserted = await db.insert(waterCredits).values({ memberName, balance: delta }).returning({ id: waterCredits.id })
    creditId = inserted[0].id
  }
  await db.insert(waterAuditLog).values({ creditId, delta, note })
  revalidateOps()
}

export async function addWaterMember(formData: FormData) {
  await requireOps()
  const memberName = String(formData.get('memberName') ?? '').trim()
  if (!memberName) return
  const existing = await db.select().from(waterCredits).where(eq(waterCredits.memberName, memberName)).limit(1)
  if (existing.length === 0) {
    await db.insert(waterCredits).values({ memberName, balance: 0 })
  }
  revalidateOps()
}

export async function deleteWaterMember(formData: FormData) {
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  if (id > 0) await db.delete(waterCredits).where(eq(waterCredits.id, id))
  revalidateOps()
}

// Set an absolute balance (used from the Manage modal spinner)
export async function setWaterBalance(formData: FormData) {
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  const newBalance = Number(formData.get('balance') ?? 0)
  if (!id) return
  const existing = await db.select().from(waterCredits).where(eq(waterCredits.id, id)).limit(1)
  if (existing.length === 0) return
  const delta = newBalance - existing[0].balance
  if (delta === 0) return
  await db.update(waterCredits).set({ balance: newBalance, updatedAt: new Date() }).where(eq(waterCredits.id, id))
  await db.insert(waterAuditLog).values({ creditId: id, delta, note: 'manual adjust' })
  revalidateOps()
}

export async function getWaterAuditLog(creditId: number) {
  await requireOps()
  return db
    .select()
    .from(waterAuditLog)
    .where(eq(waterAuditLog.creditId, creditId))
    .orderBy(desc(waterAuditLog.createdAt))
}

// ── Stock tracker ────────────────────────────────────────────────────────────

// Quick +/- adjustment of an item's current level (from the main list)
export async function adjustStockQty(formData: FormData) {
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  const delta = Number(formData.get('delta') ?? 0)
  if (!id || delta === 0) return
  const existing = await db.select().from(stockItems).where(eq(stockItems.id, id)).limit(1)
  if (existing.length === 0) return
  const next = Math.max(0, existing[0].currentQty + delta)
  await db.update(stockItems).set({ currentQty: next, updatedAt: new Date() }).where(eq(stockItems.id, id))
  revalidateOps()
}

// Create or edit an item (name / current / max) from the Manage modal
export async function saveStockItem(formData: FormData) {
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  const name = String(formData.get('name') ?? '').trim()
  const currentQty = Math.max(0, Number(formData.get('currentQty') ?? 0))
  const maxQty = Math.max(0, Number(formData.get('maxQty') ?? 0))
  if (!name) return
  if (id > 0) {
    await db.update(stockItems).set({ name, currentQty, maxQty, updatedAt: new Date() }).where(eq(stockItems.id, id))
  } else {
    // If the name already exists, update it instead of erroring on the unique constraint
    const dup = await db.select().from(stockItems).where(eq(stockItems.name, name)).limit(1)
    if (dup.length > 0) {
      await db.update(stockItems).set({ currentQty, maxQty, updatedAt: new Date() }).where(eq(stockItems.id, dup[0].id))
    } else {
      const last = await db.select({ sortOrder: stockItems.sortOrder }).from(stockItems).orderBy(desc(stockItems.sortOrder)).limit(1)
      const nextSort = last.length > 0 ? last[0].sortOrder + 1 : 0
      await db.insert(stockItems).values({ name, currentQty, maxQty, sortOrder: nextSort })
    }
  }
  revalidateOps()
}

export async function deleteStockItem(formData: FormData) {
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  if (id > 0) await db.delete(stockItems).where(eq(stockItems.id, id))
  revalidateOps()
}

// Record a stock-take confirmation (who confirmed the levels, and when)
export async function confirmStockTake(formData: FormData) {
  await requireOps()
  const staffName = String(formData.get('staffName') ?? '').trim()
  if (!staffName) return
  await db.insert(stockConfirmations).values({ staffName })
  revalidateOps()
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function opsLogin(_prev: unknown, formData: FormData) {
  const passcode = String(formData.get('passcode') ?? '')
  if (!verifyOpsPasscode(passcode)) {
    return { error: 'Incorrect passcode. Please try again.' }
  }
  await setOperationsCookie()
  return { error: null, ok: true }
}

export async function opsLogout() {
  await clearOperationsCookie()
  revalidatePath('/operations')
}

// ── Data queries (called from page RSC) ─────────────────────────────────────

export async function getOperationsData() {
  const [allStaff, allShiftSettings, allAssignments, allWaterCredits] = await Promise.all([
    db.select().from(staff).orderBy(asc(staff.name)),
    db.select().from(shiftSettings).orderBy(asc(shiftSettings.id)),
    db.select().from(shiftAssignments).orderBy(desc(shiftAssignments.shiftDate), asc(shiftAssignments.shiftType)),
    db.select().from(waterCredits).orderBy(asc(waterCredits.memberName)),
  ])
  return { allStaff, allShiftSettings, allAssignments, allWaterCredits }
}
