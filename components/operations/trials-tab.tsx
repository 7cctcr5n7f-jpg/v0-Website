'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, MessageSquare, Trash2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { saveTrialNote, deleteTrialNote } from '@/app/actions/operations'
import { formatDateLong } from '@/lib/trial-slots'
import {
  buildSignupEmailIndex,
  getTrialConversion,
  normalizeEmail,
  ymdInJohannesburg,
  type TrialConversion,
} from '@/lib/trial-conversion'
import type { TrialBooking, TrialBookingNote, MembershipSignup } from '@/lib/db/schema'

interface Props {
  bookings: TrialBooking[]
  notes: TrialBookingNote[]
  signups: MembershipSignup[]
}

export function TrialsTab({ bookings, notes, signups }: Props) {
  const [showPast, setShowPast] = useState(false)
  const today = ymdInJohannesburg()
  const monthPrefix = today.slice(0, 7)

  const index = useMemo(() => buildSignupEmailIndex(signups), [signups])

  const { upcoming, past } = useMemo(() => {
    const upcoming = bookings.filter((b) => b.appointmentDate >= today)
    const past = bookings.filter((b) => b.appointmentDate < today)
    return { upcoming, past }
  }, [bookings, today])

  const kpi = useMemo(() => {
    const monthTrials = bookings.filter((b) => b.appointmentDate.slice(0, 7) === monthPrefix)
    const converted = monthTrials.filter((b) => index.has(normalizeEmail(b.email))).length
    const total = monthTrials.length
    const rate = total > 0 ? Math.round((converted / total) * 100) : 0
    return { total, converted, rate }
  }, [bookings, index, monthPrefix])

  const visible = showPast ? [...upcoming, ...past] : upcoming

  return (
    <div>
      <ConversionSummary total={kpi.total} converted={kpi.converted} rate={kpi.rate} />

      {visible.length === 0 ? (
        <p className="py-2 text-xs text-light-grey">No upcoming trials.</p>
      ) : (
        <div className="space-y-1">
          {visible.map((b) => {
            const bookingNotes = notes.filter((n) => n.bookingId === b.id)
            const isPast = b.appointmentDate < today
            const conv = getTrialConversion(b, index, today)
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
    </div>
  )
}

function ConversionSummary({ total, converted, rate }: { total: number; converted: number; rate: number }) {
  return (
    <div className="mb-3 rounded-xl border border-steel/60 bg-background/40 px-3.5 py-3">
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
        <div className="border-t border-steel/40 px-3 py-2 space-y-2">
          <div className="text-xs text-light-grey space-y-0.5">
            <p>{formatDateLong(b.appointmentDate)} · {b.appointmentTime}</p>
            <p>{b.phone}</p>
            <p className="truncate">{b.email}</p>
          </div>

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
