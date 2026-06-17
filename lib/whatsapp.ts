/**
 * Thin wrapper around the Meta WhatsApp Cloud API.
 *
 * Credentials come from:
 *   1. The whatsapp_settings DB table (set via the admin Communications tab)
 *   2. Falling back to WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN env vars
 *
 * All sends are best-effort — failures are logged but never throw, so they
 * cannot break the booking flow that calls them.
 */

import { db } from '@/lib/db'
import { whatsappSettings } from '@/lib/db/schema'

const WA_API_BASE = 'https://graph.facebook.com/v19.0'

// ── Settings helpers ──────────────────────────────────────────────────────────

export type WaSettings = Record<string, string>

export async function getWhatsappSettings(): Promise<WaSettings> {
  const rows = await db.select().from(whatsappSettings)
  const map: WaSettings = {}
  for (const row of rows) map[row.key] = row.value
  return map
}

function phoneNumberId(settings: WaSettings): string {
  return settings.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || ''
}

function accessToken(settings: WaSettings): string {
  return settings.access_token || process.env.WHATSAPP_ACCESS_TOKEN || ''
}

// ── Template variable interpolation ──────────────────────────────────────────

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// ── Core send ─────────────────────────────────────────────────────────────────

/**
 * Send a plain-text message to a single recipient.
 * `to` must be in international format, e.g. "+27821234567" or "27821234567".
 */
export async function sendWhatsAppText(
  to: string,
  body: string,
  settings: WaSettings,
): Promise<boolean> {
  const pid = phoneNumberId(settings)
  const token = accessToken(settings)
  const result = await sendWhatsAppTextVerbose(to, body, pid, token)
  return result.ok
}

/**
 * Verbose version that returns the raw error string for diagnostics.
 */
export async function sendWhatsAppTextVerbose(
  to: string,
  body: string,
  pid: string,
  token: string,
): Promise<{ ok: boolean; error: string }> {
  if (!pid || !token || !to) return { ok: false, error: 'Missing credentials or recipient' }

  // Normalise: strip leading +, spaces, dashes
  const recipient = to.replace(/^\+/, '').replace(/[\s-]/g, '')

  try {
    const res = await fetch(`${WA_API_BASE}/${pid}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body, preview_url: false },
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('[whatsapp] send failed', res.status, errText)
      // Parse Meta error message if possible
      try {
        const json = JSON.parse(errText)
        const msg = json?.error?.message || json?.error?.error_data?.details || errText
        return { ok: false, error: `${res.status}: ${msg}` }
      } catch {
        return { ok: false, error: `${res.status}: ${errText}` }
      }
    }
    return { ok: true, error: '' }
  } catch (err) {
    console.error('[whatsapp] fetch error', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Send the new-booking group alert to every phone number in group_chat_id.
 * group_chat_id is a comma-separated list of E.164 numbers, e.g.
 *   "+27821234567, +27831234567"
 */
export async function sendGroupAlert(
  vars: { name: string; date: string; time: string; phone: string; email: string },
  settings: WaSettings,
): Promise<void> {
  if (settings.group_alert_enabled !== 'true') return
  const groupId = settings.group_chat_id
  if (!groupId) return

  const template = settings.group_alert_message || 'New trial booking!\n\nName: {{name}}\nDate: {{date}}\nTime: {{time}}\nPhone: {{phone}}\nEmail: {{email}}'
  const body = interpolate(template, vars)

  // Support comma-separated list of numbers
  const recipients = groupId.split(',').map((n) => n.trim()).filter(Boolean)

  for (const recipient of recipients) {
    await sendWhatsAppText(recipient, body, settings)
  }
}
