'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronRight, MessageSquare, Trash2, CheckCircle2, Clock, XCircle, Download } from 'lucide-react'
import { saveTrialNote, deleteTrialNote, updateTrialBookingSchedule, markTrialConverted } from '@/app/actions/operations'
import { formatDateLong, parseDateString, slotGroupsForDay } from '@/lib/trial-slots'
import {
  buildSessionPurchaseEmailIndex,
  buildSignupEmailIndex,
  getTrialConversion,
  ymdInJohannesburg,
  type TrialConversion,
} from '@/lib/trial-conversion'
import type { TrialBooking, TrialBookingNote, MembershipSignup, SessionPurchase } from '@/lib/db/schema'

interface Props {
  bookings: TrialBooking[]
  notes: TrialBookingNote[]
  signups: MembershipSignup[]
  sessionPurchases: SessionPurchase[]
}

export function TrialsTab({ bookings, notes, signups, sessionPurchases }: Props) {
  const [showPast, setShowPast] = useState(false)
  const today = ymdInJohannesburg()
  const monthPrefix = today.slice(0, 7)

  // Previous month prefix (YYYY-MM)
  const prevMonthPrefix = useMemo(() => {
    const [y, m] = monthPrefix.split('-').map(Number)
    const pm = m === 1 ? 12 : m - 1
    const py = m === 1 ? y - 1 : y
    return `${py}-${String(pm).padStart(2, '0')}`
  }, [monthPrefix])

  const signupIndex = useMemo(() => buildSignupEmailIndex(signups), [signups])
  const sessionPurchaseIndex = useMemo(() => buildSessionPurchaseEmailIndex(sessionPurchases), [sessionPurchases])

  const { upcoming, past } = useMemo(() => {
    const upcoming = bookings.filter((b) => b.appointmentDate >= today)
    const past = bookings.filter((b) => b.appointmentDate < today)
    return { upcoming, past }
  }, [bookings, today])

  const kpi = useMemo(() => {
    const completedTrials = bookings.filter(
      (b) => b.appointmentDate.slice(0, 7) === monthPrefix && b.appointmentDate < today,
    )
    const converted = completedTrials.filter((b) => getTrialConversion(b, signupIndex, sessionPurchaseIndex, today).status === 'converted').length
    const total = completedTrials.length
    const rate = total > 0 ? Math.round((converted / total) * 100) : 0

    const prevCompleted = bookings.filter((b) => b.appointmentDate.slice(0, 7) === prevMonthPrefix)
    const prevConverted = prevCompleted.filter((b) => getTrialConversion(b, signupIndex, sessionPurchaseIndex, today).status === 'converted').length
    const prevTotal = prevCompleted.length
    const prevRate = prevTotal > 0 ? Math.round((prevConverted / prevTotal) * 100) : 0

    return { total, converted, rate, prevTotal, prevConverted, prevRate }
  }, [bookings, monthPrefix, prevMonthPrefix, sessionPurchaseIndex, signupIndex, today])

  const visible = showPast ? [...upcoming, ...past] : upcoming

  async function handleExport() {
    const { utils, writeFile } = await import('xlsx')
    const nonConverted = past.filter(
      (b) => getTrialConversion(b, signupIndex, sessionPurchaseIndex, today).status !== 'converted',
    )
    const rows = nonConverted.map((b) => {
      const bookingNotes = notes.filter((n) => n.bookingId === b.id).map((n) => n.note).join(' | ')
      return {
        'Full Name': b.fullName,
        'Email': b.email,
        'Phone': b.phone,
        'Appointment Date': b.appointmentDate,
        'Appointment Time': b.appointmentTime,
        'Notes': bookingNotes,
      }
    })
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Not Converted')
    const date = new Date().toISOString().slice(0, 10)
    writeFile(wb, `non-converted-trials-${date}.xlsx`)
  }

  return (
    <div>
      <ConversionSummary
        total={kpi.total} converted={kpi.converted} rate={kpi.rate}
        prevTotal={kpi.prevTotal} prevConverted={kpi.prevConverted} prevRate={kpi.prevRate}
        prevMonthPrefix={prevMonthPrefix}
      />

      {visible.length === 0 ? (
        <p className="py-2 text-xs text-light-grey">No upcoming trials.</p>
      ) : (
        <div className="space-y-1">
          {visible.map((b) => {
            const bookingNotes = notes.filter((n) => n.bookingId === b.id)
            const isPast = b.appointmentDate < today
            const conv = getTrialConversion(b, signupIndex, sessionPurchaseIndex, today)
            return <TrialRow key={b.id} booking={b} notes={bookingNotes} isPast={isPast} conversion={conv} />
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowPast((v) => !v)}
        className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-light-grey hover:text-foreground"
      >
        {showPast ? 'Hide past' : `Show past (${past.length})`}
      </button>

      {/* Export non-converted */}
      <div className="mt-3 border-t border-steel/30 pt-3">
        <button
          type="button"
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-steel/60 px-3 py-2 text-[11px] font-semibold text-light-grey transition-colors hover:border-neon-green hover:text-neon-green"
        >
          <Download className="size-3.5" />
          Export non-converted ({past.filter((b) => getTrialConversion(b, signupIndex, sessionPurchaseIndex, today).status !== 'converted').length})
        </button>
      </div>
    </div>
  )
}

function ConversionSummary({
  total, converted, rate,
  prevTotal, prevConverted, prevRate, prevMonthPrefix,
}: {
  total: number; converted: number; rate: number
  prevTotal: number; prevConverted: number; prevRate: number; prevMonthPrefix: string
}) {
  const prevMonthName = new Date(`${prevMonthPrefix}-15`).toLocaleString('en-ZA', { month: 'long', year: 'numeric' })
  return (
    <div className="mb-3 space-y-2">
      {/* Previous month — compact */}
      <div className="rounded-xl border border-steel/40 bg-background/20 px-3.5 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-mid-grey">{prevMonthName}</p>
        <div className="mt-1.5 flex items-end gap-4">
          <div>
            <p className="text-base font-black leading-none text-foreground/70 tabular-nums">{prevTotal}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-light-grey/70">Trials</p>
          </div>
          <div>
            <p className="text-base font-black leading-none text-neon-green/70 tabular-nums">{prevConverted}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-light-grey/70">Converted</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-base font-black leading-none text-neon-blue/70 tabular-nums">{prevRate}%</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-light-grey/70">Conversion</p>
          </div>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-steel/30">
          <div className="h-full rounded-full bg-neon-green/50 transition-all" style={{ width: `${prevRate}%` }} />
        </div>
      </div>

      {/* This month — prominent */}
      <div className="rounded-xl border border-steel/60 bg-background/40 px-3.5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-mid-grey">This Month</p>
        <div className="mt-2 flex items-end gap-4">
          <div>
            <p className="text-xl font-black leading-none text-foreground tabular-nums">{total}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-light-grey">Trials</p>
          </div>
          <div>
            <p className="text-xl font-black leading-none text-neon-green tabular-nums">{converted}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-light-grey">Converted</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xl font-black leading-none text-neon-blue tabular-nums">{rate}%</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-light-grey">Conversion</p>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-steel/40">
          <div className="h-full rounded-full bg-neon-green transition-all" style={{ width: `${rate}%` }} />
        </div>
      </div>
    </div>
  )
}

function ConversionBadge({ conversion }: { conversion: TrialConversion }) {
  if (conversion.status === 'converted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neon-green/15 px-1.5 py-0.5 text-[10px] font-bold text-neon-green">
        <CheckCircle2 className="size-2.5" /> Converted
      </span>
    )
  }
  if (conversion.status === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
        <Clock className="size-2.5" /> Upcoming
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
      <XCircle className="size-2.5" /> Not converted
    </span>
  )
}

function addDaysYmd(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function TrialRow({
  booking: b,
  notes,
  isPast,
  conversion,
}: {
  booking: TrialBooking
  notes: TrialBookingNote[]
  isPast: boolean
  conversion: TrialConversion
}) {
  const [expanded, setExpanded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [pending, setPending] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [dateValue, setDateValue] = useState(b.appointmentDate)
  const [timeValue, setTimeValue] = useState(b.appointmentTime)
  const [schedulePending, setSchedulePending] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const minDate = ymdInJohannesburg()
  const maxDate = addDaysYmd(90)
  const slotGroups = useMemo(() => {
    const date = parseDateString(dateValue)
    return date ? slotGroupsForDay(date.getDay()) : []
  }, [dateValue])
  const availableTimes = slotGroups.flatMap((group) => group.slots)

  useEffect(() => {
    if (availableTimes.length === 0) {
      if (timeValue !== '') setTimeValue('')
      return
    }
    if (!availableTimes.includes(timeValue)) {
      setTimeValue(availableTimes[0])
    }
  }, [availableTimes, timeValue])

  async function handleNote() {
    if (!noteText.trim()) return
    setPending(true)
    const fd = new FormData()
    fd.set('bookingId', String(b.id))
    fd.set('note', noteText.trim())
    await saveTrialNote(fd)
    setNoteText('')
    setPending(false)
  }

  async function handleScheduleSave() {
    if (!dateValue) return
    setSchedulePending(true)
    setScheduleMessage(null)
    const fd = new FormData()
    fd.set('bookingId', String(b.id))
    fd.set('appointmentDate', dateValue)
    fd.set('appointmentTime', timeValue)
    try {
      const result = await updateTrialBookingSchedule(fd)
      if (!result.ok) {
        setScheduleMessage({ tone: 'error', text: result.error ?? 'Could not update the trial booking.' })
        return
      }
      setEditingSchedule(false)
      setScheduleMessage({ tone: 'success', text: 'Trial schedule updated and confirmation emailed.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update the trial booking.'
      setScheduleMessage({ tone: 'error', text: message })
    } finally {
      setSchedulePending(false)
    }
  }

  return (
    <div className={`rounded-xl border bg-background ${isPast ? 'border-steel/30' : 'border-steel/60'}`}>
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
      >
        <span className="mt-0.5 shrink-0">
          {expanded ? (
            <ChevronDown className="size-3.5 text-light-grey" />
          ) : (
            <ChevronRight className="size-3.5 text-light-grey" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`flex-1 truncate text-xs font-semibold ${isPast ? 'text-light-grey' : 'text-foreground'}`}>
              {b.fullName}
            </span>
            <span className="shrink-0 text-[10px] text-light-grey">
              {b.appointmentDate.slice(5).replace('-', '/')} {b.appointmentTime}
            </span>
            {notes.length > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-neon-green/15 px-1.5 py-0.5 text-[9px] font-bold text-neon-green">
                <MessageSquare className="size-2.5" /> {notes.length}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ConversionBadge conversion={conversion} />
            {conversion.status === 'converted' && conversion.packageLabel && (
              <span className="text-[10px] font-semibold text-light-grey">{conversion.packageLabel}</span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-2 border-t border-steel/40 px-3 py-2">
          <div className="space-y-2">
            <div className="space-y-0.5 text-xs text-light-grey">
              <p>{formatDateLong(b.appointmentDate)} · {b.appointmentTime}</p>
              <p>{b.phone}</p>
              <p className="truncate">{b.email}</p>
            </div>
            <div className="rounded-lg border border-steel/40 bg-card/50 p-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-mid-grey">Trial schedule</p>
                  <p className="text-xs font-semibold text-foreground">{formatDateLong(dateValue)}</p>
                  <p className="text-[10px] text-light-grey">{timeValue}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDateValue(b.appointmentDate)
                    setTimeValue(b.appointmentTime)
                    setScheduleMessage(null)
                    setEditingSchedule((value) => !value)
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-steel/60 px-2 py-1 text-[10px] font-semibold text-light-grey transition-colors hover:border-neon-blue hover:text-foreground"
                >
                  <CalendarDays className="size-3" />
                  {editingSchedule ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingSchedule && (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-mid-grey">
                    New date
                    <input
                      type="date"
                      value={dateValue}
                      min={minDate}
                      max={maxDate}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="rounded border border-steel bg-background px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-foreground outline-none focus:border-neon-green"
                    />
                  </label>
                  <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-mid-grey">
                    New time
                    <select
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="rounded border border-steel bg-background px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-foreground outline-none focus:border-neon-green"
                    >
                      {slotGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.slots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleScheduleSave}
                    disabled={schedulePending || !dateValue || !timeValue || availableTimes.length === 0}
                    className="rounded border border-neon-green px-2.5 py-1.5 text-[10px] font-semibold text-neon-green disabled:opacity-50"
                  >
                    {schedulePending ? 'Sending…' : 'Confirm and Email'}
                  </button>
                </div>
              )}
              {editingSchedule && availableTimes.length === 0 && (
                <p className="mt-2 text-[10px] text-red-400">No trial slots are available on that day.</p>
              )}
              {scheduleMessage && (
                <p className={`mt-2 text-[10px] ${scheduleMessage.tone === 'success' ? 'text-neon-green' : 'text-red-400'}`}>
                  {scheduleMessage.text}
                </p>
              )}
            </div>
          </div>

          {/* Manual conversion override */}
          {isPast && (
            <form action={markTrialConverted}>
              <input type="hidden" name="bookingId" value={b.id} />
              <input type="hidden" name="value" value={b.manuallyConverted ? 'false' : 'true'} />
              <button
                type="submit"
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                  b.manuallyConverted
                    ? 'border-steel/60 text-light-grey hover:border-red-400 hover:text-red-400'
                    : 'border-neon-green/50 text-neon-green hover:border-neon-green'
                }`}
              >
                <CheckCircle2 className="size-3" />
                {b.manuallyConverted ? 'Undo manual conversion' : 'Mark as converted'}
              </button>
            </form>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="space-y-1">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-1.5 rounded bg-card px-2 py-1.5 text-xs">
                  <div>
                    <p className="text-foreground">{n.note}</p>
                    <p className="text-[10px] text-light-grey">
                      {new Date(n.createdAt).toLocaleString('en-ZA', {
                        timeZone: 'Africa/Johannesburg',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <form action={deleteTrialNote} className="shrink-0">
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className="rounded p-0.5 text-light-grey hover:text-red-400" aria-label="Delete note">
                      <Trash2 className="size-3" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          {/* Add note */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleNote() }}
              placeholder="Add note…"
              className="flex-1 rounded border border-steel bg-card px-2 py-1 text-xs text-foreground outline-none placeholder:text-light-grey focus:border-neon-green"
            />
            <button
              type="button"
              onClick={handleNote}
              disabled={pending || !noteText.trim()}
              className="rounded border border-neon-green px-2.5 py-1 text-[10px] font-semibold text-neon-green disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
