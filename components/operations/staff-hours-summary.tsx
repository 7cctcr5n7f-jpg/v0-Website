'use client'

import { useMemo, useState, Fragment } from 'react'
import { ChevronDown, Pencil, Check, X, ClipboardCheck } from 'lucide-react'
import { saveShiftAssignment } from '@/app/actions/operations'
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

function getDaysInPeriod(start: string, end: string) {
  const days: string[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)

  while (cursor <= last) {
    days.push(toIso(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

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
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditMonth, setAuditMonth] = useState<'current' | 'prev'>('current')
  // per-row inline edit state: key = assignmentId
  const [editingHours, setEditingHours] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const currentMonth = getPayPeriod(0)
  const prevMonth = getPayPeriod(-1)

  const defaultHoursByShift = useMemo(
    () =>
      Object.fromEntries(
        shiftSettings.map((shift) => [shift.shiftType, parseFloat(shift.defaultHours) || 0]),
      ),
    [shiftSettings],
  )

  function getAssignmentHours(assignment: ShiftAssignment) {
    return parseFloat(assignment.hours) || defaultHoursByShift[assignment.shiftType] || 0
  }

  function calcHours(staffId: number, start: string, end: string) {
    return assignments
      .filter((a) => a.staffId === staffId && a.shiftDate >= start && a.shiftDate <= end)
      .reduce((sum, a) => sum + getAssignmentHours(a), 0)
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
          prevH: calcHours(s.id, prevMonth.start, prevMonth.end),
        }))
        .sort((a, b) => b.curH - a.curH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [staff, assignments, currentMonth.start, currentMonth.end, prevMonth.start, prevMonth.end, defaultHoursByShift],
  )

  const audit = useMemo(() => {
    const period = auditMonth === 'current' ? currentMonth : prevMonth
    const staffById = new Map(staff.map((person) => [person.id, person]))
    const assignmentsByDate = new Map<string, ShiftAssignment[]>()

    for (const assignment of assignments) {
      if (assignment.shiftDate < period.start || assignment.shiftDate > period.end) continue
      if (!staffById.has(assignment.staffId)) continue
      const dailyAssignments = assignmentsByDate.get(assignment.shiftDate) ?? []
      dailyAssignments.push(assignment)
      assignmentsByDate.set(assignment.shiftDate, dailyAssignments)
    }

    const days = getDaysInPeriod(period.start, period.end).map((date) => {
      const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const dailyAssignments = assignmentsByDate.get(date) ?? []
      const morning = dailyAssignments.filter(
        (assignment) => assignment.shiftType === 'morning' || assignment.shiftType === 'saturday',
      )
      const afternoon = dailyAssignments.filter((assignment) => assignment.shiftType === 'afternoon')
      const morningIds = new Set(morning.map((assignment) => assignment.staffId))
      const doubleShiftStaff = afternoon
        .filter((assignment) => morningIds.has(assignment.staffId))
        .map((assignment) => staffById.get(assignment.staffId)?.name ?? 'Unknown trainer')
      const limit = isWeekend ? 1 : 3

      return {
        date,
        isWeekend,
        morning,
        afternoon,
        limit,
        doubleShiftStaff,
        isMorningOverLimit: morning.length > limit,
        isAfternoonOverLimit: afternoon.length > limit,
      }
    })

    const doubleShiftCount = days.reduce((total, day) => total + day.doubleShiftStaff.length, 0)
    const overLimitCount = days.reduce(
      (total, day) => total + Number(day.isMorningOverLimit) + Number(day.isAfternoonOverLimit),
      0,
    )

    return { period, staffById, days, doubleShiftCount, overLimitCount }
  }, [assignments, auditMonth, currentMonth, prevMonth, staff])

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
    <div className="border-y border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5">
        <p className="flex-1 text-[11px] font-semibold text-zinc-500">Trainer</p>
        <div className="w-24 text-right sm:w-28">
          <p className="text-[11px] font-bold text-zinc-800">Current</p>
          <p className="text-[9px] font-medium text-zinc-400">{currentMonth.rangeLabel}</p>
        </div>
        <div className="w-20 text-right sm:w-24">
          <p className="text-[11px] font-semibold text-zinc-500">Previous</p>
          <p className="text-[9px] font-medium text-zinc-400">{prevMonth.rangeLabel}</p>
        </div>
        <div className="w-5" aria-hidden="true" />
      </div>

      {staffWithHours.map((s) => {
        const isExpanded = expandedId === s.id
        const month = viewMonth === 'current' ? currentMonth : prevMonth
        const detailAssignments = isExpanded ? getShiftDetails(s.id, month.start, month.end) : []

        return (
          <Fragment key={s.id}>
            <button
              type="button"
              className={`flex min-h-13 w-full items-center gap-2 border-b border-zinc-100 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50/80 ${
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
              <div className="min-w-0 flex-1">
                <span className="truncate text-sm font-semibold text-zinc-900">{s.name}</span>
              </div>

              <div className="w-24 shrink-0 text-right sm:w-28">
                {s.curH > 0 ? (
                  <span className="whitespace-nowrap text-sm font-bold tabular-nums text-zinc-900">
                    {s.curH}h
                  </span>
                ) : (
                  <span className="text-xs font-medium text-zinc-400">—</span>
                )}
              </div>

              <div className="w-20 shrink-0 text-right sm:w-24">
                {s.prevH > 0 ? (
                  <span className="whitespace-nowrap text-sm font-medium tabular-nums text-zinc-600">
                    {s.prevH}h
                  </span>
                ) : (
                  <span className="text-xs font-medium text-zinc-400">—</span>
                )}
              </div>

              <ChevronDown
                className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {isExpanded && (
              <div className="border-b border-zinc-200 bg-zinc-50/70 px-3 pb-3 pt-2.5">
                <div className="mb-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Shift log · {month.label}
                  </p>
                  <div className="flex items-center gap-1 rounded-lg bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMonth('current')}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        viewMonth === 'current'
                          ? 'bg-blue-600 text-white'
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
                  <div className="divide-y divide-zinc-200/60 border-y border-zinc-200 bg-white">
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
                    <div className="flex items-center justify-between bg-zinc-50/80 px-3 py-2" onClick={(e) => e.stopPropagation()}>
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

      <div className="border-t border-zinc-200 bg-zinc-50/60 px-3 py-3">
        <button
          type="button"
          onClick={() => setAuditOpen((open) => !open)}
          className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
            auditOpen
              ? 'border-blue-200 bg-blue-50 text-blue-900'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50/50'
          }`}
          aria-expanded={auditOpen}
        >
          <span className="flex items-center gap-2 text-xs font-bold">
            <ClipboardCheck className="size-4 text-blue-600" aria-hidden="true" />
            Daily staff audit
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500">
            View AM / PM coverage
            <ChevronDown className={`size-4 transition-transform ${auditOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </span>
        </button>

        {auditOpen ? (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-3">
              <div>
                <p className="text-xs font-black text-zinc-900">Audit period · {audit.period.label}</p>
                <p className="mt-0.5 text-[10px] font-medium text-zinc-500">{audit.period.rangeLabel}</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setAuditMonth('current')}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    auditMonth === 'current' ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {currentMonth.shortLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setAuditMonth('prev')}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    auditMonth === 'prev' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {prevMonth.shortLabel}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
              <span className="rounded-full bg-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-700">
                Weekdays: max 3 / shift
              </span>
              <span className="rounded-full bg-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-700">
                Weekends: max 1 / shift
              </span>
              {audit.doubleShiftCount > 0 ? (
                <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-800">
                  {audit.doubleShiftCount} double-shift issue{audit.doubleShiftCount === 1 ? '' : 's'}
                </span>
              ) : null}
              {audit.overLimitCount > 0 ? (
                <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-800">
                  {audit.overLimitCount} coverage issue{audit.overLimitCount === 1 ? '' : 's'}
                </span>
              ) : null}
              {audit.doubleShiftCount === 0 && audit.overLimitCount === 0 ? (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
                  All coverage checks pass
                </span>
              ) : null}
            </div>

            <div className="max-h-[560px] overflow-y-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[126px_minmax(250px,1fr)_minmax(250px,1fr)] gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  <span>Date</span>
                  <span>Morning</span>
                  <span>Night</span>
                </div>
                {audit.days.map((day) => {
                  const date = new Date(`${day.date}T00:00:00`)
                  const showIssue = day.doubleShiftStaff.length > 0 || day.isMorningOverLimit || day.isAfternoonOverLimit
                  const renderShift = (shiftAssignments: ShiftAssignment[], overLimit: boolean) => (
                    <div className="flex min-h-8 flex-wrap items-center gap-1.5">
                      {shiftAssignments.length === 0 ? (
                        <span className="text-xs text-zinc-400">—</span>
                      ) : (
                        shiftAssignments.map((assignment) => {
                          const trainer = audit.staffById.get(assignment.staffId)
                          return (
                            <span
                              key={assignment.id}
                              className={`rounded-md px-1.5 py-1 text-[11px] font-semibold ${
                                overLimit ? 'bg-rose-100 text-rose-800' : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {trainer?.name ?? 'Unknown'} · {getAssignmentHours(assignment)}h
                            </span>
                          )
                        })
                      )}
                    </div>
                  )

                  return (
                    <div
                      key={day.date}
                      className={`grid grid-cols-[126px_minmax(250px,1fr)_minmax(250px,1fr)] gap-3 border-b border-zinc-100 px-3 py-2.5 last:border-b-0 ${
                        showIssue ? 'bg-rose-50/50' : day.isWeekend ? 'bg-amber-50/40' : 'bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-zinc-800">
                          {date.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </p>
                        <p className={`mt-0.5 text-[10px] font-semibold ${day.isWeekend ? 'text-amber-700' : 'text-zinc-400'}`}>
                          {day.isWeekend ? 'Weekend · max 1' : 'Weekday · max 3'}
                        </p>
                        {day.doubleShiftStaff.length > 0 ? (
                          <p className="mt-1 text-[10px] font-bold leading-snug text-rose-700">
                            Both shifts: {day.doubleShiftStaff.join(', ')}
                          </p>
                        ) : null}
                      </div>
                      {renderShift(day.morning, day.isMorningOverLimit)}
                      {renderShift(day.afternoon, day.isAfternoonOverLimit)}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
