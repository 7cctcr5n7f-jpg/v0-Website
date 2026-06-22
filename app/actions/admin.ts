'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { blockedDays, chowWinners, galleryCategories, galleryPhotos, membershipSignups, sessionMilestones, sessionPurchases, settings, specials, trialBookings, whatsappSettings } from '@/lib/db/schema'
import {
  clearAdminCookie,
  isAdminAuthed,
  setAdminCookie,
  verifyPasscode,
} from '@/lib/admin-auth'

async function requireAdmin() {
  if (!(await isAdminAuthed())) throw new Error('Unauthorized')
}

function revalidateAll() {
  revalidatePath('/')
  revalidatePath('/memberships')
  revalidatePath('/members')
  revalidatePath('/admin')
}

// ── Trial bookings ──
export async function deleteTrialBooking(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get('id'))
  if (id) {
    await db.delete(trialBookings).where(eq(trialBookings.id, id))
    revalidatePath('/admin')
  }
}

// ── Membership signups ──
const SIGNUP_STATUSES = ['New', 'Processed', 'Active', 'Cancelled'] as const

export async function updateSignupStatus(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get('id'))
  const status = String(formData.get('status') ?? '').trim()
  if (id && (SIGNUP_STATUSES as readonly string[]).includes(status)) {
    await db.update(membershipSignups).set({ status }).where(eq(membershipSignups.id, id))
    revalidatePath('/admin')
  }
}

export async function deleteSignup(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get('id'))
  if (id) {
    await db.delete(membershipSignups).where(eq(membershipSignups.id, id))
    revalidatePath('/admin')
  }
}

  // ── Session purchases ──
  const PURCHASE_STATUSES = ['New', 'Processed', 'Used', 'Cancelled'] as const

  export async function updateSessionPurchaseStatus(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get('id'))
  const status = String(formData.get('status') ?? '').trim()
  if (id && (PURCHASE_STATUSES as readonly string[]).includes(status)) {
  await db.update(sessionPurchases).set({ status }).where(eq(sessionPurchases.id, id))
  revalidatePath('/admin')
  }
  }

  export async function deleteSessionPurchase(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get('id'))
  if (id) {
  await db.delete(sessionPurchases).where(eq(sessionPurchases.id, id))
  revalidatePath('/admin')
  }
  }

  // ── Blocked / unavailable days ──
  export async function saveBlockedDay(formData: FormData) {
  await requireAdmin()
  const day = String(formData.get('day') ?? '').trim()
  const reason = String(formData.get('reason') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return
  await db
    .insert(blockedDays)
    .values({ day, reason })
    .onConflictDoUpdate({ target: blockedDays.day, set: { reason } })
  revalidatePath('/admin')
  revalidatePath('/free-trial')
}

export async function deleteBlockedDay(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get('id'))
  if (id) {
    await db.delete(blockedDays).where(eq(blockedDays.id, id))
    revalidatePath('/admin')
    revalidatePath('/free-trial')
  }
}

// ── Auth ──
export async function login(_prev: unknown, formData: FormData) {
  const passcode = String(formData.get('passcode') ?? '')
  if (!verifyPasscode(passcode)) {
    return { error: 'Incorrect passcode. Please try again.' }
  }
  await setAdminCookie()
  return { error: null, ok: true }
}

export async function logout() {
  await clearAdminCookie()
  revalidatePath('/admin')
}

// ── Save state (for confirmation toasts in the admin UI) ──
export type SaveState = { ok: boolean; message: string; at: number } | null

// ── Helpers ──
function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}
function bool(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true'
}
function num(formData: FormData, key: string) {
  const v = Number(formData.get(key))
  return Number.isFinite(v) ? v : 0
}
function dateOrNull(formData: FormData, key: string) {
  const v = str(formData, key)
  return v ? new Date(v) : null
}

// ── Specials CRUD ──
export async function saveSpecial(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const values = {
    title: str(formData, 'title'),
    description: str(formData, 'description'),
    badge: str(formData, 'badge'),
    ctaLabel: str(formData, 'ctaLabel'),
    ctaHref: str(formData, 'ctaHref'),
    imageUrl: str(formData, 'imageUrl'),
    showPopup: bool(formData, 'showPopup'),
    showInline: bool(formData, 'showInline'),
    showBar: bool(formData, 'showBar'),
    discountPercent: num(formData, 'discountPercent'),
    discountMembershipIds: formData
      .getAll('discountMembershipIds')
      .map((v) => String(v).trim())
      .filter(Boolean)
      .join(','),
    kind: str(formData, 'kind') === 'sessions' ? 'sessions' : 'membership',
    sessionPackQuantities: formData
      .getAll('sessionPackQuantities')
      .map((v) => String(v).trim())
      .filter(Boolean)
      .join(','),
    sessionPackBonuses: [1, 10, 20, 30]
      .map((qty) => {
        const bonus = Number(formData.get(`sessionBonus_${qty}`))
        return Number.isFinite(bonus) && bonus > 0 ? `${qty}:${bonus}` : ''
      })
      .filter(Boolean)
      .join(','),
    sessionDiscountType: str(formData, 'sessionDiscountType') === 'amount' ? 'amount' : 'percent',
    sessionDiscountValue: num(formData, 'sessionDiscountValue'),
    active: bool(formData, 'active'),
    sortOrder: num(formData, 'sortOrder'),
    startsAt: dateOrNull(formData, 'startsAt'),
    endsAt: dateOrNull(formData, 'endsAt'),
    updatedAt: new Date(),
  }
  if (id > 0) {
    await db.update(specials).set(values).where(eq(specials.id, id))
  } else {
    await db.insert(specials).values(values)
  }
  revalidateAll()
}

export async function deleteSpecial(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  if (id > 0) await db.delete(specials).where(eq(specials.id, id))
  revalidateAll()
}

// ── CHOW winners CRUD ──
export async function saveChowWinner(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const values = {
    name: str(formData, 'name'),
    label: str(formData, 'label'),
    period: str(formData, 'period'),
    achievement: str(formData, 'achievement'),
    score: str(formData, 'score'),
    quote: str(formData, 'quote'),
    imageUrl: str(formData, 'imageUrl'),
    active: bool(formData, 'active'),
    sortOrder: num(formData, 'sortOrder'),
    updatedAt: new Date(),
  }
  if (id > 0) {
    await db.update(chowWinners).set(values).where(eq(chowWinners.id, id))
  } else {
    await db.insert(chowWinners).values(values)
  }
  revalidateAll()
}

export async function deleteChowWinner(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  if (id > 0) await db.delete(chowWinners).where(eq(chowWinners.id, id))
  revalidateAll()
}

// ── Settings (e.g. the weekly CHOW challenge text) ──
export async function saveSetting(formData: FormData) {
  await requireAdmin()
  const key = str(formData, 'key')
  const value = str(formData, 'value')
  if (!key) return
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  revalidateAll()
}

// ── Session milestone celebration ──
export async function saveSessionMilestone(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const values = {
    name: str(formData, 'name'),
    sessions: num(formData, 'sessions'),
    imageUrl: str(formData, 'imageUrl'),
    active: bool(formData, 'active'),
  }
  if (id > 0) {
    await db.update(sessionMilestones).set(values).where(eq(sessionMilestones.id, id))
  } else {
    await db.insert(sessionMilestones).values(values)
  }
  revalidateAll()
}

export async function deleteSessionMilestone(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  if (id > 0) await db.delete(sessionMilestones).where(eq(sessionMilestones.id, id))
  revalidateAll()
}

// ── State-returning wrappers (used with useActionState for save confirmations) ──
// Each wrapper catches errors (e.g. an expired admin session) and returns a
// failure state so the UI can show a message instead of crashing the preview.
async function runSave(fn: () => Promise<void>): Promise<SaveState> {
  try {
    await fn()
    return { ok: true, message: 'Saved', at: Date.now() }
  } catch (err) {
    const message =
      err instanceof Error && err.message === 'Unauthorized'
        ? 'Session expired — please log in again to save.'
        : 'Something went wrong. Please try again.'
    return { ok: false, message, at: Date.now() }
  }
}

export async function saveSettingState(_prev: SaveState, formData: FormData): Promise<SaveState> {
  return runSave(() => saveSetting(formData))
}

export async function saveChowWinnerState(_prev: SaveState, formData: FormData): Promise<SaveState> {
  return runSave(() => saveChowWinner(formData))
}

export async function saveSessionMilestoneState(_prev: SaveState, formData: FormData): Promise<SaveState> {
  return runSave(() => saveSessionMilestone(formData))
}

export async function saveSpecialState(_prev: SaveState, formData: FormData): Promise<SaveState> {
  return runSave(() => saveSpecial(formData))
}

// ── Gallery categories CRUD ──
export async function saveGalleryCategory(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const name = str(formData, 'name')
  const sortOrder = num(formData, 'sortOrder')
  if (!name) return
  if (id > 0) {
    await db.update(galleryCategories).set({ name, sortOrder }).where(eq(galleryCategories.id, id))
  } else {
    await db.insert(galleryCategories).values({ name, sortOrder })
  }
  revalidatePath('/admin')
  revalidatePath('/gallery')
}

export async function deleteGalleryCategory(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  if (id > 0) {
    await db.delete(galleryCategories).where(eq(galleryCategories.id, id))
  }
  revalidatePath('/admin')
  revalidatePath('/gallery')
}

// ── Gallery photos CRUD ──
export async function saveGalleryPhoto(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const categoryId = num(formData, 'categoryId')
  const url = str(formData, 'url')
  const alt = str(formData, 'alt')
  const sortOrder = num(formData, 'sortOrder')
  if (!url || !categoryId) return
  if (id > 0) {
    await db.update(galleryPhotos).set({ categoryId, url, alt, sortOrder }).where(eq(galleryPhotos.id, id))
  } else {
    await db.insert(galleryPhotos).values({ categoryId, url, alt, sortOrder })
  }
  revalidatePath('/admin')
  revalidatePath('/gallery')
}

export async function deleteGalleryPhoto(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  if (id > 0) {
    await db.delete(galleryPhotos).where(eq(galleryPhotos.id, id))
  }
  revalidatePath('/admin')
  revalidatePath('/gallery')
}

// Inline category change — called directly (no useActionState wrapper needed)
export async function updateGalleryPhotoCategory(formData: FormData) {
  await requireAdmin()
  const id = num(formData, 'id')
  const categoryId = num(formData, 'categoryId')
  if (!id || !categoryId) return
  await db.update(galleryPhotos).set({ categoryId }).where(eq(galleryPhotos.id, id))
  revalidatePath('/admin')
  revalidatePath('/gallery')
}

export async function saveGalleryCategoryState(_prev: SaveState, formData: FormData): Promise<SaveState> {
  return runSave(() => saveGalleryCategory(formData))
}

export async function saveGalleryPhotoState(_prev: SaveState, formData: FormData): Promise<SaveState> {
  return runSave(() => saveGalleryPhoto(formData))
}

// ── WhatsApp settings ──────────────────────────────────────────────────────────

// Save a single WhatsApp setting key/value pair.
async function saveWhatsappSetting(formData: FormData): Promise<void> {
  await requireAdmin()
  const entries: [string, string][] = []
  for (const [key, val] of formData.entries()) {
    if (key.startsWith('wa_')) {
      const settingKey = key.slice(3) // strip "wa_" prefix
      entries.push([settingKey, String(val)])
    }
  }
  for (const [key, value] of entries) {
    await db
      .insert(whatsappSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: whatsappSettings.key, set: { value, updatedAt: new Date() } })
  }
  revalidatePath('/admin')
}

export async function saveWhatsappSettingState(_prev: SaveState, formData: FormData): Promise<SaveState> {
  return runSave(() => saveWhatsappSetting(formData))
}

// Send a test WhatsApp message to each configured alert number and return the actual API response.
export async function sendWhatsappTest(_formData: FormData): Promise<{ ok: boolean; message: string }> {
  await requireAdmin()
  const { getWhatsappSettings, interpolate, sendWhatsAppTextVerbose } = await import('@/lib/whatsapp')
  const waSettings = await getWhatsappSettings()

  const pid = waSettings.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  const token = waSettings.access_token || process.env.WHATSAPP_ACCESS_TOKEN || ''
  const groupId = waSettings.group_chat_id || ''

  if (!pid) return { ok: false, message: 'Phone Number ID is not set. Save it in the Credentials section first.' }
  if (!token) return { ok: false, message: 'Access Token is not set. Save it in the Credentials section first.' }
  if (!groupId) return { ok: false, message: 'Alert Phone Numbers are not set. Add at least one number in the Group Alert section.' }

  // Step 1: Verify the Phone Number ID is valid by calling the Meta API
  let registeredNumber = ''
  try {
    const verifyRes = await fetch(`https://graph.facebook.com/v19.0/${pid}?fields=display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const verifyJson = await verifyRes.json()
    if (!verifyRes.ok || verifyJson.error) {
      const errMsg = verifyJson?.error?.message || JSON.stringify(verifyJson)
      return { ok: false, message: `Credential check failed — ${errMsg}. Check your Phone Number ID and Access Token.` }
    }
    registeredNumber = verifyJson.display_phone_number || ''
  } catch (err) {
    return { ok: false, message: `Could not verify credentials: ${err instanceof Error ? err.message : 'Network error'}` }
  }

  const template = waSettings.group_alert_message || 'New trial booking!\n\nName: {{name}}\nDate: {{date}}\nTime: {{time}}\nPhone: {{phone}}\nEmail: {{email}}'
  const body = interpolate(template, { name: 'Test User', date: 'Monday, 7 July 2025', time: '06:00 AM', phone: '+27 00 000 0000', email: 'test@example.com' })

  const recipients = groupId.split(',').map((n: string) => n.trim()).filter(Boolean)
  const results: string[] = []

  for (const recipient of recipients) {
    const result = await sendWhatsAppTextVerbose(recipient, body, pid, token)
    const detail = result.ok ? 'sent' : `${result.error}${result.raw ? ` | raw: ${result.raw}` : ''}`
    results.push(`${recipient}: ${detail}`)
  }

  const allOk = results.every((r) => r.endsWith('sent'))
  return {
    ok: allOk,
    message: `Sending from ${registeredNumber} (ID: ${pid}) → ${results.join(' | ')}`,
  }
}
