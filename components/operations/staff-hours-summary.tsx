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

function getPayPeriod(offset: number) {
  const now = new Date()
  // Pay period runs from the 21st of previous month to 20th of the named month.
  // If today is on or after the 21st, the active period is next month's (e.g. on 21 Sep -> Oct period: 21 Sep - 20 Oct).
  const baseMonthOffset = now.getDate() >= 21 ? 1 : 0
  const target = new Date(now.getFullYear(), now.getMonth() + baseMonthOffset + offset, 1)

  const start = toIso(new Date(target.getFullYear(), target.getMonth() - 1, 21))
  const end = toIso(new Date(target.getFullYear(), target.getMonth(), 20))
  const label = target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const shortLabel = target.toLocaleDateString('en-US', { month: 'short' })
  const rangeLabel = `${new Date(start).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })} – ${new Date(end).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}`
  return { start, end, label, shortLabel, rangeLabel }
}

// colour for shift type dot/accent
const SHIFT_STYLES: Record<string, { dot: string; label: string }> = {
  morning: { dot: 'bg-amber-500', label: 'AM' },
  afternoon: { dot: 'bg-blue-500', label: 'PM' },
  saturday: { dot: 'bg-amber-500', label: 'AM' },
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

  const currentMonth = getPayPeriod(0)
  const prevMonth = getPayPeriod(-1)

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
    return <p className="py-6 text-center text-xs font-medium text-zinc-400">No staff added yet — add staff in Settings.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/80 px-3.5 py-2">
        <p className="flex-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">Trainer</p>
        <div className="w-28 text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-700">
            {currentMonth.shortLabel} Pay
          </p>
          <p className="text-[9px] font-semibold text-zinc-400">{currentMonth.rangeLabel}</p>
        </div>
        <div className="w-24 text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            {prevMonth.shortLabel} Pay
          </p>
          <p className="text-[9px] font-semibold text-zinc-400">{prevMonth.rangeLabel}</p>
        </div>
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
              className={`flex w-full items-center gap-2 border-b border-zinc-100 px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50/80 ${
                isExpanded ? 'bg-zinc-50/80' : 'bg-white'
              }`}
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
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-700 border border-zinc-200">
                  {s.icon ? <StaffIcon icon={s.icon} /> : s.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-xs font-bold text-zinc-900">{s.name}</span>
              </div>

              {/* Current month: Xh · Yd on one line */}
              <div className="w-28 shrink-0 text-right">
                {s.curH > 0 ? (
                  <span className="whitespace-nowrap text-xs font-black tabular-nums text-emerald-700">
                    {s.curH}h
                    <span className="ml-1 text-[10px] font-medium text-zinc-400">· {s.curD}d</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-zinc-400">—</span>
                )}
              </div>

              {/* Prev month */}
              <div className="w-24 shrink-0 text-right">
                {s.prevH > 0 ? (
                  <span className="whitespace-nowrap text-xs font-bold tabular-nums text-zinc-600">
                    {s.prevH}h
                    <span className="ml-1 text-[10px] font-medium text-zinc-400">· {s.prevD}d</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-zinc-400">—</span>
                )}
              </div>

              {/* Chevron */}
              <ChevronDown
                className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Expandable shift detail */}
            {isExpanded && (
              <div className="border-b border-zinc-200 bg-zinc-50/90 px-4 pb-3 pt-2">
                {/* Month toggle buttons */}
                <div className="mb-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Shift Log: {month.label} ({month.rangeLabel})
                  </p>
                  <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setViewMonth('current')}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        viewMonth === 'current'
                          ? 'bg-emerald-600 text-white'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {currentMonth.shortLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMonth('prev')}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        viewMonth === 'prev'
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {prevMonth.shortLabel}
                    </button>
                  </div>
                </div>

                {detailAssignments.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-1">No shifts recorded in this pay period.</p>
                ) : (
                  <div className="divide-y divide-zinc-200/60 rounded-xl border border-zinc-200 bg-white shadow-xs">
                    {detailAssignments.map((a) => {
                      const shift = shiftSettings.find((ss) => ss.shiftType === a.shiftType)
                      const style = SHIFT_STYLES[a.shiftType] ?? SHIFT_STYLES.morning
                      const date = new Date(a.shiftDate + 'T00:00:00')
                      const hrs = a.hours || shift?.defaultHours || '?'
                      const isEditing = a.id in editingHours
                      const isSaving = savingId === a.id

                      return (
                        <div key={a.id} className="flex items-center gap-2 px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Date */}
                          <span className="w-24 shrink-0 text-xs font-semibold text-zinc-700">
                            {date.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </span>
                          {/* Shift dot + label */}
                          <div className="flex w-16 shrink-0 items-center gap-1.5">
                            <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
                            <span className="text-[11px] font-bold text-zinc-600">{shift?.label ?? a.shiftType}</span>
                          </div>
                          {/* Hours + edit */}
                          {isEditing ? (
                            <div className="ml-auto flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={editingHours[a.id]}
                                onChange={(e) => setEditingHours((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                className="w-14 rounded-md border border-emerald-500 bg-white px-1.5 py-0.5 text-center text-xs font-bold text-zinc-900 outline-none"
                                autoFocus
                                aria-label="Edit hours"
                              />
                              <span className="text-[10px] text-zinc-400 font-bold">h</span>
                              <button
                                type="button"
                                onClick={() => handleSaveHours(a, editingHours[a.id])}
                                disabled={isSaving}
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                                aria-label="Save"
                              >
                                <Check className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingHours((prev) => { const n = { ...prev }; delete n[a.id]; return n })}
                                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                aria-label="Cancel"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="ml-auto flex items-center gap-2">
                              <span className="w-10 text-right text-xs font-black tabular-nums text-zinc-900">{hrs}h</span>
                              <button
                                type="button"
                                onClick={() => setEditingHours((prev) => ({ ...prev, [a.id]: hrs }))}
                                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                                aria-label="Edit hours"
                              >
                                <Pencil className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* Total summary row */}
                    <div className="flex items-center justify-between bg-zinc-50/80 px-3 py-2 rounded-b-xl" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Period Total</span>
                      <span className="text-xs font-black text-emerald-800">
                        {detailAssignments.reduce((sum, a) => {
                          const s = shiftSettings.find((ss) => ss.shiftType === a.shiftType)
                          return sum + (parseFloat(a.hours) || parseFloat(s?.defaultHours ?? '0') || 0)
                        }, 0)}h
                        <span className="ml-1.5 text-[10px] font-medium text-zinc-500">
                          ({new Set(detailAssignments.map((a) => a.shiftDate)).size} days worked)
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
