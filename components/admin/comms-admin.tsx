'use client'

import { useState, useTransition } from 'react'
import { MessageSquare, Bell, Shield, Send, CheckCircle, XCircle, Info } from 'lucide-react'
import { AdminForm } from '@/components/admin/admin-form'
import { TextField, TextArea, CheckField, FieldGrid } from '@/components/admin/fields'
import { saveWhatsappSettingState, sendWhatsappTest } from '@/app/actions/admin'
import type { WaSettings } from '@/lib/whatsapp'

const cardCls = 'rounded-2xl border border-steel bg-card p-5 sm:p-6'
const sectionHead = 'mb-4 flex items-center gap-2 border-b border-steel pb-3'

function SectionIcon({ icon: Icon, label }: { icon: typeof MessageSquare; label: string }) {
  return (
    <div className={sectionHead}>
      <Icon className="size-5 text-neon-blue" />
      <h3 className="font-display text-lg font-black uppercase tracking-tight">{label}</h3>
    </div>
  )
}

export function CommsAdmin({ settings }: { settings: WaSettings }) {
  const [testState, setTestState] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleTest() {
    setTestState(null)
    startTransition(async () => {
      const result = await sendWhatsappTest(new FormData())
      setTestState(result)
    })
  }

  const varHint = (
    <p className="mt-1 text-xs text-light-grey">
      Available variables: <code className="rounded bg-steel/30 px-1">{'{{name}}'}</code>{' '}
      <code className="rounded bg-steel/30 px-1">{'{{date}}'}</code>{' '}
      <code className="rounded bg-steel/30 px-1">{'{{time}}'}</code>{' '}
      <code className="rounded bg-steel/30 px-1">{'{{phone}}'}</code>{' '}
      <code className="rounded bg-steel/30 px-1">{'{{email}}'}</code>
    </p>
  )

  return (
    <div className="space-y-8">

      {/* ── API Credentials ── */}
      <div className={cardCls}>
        <SectionIcon icon={Shield} label="WhatsApp API Credentials" />
        <p className="mb-5 text-sm text-light-grey">
          From your{' '}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-neon-blue underline">
            Meta for Developers
          </a>{' '}
          app. The phone number must be verified and approved for the WhatsApp Business API.
        </p>
        <AdminForm action={saveWhatsappSettingState} submitLabel="Save Credentials">
          <FieldGrid>
            <TextField
              label="Phone Number ID"
              name="wa_phone_number_id"
              defaultValue={settings.phone_number_id ?? ''}
              placeholder="123456789012345"
            />
            <TextField
              label="Access Token"
              name="wa_access_token"
              type="password"
              defaultValue={settings.access_token ?? ''}
              placeholder="EAAxxxxxxx..."
            />
          </FieldGrid>
        </AdminForm>
      </div>

      {/* ── Group Alert ── */}
      <div className={cardCls}>
        <SectionIcon icon={MessageSquare} label="New Booking Group Alert" />
        <p className="mb-5 text-sm text-light-grey">
          When a trial is booked, a WhatsApp message is sent from your business number to each phone number listed below. Separate multiple numbers with a comma.
        </p>
        <AdminForm action={saveWhatsappSettingState} submitLabel="Save Group Settings">
          <CheckField
            label="Enable new booking group alert"
            name="wa_group_alert_enabled"
            defaultChecked={settings.group_alert_enabled !== 'false'}
          />
          <TextField
            label="Alert Phone Numbers (comma-separated, e.g. +27821234567, +27831234567)"
            name="wa_group_chat_id"
            defaultValue={settings.group_chat_id ?? ''}
            placeholder="+27821234567, +27831234567"
          />
          <TextArea
            label="Alert message template"
            name="wa_group_alert_message"
            defaultValue={settings.group_alert_message ?? ''}
            rows={5}
          />
          {varHint}
        </AdminForm>

        {/* Test button */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-steel pt-4">
          <button
            type="button"
            onClick={handleTest}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-neon-blue px-4 py-2 text-sm font-semibold text-neon-blue transition-colors hover:bg-neon-blue hover:text-accent-foreground disabled:opacity-50"
          >
            <Send className="size-4" />
            {isPending ? 'Sending…' : 'Send test alert'}
          </button>
          {testState && (
            <span className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold ${testState.ok ? 'border-neon-green/50 bg-neon-green/10 text-neon-green' : 'border-destructive/50 bg-destructive/10 text-destructive'}`}>
              {testState.ok ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
              {testState.message}
            </span>
          )}
        </div>
      </div>

      {/* ── Reminders ── */}
      <div className={cardCls}>
        <SectionIcon icon={Bell} label="Member Reminder Messages" />
        <p className="mb-5 text-sm text-light-grey">
          Automated WhatsApp messages sent directly to the trial member&apos;s phone number. Two reminders fire per booking: the day before and a few hours before on the day.
        </p>

        <AdminForm action={saveWhatsappSettingState} submitLabel="Save Reminder Settings">
          <CheckField
            label="Enable automated member reminders"
            name="wa_reminders_enabled"
            defaultChecked={settings.reminders_enabled !== 'false'}
          />

          <FieldGrid>
            <TextField
              label="Day-before send time (HH:MM, 24hr)"
              name="wa_day_before_time"
              defaultValue={settings.day_before_time ?? '09:00'}
              placeholder="09:00"
            />
            <TextField
              label="Same-day: hours before trial"
              name="wa_same_day_hours_before"
              defaultValue={settings.same_day_hours_before ?? '2'}
              placeholder="2"
              type="number"
            />
          </FieldGrid>

          <TextArea
            label="Day-before reminder message"
            name="wa_reminder_day_before_message"
            defaultValue={settings.reminder_day_before_message ?? ''}
            rows={4}
          />
          <TextArea
            label="Same-day reminder message"
            name="wa_reminder_same_day_message"
            defaultValue={settings.reminder_same_day_message ?? ''}
            rows={4}
          />
          {varHint}
        </AdminForm>
      </div>

      {/* ── Info banner ── */}
      <div className="flex gap-3 rounded-xl border border-steel bg-card p-4 text-sm text-light-grey">
        <Info className="mt-0.5 size-4 shrink-0 text-neon-blue" />
        <div>
          <p className="font-semibold text-foreground">How reminders work</p>
          <p className="mt-1">
            A cron job runs every 15 minutes on your deployed site and checks upcoming bookings. Reminders are logged per-booking so they fire exactly once. The day-before reminder fires during the hour you set (e.g. 09:00–10:00). The same-day reminder fires within a 15-minute window of your chosen lead time before the trial slot.
          </p>
          <p className="mt-2 text-xs">
            Note: reminders only fire in production (deployed to Vercel) — not in the local preview.
          </p>
        </div>
      </div>

    </div>
  )
}
