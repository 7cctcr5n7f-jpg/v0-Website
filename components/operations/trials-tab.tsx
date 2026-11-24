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
    <div className="space-y-4">
      <ConversionSummary
        total={kpi.total} converted={kpi.converted} rate={kpi.rate}
        prevTotal={kpi.prevTotal} prevConverted={kpi.prevConverted} prevRate={kpi.prevRate}
        prevMonthPrefix={prevMonthPrefix}
      />

      {visible.length === 0 ? (
        <p className="py-6 text-center text-xs font-medium text-zinc-400">No upcoming trials.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((b) => {
            const bookingNotes = notes.filter((n) => n.bookingId === b.id)
            const isPast = b.appointmentDate < today
            const conv = getTrialConversion(b, signupIndex, sessionPurchaseIndex, today)
            return <TrialRow key={b.id} booking={b} notes={bookingNotes} isPast={isPast} conversion={conv} />
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          {showPast ? 'Hide past trials' : `Show past trials (${past.length})`}
        </button>

        {/* Export non-converted */}
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-xs hover:border-emerald-500 hover:text-emerald-700 transition-colors"
        >
          <Download className="size-3.5" />
          <span>Export non-converted ({past.filter((b) => getTrialConversion(b, signupIndex, sessionPurchaseIndex, today).status !== 'converted').length})</span>
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Previous month — compact */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 shadow-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{prevMonthName}</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-xl font-black leading-none text-zinc-700 tabular-nums">{prevConverted}/{prevTotal}</p>
            <p className="mt-1 text-[10px] font-medium text-zinc-500">Converted / Total</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black leading-none text-blue-700 tabular-nums">{prevRate}%</p>
            <p className="mt-1 text-[10px] font-medium text-zinc-500">Conversion Rate</p>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${prevRate}%` }} />
        </div>
      </div>

      {/* This month — prominent */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">This Month</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-2xl font-black leading-none text-zinc-900 tabular-nums">{converted}/{total}</p>
            <p className="mt-1 text-[10px] font-semibold text-emerald-700">Converted / Total</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black leading-none text-emerald-700 tabular-nums">{rate}%</p>
            <p className="mt-1 text-[10px] font-semibold text-emerald-700">Conversion Rate</p>
          </div>
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
        </div>
      </div>
    </div>
  )
}

function ConversionBadge({ conversion }: { conversion: TrialConversion }) {
  if (conversion.status === 'converted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
        <CheckCircle2 className="size-3" /> Converted
      </span>
    )
  }
  if (conversion.status === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
        <Clock className="size-3" /> Upcoming
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
      <XCircle className="size-3" /> Not converted
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
    <div className={`rounded-xl border shadow-xs transition-colors ${isPast ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-200 bg-white'}`}>
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span className="mt-0.5 shrink-0 text-zinc-400">
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`flex-1 truncate text-sm font-bold ${isPast ? 'text-zinc-700' : 'text-zinc-900'}`}>
              {b.fullName}
            </span>
            <span className="shrink-0 text-xs font-semibold text-zinc-500">
              {b.appointmentDate} · {b.appointmentTime}
            </span>
            {notes.length > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 border border-zinc-200">
                <MessageSquare className="size-3" /> {notes.length}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <ConversionBadge conversion={conversion} />
            {conversion.status === 'converted' && conversion.packageLabel && (
              <span className="text-xs font-semibold text-emerald-800">{conversion.packageLabel}</span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/60 p-3.5 rounded-b-xl">
          <div className="space-y-2">
            <div className="space-y-0.5 text-xs text-zinc-600">
              <p><strong className="text-zinc-800">Date & Time:</strong> {formatDateLong(b.appointmentDate)} · {b.appointmentTime}</p>
              <p><strong className="text-zinc-800">Phone:</strong> {b.phone || '—'}</p>
              <p className="truncate"><strong className="text-zinc-800">Email:</strong> {b.email}</p>
            </div>
            
            {/* Trial schedule edit */}
            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Reschedule Slot</p>
                  <p className="text-xs font-bold text-zinc-900">{formatDateLong(dateValue)} at {timeValue}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDateValue(b.appointmentDate)
                    setTimeValue(b.appointmentTime)
                    setScheduleMessage(null)
                    setEditingSchedule((value) => !value)
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <CalendarDays className="size-3.5" />
                  <span>{editingSchedule ? 'Cancel' : 'Change Date/Time'}</span>
                </button>
              </div>
              {editingSchedule && (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3">
                  <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    New date
                    <input
                      type="date"
                      value={dateValue}
                      min={minDate}
                      max={maxDate}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    New time
                    <select
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
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
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {schedulePending ? 'Updating…' : 'Save & Email'}
                  </button>
                </div>
              )}
              {editingSchedule && availableTimes.length === 0 && (
                <p className="mt-2 text-xs text-rose-600 font-medium">No trial slots available on that day.</p>
              )}
              {scheduleMessage && (
                <p className={`mt-2 text-xs font-medium ${scheduleMessage.tone === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
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
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  b.manuallyConverted
                    ? 'border-zinc-300 bg-white text-zinc-700 hover:border-rose-300 hover:text-rose-700'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="size-3.5" />
                <span>{b.manuallyConverted ? 'Undo manual conversion' : 'Mark as converted (different email used)'}</span>
              </button>
            </form>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Trial Notes</p>
              {notes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-2 text-xs">
                  <div>
                    <p className="text-zinc-800">{n.note}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
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
                    <button type="submit" className="rounded p-1 text-zinc-400 hover:text-rose-600 transition-colors" aria-label="Delete note">
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          {/* Add note */}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleNote() }}
              placeholder="Add quick trial note…"
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleNote}
              disabled={pending || !noteText.trim()}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-900 disabled:opacity-40 transition-colors"
            >
              Add Note
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
