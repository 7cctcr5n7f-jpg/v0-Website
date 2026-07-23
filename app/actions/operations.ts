'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  shiftAssignments,
  shiftSettings,
  staff,
  trialBookingNotes,
  waterAuditLog,
  waterCredits,
} from '@/lib/db/schema'
import {
  clearOperationsCookie,
  isOperationsAuthed,
  setOperationsCookie,
  verifyOpsPasscode,
} from '@/lib/operations-auth'

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
  if (!name) return
  if (id > 0) {
    await db.update(staff).set({ name, phone }).where(eq(staff.id, id))
  } else {
    await db.insert(staff).values({ name, phone })
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
  await requireOps()
  const id = Number(formData.get('id') ?? 0)
  const shiftDate = String(formData.get('shiftDate') ?? '').trim()
  const shiftType = String(formData.get('shiftType') ?? '').trim()
  const staffId = Number(formData.get('staffId') ?? 0)
  const hours = String(formData.get('hours') ?? '').trim()
  if (!shiftDate || !shiftType || !staffId) return
  if (id > 0) {
    await db.update(shiftAssignments).set({ shiftDate, shiftType, staffId, hours }).where(eq(shiftAssignments.id, id))
  } else {
    // Upsert: if same trainer already on same shift+date just update hours
    const existing = await db
      .select()
      .from(shiftAssignments)
      .where(
        and(
          eq(shiftAssignments.shiftDate, shiftDate),
          eq(shiftAssignments.shiftType, shiftType),
          eq(shiftAssignments.staffId, staffId),
        ),
      )
      .limit(1)
    if (existing.length > 0) {
      await db.update(shiftAssignments).set({ hours }).where(eq(shiftAssignments.id, existing[0].id))
    } else {
      await db.insert(shiftAssignments).values({ shiftDate, shiftType, staffId, hours })
    }
  }
  revalidateOps()
}

export async function deleteShiftAssignment(formData: FormData) {
  await requireOps()
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

export async function getWaterAuditLog(creditId: number) {
  await requireOps()
  return db
    .select()
    .from(waterAuditLog)
    .where(eq(waterAuditLog.creditId, creditId))
    .orderBy(desc(waterAuditLog.createdAt))
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
