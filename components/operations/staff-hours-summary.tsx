'use client'

import { useMemo, useState, Fragment } from 'react'
import { ChevronDown, Pencil, Check, X } from 'lucide-react'
import { saveShiftAssignment } from '@/app/actions/operations'
import { StaffIcon } from './staff-icon'
import type { Staff, ShiftAssignment, ShiftSetting } from '@/lib/db/schema'

function toIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getMonthRange(monthOffset: number) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const start = toIso(d)
  const end = toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  const label = d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
  const shortLabel = d.toLocaleDateString('en-ZA', { month: 'short' })
  return { start, end, label, shortLabel }
}

// colour for shift type dot/accent
const SHIFT_STYLES: Record<string, { dot: string; label: string }> = {
  morning: { dot: 'bg-amber-400', label: 'AM' },
  afternoon: { dot: 'bg-neon-blue', label: 'PM' },
  saturday: { dot: 'bg-amber-400', label: 'AM' },
}

interface Props {
  staff: Staff[]
  assignments: ShiftAssignment[]
  shiftSettings: ShiftSetting[]
}

export function StaffHoursSummary({ staff, assignments, shiftSettings }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [viewMonth, setViewMonth] = useState<'current' | 'prev'>('current')
  // per-row inline edit state: key = assignmentId
  const [editingHours, setEditingHours] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const currentMonth = getMonthRange(0)
  const prevMonth = getMonthRange(-1)

  function calcHours(staffId: number, start: string, end: string) {
    return assignments
      .filter((a) => a.staffId === staffId && a.shiftDate >= start && a.shiftDate <= end)
      .reduce((sum, a) => sum + (parseFloat(a.hours) || 0), 0)
  }

  function calcDays(staffId: number, start: string, end: string) {
    const dates = new Set(
      assignments
        .filter((a) => a.staffId === staffId && a.shiftDate >= start && a.shiftDate <= end)
        .map((a) => a.shiftDate),
    )
    return dates.size
  }

  function getShiftDetails(staffId: number, start: string, end: string) {
    return assignments
      .filter((a) => a.staffId === staffId && a.shiftDate >= start && a.shiftDate <= end)
      .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate))
  }

  const staffWithHours = useMemo(
    () =>
      staff
        .map((s) => ({
          ...s,
          curH: calcHours(s.id, currentMonth.start, currentMonth.end),
          curD: calcDays(s.id, currentMonth.start, currentMonth.end),
          prevH: calcHours(s.id, prevMonth.start, prevMonth.end),
          prevD: calcDays(s.id, prevMonth.start, prevMonth.end),
        }))
        .sort((a, b) => b.curH - a.curH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [staff, assignments, currentMonth.start, currentMonth.end, prevMonth.start, prevMonth.end],
  )

  async function handleSaveHours(a: ShiftAssignment, newHours: string) {
    setSavingId(a.id)
    const fd = new FormData()
    fd.set('id', String(a.id))
    fd.set('shiftDate', a.shiftDate)
    fd.set('shiftType', a.shiftType)
    fd.set('staffId', String(a.staffId))
    fd.set('hours', newHours)
    await saveShiftAssignment(fd)
    setEditingHours((prev) => { const n = { ...prev }; delete n[a.id]; return n })
    setSavingId(null)
  }

  if (staff.length === 0) {
    return <p className="py-3 text-center text-xs text-light-grey">No staff yet — add staff in Settings.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-steel/50 bg-card/40">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-steel/30 bg-steel/10 px-3 py-1.5">
        <p className="flex-1 text-[10px] font-bold uppercase tracking-widest text-mid-grey">Staff</p>
        <p className="w-24 text-right text-[10px] font-semibold uppercase tracking-wider text-mid-grey">
          {currentMonth.shortLabel}
        </p>
        <p className="w-20 text-right text-[10px] font-semibold uppercase tracking-wider text-mid-grey">
          {prevMonth.shortLabel}
        </p>
        {/* spacer for chevron */}
        <div className="w-4" />
      </div>

      {staffWithHours.map((s) => {
        const isExpanded = expandedId === s.id
        const month = viewMonth === 'current' ? currentMonth : prevMonth
        const detailAssignments = isExpanded ? getShiftDetails(s.id, month.start, month.end) : []

        return (
          <Fragment key={s.id}>
            {/* Single compact row — tap/click to expand */}
            <button
              type="button"
              className="flex w-full items-center gap-2 border-b border-steel/20 px-3 py-2 text-left last:border-0 transition-colors hover:bg-steel/10 active:bg-steel/20"
              onClick={() => {
                if (expandedId === s.id) {
                  setExpandedId(null)
                } else {
                  setExpandedId(s.id)
                  setViewMonth('current')
                }
              }}
            >
              {/* Avatar + name */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-steel/50 text-[10px] font-bold text-foreground">
                  {s.icon ? <StaffIcon icon={s.icon} /> : s.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-xs font-semibold text-foreground">{s.name}</span>
              </div>

              {/* Current month: Xh · Yd on one line */}
              <div className="w-24 shrink-0 text-right">
                {s.curH > 0 ? (
                  <span className="whitespace-nowrap text-xs font-bold tabular-nums text-neon-green">
                    {s.curH}h
                    <span className="ml-1 text-[10px] font-normal text-mid-grey">· {s.curD}d</span>
                  </span>
                ) : (
                  <span className="text-xs text-mid-grey">—</span>
                )}
              </div>

              {/* Prev month */}
              <div className="w-20 shrink-0 text-right">
                {s.prevH > 0 ? (
                  <span className="whitespace-nowrap text-xs tabular-nums text-light-grey/60">
                    {s.prevH}h
                    <span className="ml-1 text-[10px] text-mid-grey">· {s.prevD}d</span>
                  </span>
                ) : (
                  <span className="text-xs text-mid-grey">—</span>
                )}
              </div>

              {/* Chevron */}
              <ChevronDown
                className={`size-3.5 shrink-0 text-mid-grey transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Expandable shift detail */}
            {isExpanded && (
              <div className="border-b border-steel/20 bg-background/40 px-3 pb-2 pt-1 last:border-0">
                {/* Compact month toggle — right-aligned, doesn't expand layout */}
                <div className="mb-1.5 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setViewMonth('current')}
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      viewMonth === 'current' ? 'bg-neon-green/20 text-neon-green' : 'text-mid-grey hover:text-foreground'
                    }`}
                  >
                    {currentMonth.shortLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth('prev')}
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      viewMonth === 'prev' ? 'bg-steel/40 text-foreground' : 'text-mid-grey hover:text-foreground'
                    }`}
                  >
                    {prevMonth.shortLabel}
                  </button>
                </div>

                {detailAssignments.length === 0 ? (
                  <p className="text-[11px] text-mid-grey">No shifts recorded.</p>
                ) : (
                  <div className="divide-y divide-steel/10">
                    {detailAssignments.map((a) => {
                      const shift = shiftSettings.find((ss) => ss.shiftType === a.shiftType)
                      const style = SHIFT_STYLES[a.shiftType] ?? SHIFT_STYLES.morning
                      const date = new Date(a.shiftDate + 'T00:00:00')
                      const hrs = a.hours || shift?.defaultHours || '?'
                      const isEditing = a.id in editingHours
                      const isSaving = savingId === a.id

                      return (
                        <div key={a.id} className="flex items-center gap-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                          {/* Date — fixed narrow column */}
                          <span className="w-20 shrink-0 text-[11px] text-light-grey">
                            {date.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </span>
                          {/* Shift dot + label — fixed narrow column */}
                          <div className="flex w-12 shrink-0 items-center gap-1">
                            <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
                            <span className="text-[10px] text-mid-grey">{shift?.label ?? a.shiftType}</span>
                          </div>
                          {/* Hours + edit — right-aligned, right next to shift label */}
                          {isEditing ? (
                            <div className="ml-auto flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={editingHours[a.id]}
                                onChange={(e) => setEditingHours((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                className="w-12 rounded border border-neon-blue/50 bg-background px-1 py-0.5 text-center text-[11px] text-foreground outline-none"
                                autoFocus
                                aria-label="Edit hours"
                              />
                              <span className="text-[10px] text-mid-grey">h</span>
                              <button
                                type="button"
                                onClick={() => handleSaveHours(a, editingHours[a.id])}
                                disabled={isSaving}
                                className="rounded p-1 text-neon-green disabled:opacity-40"
                                aria-label="Save"
                              >
                                <Check className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingHours((prev) => { const n = { ...prev }; delete n[a.id]; return n })}
                                className="rounded p-1 text-mid-grey hover:text-foreground"
                                aria-label="Cancel"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="ml-auto flex items-center gap-1">
                              <span className="w-8 text-right text-[11px] font-bold tabular-nums text-foreground">{hrs}h</span>
                              <button
                                type="button"
                                onClick={() => setEditingHours((prev) => ({ ...prev, [a.id]: hrs }))}
                                className="rounded p-1 text-mid-grey hover:text-neon-blue"
                                aria-label="Edit hours"
                              >
                                <Pencil className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* Total row */}
                    <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-mid-grey">Total</span>
                      <span className="text-xs font-bold text-neon-green">
                        {detailAssignments.reduce((sum, a) => {
                          const s = shiftSettings.find((ss) => ss.shiftType === a.shiftType)
                          return sum + (parseFloat(a.hours) || parseFloat(s?.defaultHours ?? '0') || 0)
                        }, 0)}h
                        <span className="ml-1 text-[10px] font-normal text-mid-grey">
                          · {new Set(detailAssignments.map((a) => a.shiftDate)).size}d
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
