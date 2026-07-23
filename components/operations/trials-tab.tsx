'use client'

import { useMemo, useState } from 'react'
import { Search, CalendarDays, Phone, Mail, MessageSquare, Trash2 } from 'lucide-react'
import { saveTrialNote, deleteTrialNote } from '@/app/actions/operations'
import { formatDateLong } from '@/lib/trial-slots'
import type { TrialBooking, TrialBookingNote } from '@/lib/db/schema'

type FilterRange = 'upcoming' | 'past' | 'all'

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
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<FilterRange>('upcoming')
  const today = todayStr()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings.filter((b) => {
      const matchQ = !q || b.fullName.toLowerCase().includes(q) || b.phone.toLowerCase().includes(q)
      const matchR =
        range === 'all' ||
        (range === 'upcoming' && b.appointmentDate >= today) ||
        (range === 'past' && b.appointmentDate < today)
      return matchQ && matchR
    })
  }, [bookings, query, range, today])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-light-grey" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone"
            className="w-full rounded-lg border border-steel bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-light-grey focus:border-neon-blue"
          />
        </div>
        <div className="flex rounded-lg border border-steel bg-card p-1 text-xs font-semibold uppercase tracking-wide">
          {(['upcoming', 'past', 'all'] as FilterRange[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setRange(f)}
              className={
                'rounded-md px-3 py-1.5 transition-colors ' +
                (range === f ? 'bg-neon-blue text-white' : 'text-light-grey hover:text-foreground')
              }
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs uppercase tracking-wide text-light-grey">
        {filtered.length} {filtered.length === 1 ? 'booking' : 'bookings'}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-steel p-10 text-center text-sm text-light-grey">
          No bookings found.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((b) => {
            const bookingNotes = notes.filter((n) => n.bookingId === b.id)
            return <TrialCard key={b.id} booking={b} notes={bookingNotes} />
          })}
        </div>
      )}
    </div>
  )
}

function TrialCard({ booking: b, notes }: { booking: TrialBooking; notes: TrialBookingNote[] }) {
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

  const isPast = b.appointmentDate < todayStr()

  return (
    <div className={`rounded-2xl border bg-card ${isPast ? 'border-steel/50 opacity-70' : 'border-steel'}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start justify-between p-4 text-left"
      >
        <div>
          <p className="font-semibold text-foreground">{b.fullName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-light-grey">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3 text-neon-blue" />
              {formatDateLong(b.appointmentDate)} · {b.appointmentTime}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="size-3" /> {b.phone}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-neon-green/15 px-2 py-0.5 text-[10px] font-bold text-neon-green">
              <MessageSquare className="size-3" /> {notes.length}
            </span>
          )}
          <span className="text-xs text-light-grey">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-steel/50 p-4">
          <div className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <a href={`mailto:${b.email}`} className="flex items-center gap-2 text-light-grey hover:text-neon-blue">
              <Mail className="size-4 shrink-0" /> {b.email}
            </a>
            <a href={`tel:${b.phone}`} className="flex items-center gap-2 text-light-grey hover:text-neon-blue">
              <Phone className="size-4 shrink-0" /> {b.phone}
            </a>
          </div>

          {/* Notes */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-light-grey">Trainer Notes</p>
          {notes.length === 0 ? (
            <p className="mb-3 text-xs text-light-grey">No notes yet.</p>
          ) : (
            <div className="mb-3 space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-steel/60 bg-background/50 p-3 text-sm">
                  <div>
                    <p className="text-foreground">{n.note}</p>
                    <p className="mt-0.5 text-xs text-light-grey">
                      {new Date(n.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <form action={deleteTrialNote} className="shrink-0">
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="rounded p-1 text-light-grey transition-colors hover:text-red-400"
                      aria-label="Delete note"
                    >
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleNote()
              }}
              placeholder="Add a note…"
              className="flex-1 rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-light-grey focus:border-neon-green"
            />
            <button
              type="button"
              onClick={handleNote}
              disabled={pending || !noteText.trim()}
              className="rounded-lg border border-neon-green px-4 py-2 text-sm font-semibold text-neon-green transition-colors hover:bg-neon-green/10 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
