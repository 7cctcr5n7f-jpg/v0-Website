'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, MessageSquare, Trash2 } from 'lucide-react'
import { saveTrialNote, deleteTrialNote } from '@/app/actions/operations'
import { formatDateLong } from '@/lib/trial-slots'
import type { TrialBooking, TrialBookingNote } from '@/lib/db/schema'

function todayStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface Props {
  bookings: TrialBooking[]
  notes: TrialBookingNote[]
}

export function TrialsTab({ bookings, notes }: Props) {
  const [showPast, setShowPast] = useState(false)
  const today = todayStr()

  const { upcoming, past } = useMemo(() => {
    const upcoming = bookings.filter((b) => b.appointmentDate >= today)
    const past = bookings.filter((b) => b.appointmentDate < today)
    return { upcoming, past }
  }, [bookings, today])

  const visible = showPast ? [...upcoming, ...past] : upcoming

  return (
    <div>
      {visible.length === 0 ? (
        <p className="py-2 text-xs text-light-grey">No upcoming trials.</p>
      ) : (
        <div className="space-y-1">
          {visible.map((b) => {
            const bookingNotes = notes.filter((n) => n.bookingId === b.id)
            const isPast = b.appointmentDate < today
            return <TrialRow key={b.id} booking={b} notes={bookingNotes} isPast={isPast} />
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

function TrialRow({
  booking: b,
  notes,
  isPast,
}: {
  booking: TrialBooking
  notes: TrialBookingNote[]
  isPast: boolean
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
    <div className={`rounded-xl border bg-background ${isPast ? 'border-steel/30 opacity-60' : 'border-steel/60'}`}>
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-light-grey" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-light-grey" />
        )}
        <span className="flex-1 text-xs font-semibold text-foreground">{b.fullName}</span>
        <span className="text-[10px] text-light-grey">
          {b.appointmentDate.slice(5).replace('-', '/')} {b.appointmentTime}
        </span>
        {notes.length > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-neon-green/15 px-1.5 py-0.5 text-[9px] font-bold text-neon-green">
            <MessageSquare className="size-2.5" /> {notes.length}
          </span>
        )}
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
