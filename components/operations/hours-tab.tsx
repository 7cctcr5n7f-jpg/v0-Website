'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { Staff, ShiftAssignment, ShiftSetting } from '@/lib/db/schema'

interface Props {
  staff: Staff[]
  assignments: ShiftAssignment[]
  shiftSettings: ShiftSetting[]
}

function getWeekDates(anchor: Date): Date[] {
  const d = new Date(anchor)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return Array.from({ length: 6 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd
  })
}

function toIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function HoursTab({ staff, assignments, shiftSettings }: Props) {
  const [anchor, setAnchor] = useState(() => new Date())
  const weekDates = useMemo(() => getWeekDates(anchor), [anchor])
  const weekStart = toIso(weekDates[0])
  const weekEnd = toIso(weekDates[5])

  const defaultHoursMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of shiftSettings) {
      m[s.shiftType] = parseFloat(s.defaultHours) || 0
    }
    return m
  }, [shiftSettings])

  // Build: staffId → { date → [assignments] }
  const summaries = useMemo(() => {
    const byStaff: Record<number, { total: number; days: Record<string, { type: string; hours: number }[]> }> = {}

    for (const s of staff) {
      byStaff[s.id] = { total: 0, days: {} }
    }

    for (const a of assignments) {
      if (a.shiftDate < weekStart || a.shiftDate > weekEnd) continue
      if (!byStaff[a.staffId]) continue
      const h = a.hours ? parseFloat(a.hours) : (defaultHoursMap[a.shiftType] || 0)
      byStaff[a.staffId].total += h
      if (!byStaff[a.staffId].days[a.shiftDate]) byStaff[a.staffId].days[a.shiftDate] = []
      byStaff[a.staffId].days[a.shiftDate].push({ type: a.shiftType, hours: h })
    }

    return staff
      .map((s) => ({ staff: s, ...byStaff[s.id] }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [staff, assignments, weekStart, weekEnd, defaultHoursMap])

  const totalHours = summaries.reduce((acc, s) => acc + s.total, 0)

  return (
    <div>
      {/* Week navigator */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() - 7); return d })}
          className="rounded-lg border border-steel p-2 text-light-grey transition-colors hover:border-neon-blue hover:text-neon-blue"
          aria-label="Previous week"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-foreground">
          {weekDates[0].toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
          {' – '}
          {weekDates[5].toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() + 7); return d })}
          className="rounded-lg border border-steel p-2 text-light-grey transition-colors hover:border-neon-blue hover:text-neon-blue"
          aria-label="Next week"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {summaries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-steel p-10 text-center text-sm text-light-grey">
          No shifts assigned for this week yet.
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-light-grey">{summaries.length} trainer{summaries.length !== 1 ? 's' : ''} on roster</p>
            <div className="flex items-center gap-1.5 rounded-full border border-steel bg-card px-3 py-1 text-sm font-semibold text-foreground">
              <Clock className="size-4 text-neon-green" />
              {totalHours}h total
            </div>
          </div>

          <div className="space-y-3">
            {summaries.map(({ staff: s, total, days }) => (
              <div key={s.id} className="rounded-2xl border border-steel bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <span className="rounded-full bg-neon-green/15 px-3 py-1 text-sm font-bold text-neon-green">
                    {total}h
                  </span>
                </div>
                {s.phone && <p className="mt-0.5 text-xs text-light-grey">{s.phone}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(days)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, shifts]) => {
                      const d = new Date(date + 'T00:00:00')
                      const dayLabel = d.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' })
                      return (
                        <div key={date} className="rounded-lg border border-steel/60 bg-background px-3 py-1.5 text-xs">
                          <p className="font-medium text-foreground">{dayLabel}</p>
                          {shifts.map((sh, i) => (
                            <p key={i} className="text-light-grey capitalize">{sh.type} · {sh.hours}h</p>
                          ))}
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
