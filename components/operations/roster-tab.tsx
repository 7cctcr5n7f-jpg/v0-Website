'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
} from 'lucide-react'
import { saveShiftAssignment, deleteShiftAssignment } from '@/app/actions/operations'
import type { Staff, ShiftAssignment, ShiftSetting } from '@/lib/db/schema'

interface Props {
  staff: Staff[]
  assignments: ShiftAssignment[]
  shiftSettings: ShiftSetting[]
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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
const SHIFT_STYLES: Record<string, { dot: string; bg: string; border: string; label: string }> = {
  morning:   { dot: 'bg-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/30',  label: 'AM' },
  afternoon: { dot: 'bg-neon-blue',  bg: 'bg-neon-blue/10',  border: 'border-neon-blue/30',  label: 'PM' },
  saturday:  { dot: 'bg-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/30', label: 'SAT' },
}

export function RosterTab({ staff, assignments, shiftSettings }: Props) {
  const [anchor, setAnchor] = useState(() => new Date())

  const weekDates = useMemo(() => getWeekDates(anchor), [anchor])
  const weekLabel = `${weekDates[0].toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })} – ${weekDates[5].toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}`

  const shiftMap = useMemo(() => {
    const m: Record<string, Record<string, ShiftAssignment[]>> = {}
    for (const a of assignments) {
      if (!m[a.shiftDate]) m[a.shiftDate] = {}
      if (!m[a.shiftDate][a.shiftType]) m[a.shiftDate][a.shiftType] = []
      m[a.shiftDate][a.shiftType].push(a)
    }
    return m
  }, [assignments])

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

  // Non-Saturday shifts for the weekly grid
  const gridShifts = shiftSettings.filter((s) => s.shiftType !== 'saturday')
  const saturdayShift = shiftSettings.find((s) => s.shiftType === 'saturday')

  return (
    <div className="space-y-4">
      {/* ── Staff Hours Summary ─────────────────────────────────── */}
      <StaffHoursSummary
        staff={staff}
        currentMonth={currentMonth}
        prevMonth={prevMonth}
        calcHours={calcHours}
        calcDays={calcDays}
        getShiftDetails={getShiftDetails}
        shiftSettings={shiftSettings}
      />

      {/* ── Weekly Schedule ─────────────────────────────────────── */}
      <div>
        {/* Week navigator */}
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() - 7); return d })}
            className="flex size-8 items-center justify-center rounded-lg border border-steel/60 text-mid-grey transition-colors hover:border-neon-blue hover:text-neon-blue active:scale-95"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="flex-1 text-center text-sm font-semibold text-foreground">{weekLabel}</p>
          <button
            type="button"
            onClick={() => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() + 7); return d })}
            className="flex size-8 items-center justify-center rounded-lg border border-steel/60 text-mid-grey transition-colors hover:border-neon-blue hover:text-neon-blue active:scale-95"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Day cards — horizontal scroll on small screens */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="grid min-w-[560px] grid-cols-6 gap-1.5">
            {weekDates.map((d, i) => {
              const dateStr = toIso(d)
              const isToday = toIso(d) === toIso(new Date())
              const isSat = i === 5
              const dayShifts = isSat
                ? saturdayShift ? [saturdayShift] : []
                : gridShifts

              return (
                <div
                  key={dateStr}
                  className={`flex flex-col overflow-hidden rounded-lg border transition-colors ${
                    isToday
                      ? 'border-neon-blue/40 bg-neon-blue/5'
                      : isSat
                      ? 'border-neon-green/25 bg-neon-green/5'
                      : 'border-steel/30 bg-card/30'
                  }`}
                >
                  {/* Day header — coloured strip */}
                  <div
                    className={`px-2 py-1.5 text-center ${
                      isToday
                        ? 'bg-neon-blue/20'
                        : isSat
                        ? 'bg-neon-green/15'
                        : 'bg-steel/10'
                    }`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${
                      isToday ? 'text-neon-blue' : isSat ? 'text-neon-green' : 'text-mid-grey'
                    }`}>
                      {WEEK_DAYS[i]}
                    </p>
                    <p className={`text-base font-bold leading-tight ${
                      isToday ? 'text-neon-blue' : isSat ? 'text-neon-green' : 'text-foreground'
                    }`}>
                      {d.getDate()}
                    </p>
                  </div>

                  {/* Shift sections */}
                  <div className="flex flex-1 flex-col divide-y divide-steel/20 p-1.5 gap-1">
                    {dayShifts.map((shift) => {
                      const style = SHIFT_STYLES[shift.shiftType] ?? SHIFT_STYLES.morning
                      const dayAssignments = shiftMap[dateStr]?.[shift.shiftType] ?? []
                      return (
                        <ShiftBlock
                          key={shift.shiftType}
                          date={dateStr}
                          shift={shift}
                          style={style}
                          assignments={dayAssignments}
                          staff={staff}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shift Block (inside a day card) ─────────────────────────────────────────

function ShiftBlock({
  date,
  shift,
  style,
  assignments,
  staff,
}: {
  date: string
  shift: ShiftSetting
  style: { dot: string; bg: string; border: string; label: string }
  assignments: ShiftAssignment[]
  staff: Staff[]
}) {
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [hours, setHours] = useState(shift.defaultHours)
  const [pending, setPending] = useState(false)

  const assignedIds = new Set(assignments.map((a) => a.staffId))
  const available = staff.filter((s) => !assignedIds.has(s.id))

  async function handleAdd() {
    if (!selectedId) return
    setPending(true)
    const fd = new FormData()
    fd.set('shiftDate', date)
    fd.set('shiftType', shift.shiftType)
    fd.set('staffId', selectedId)
    fd.set('hours', hours)
    await saveShiftAssignment(fd)
    setAdding(false)
    setSelectedId('')
    setHours(shift.defaultHours)
    setPending(false)
  }

  return (
    <div className="flex flex-col gap-0.5 pt-1 first:pt-0">
      {/* Shift label row */}
      <div className="flex items-center gap-1 pb-0.5">
        <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="text-[9px] font-bold uppercase tracking-widest text-mid-grey">{style.label}</span>
      </div>

      {/* Assignment chips */}
      {assignments.map((a) => {
        const member = staff.find((s) => s.id === a.staffId)
        return (
          <AssignmentChip
            key={a.id}
            assignment={a}
            name={member?.name ?? 'Unknown'}
            defaultHours={shift.defaultHours}
          />
        )
      })}

      {/* Add form */}
      {adding ? (
        <div className="mt-0.5 space-y-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-md border border-steel/60 bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-neon-blue"
            autoFocus
          >
            <option value="">Staff…</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.5"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Hours"
            className="w-full rounded-md border border-steel/60 bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-neon-blue"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={pending || !selectedId}
              className="flex-1 rounded-md bg-neon-green py-2 text-xs font-bold text-black disabled:opacity-50 active:scale-95"
            >
              {pending ? '…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setSelectedId(''); setHours(shift.defaultHours) }}
              className="rounded-md border border-steel/60 px-3 py-2 text-xs text-mid-grey hover:text-foreground active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>
      ) : available.length > 0 ? (
        /* Large touch-friendly add button */
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-0.5 flex min-h-[36px] w-full items-center justify-center rounded-md border border-dashed border-steel/30 text-mid-grey transition-colors hover:border-neon-green/60 hover:text-neon-green active:scale-95"
          aria-label="Add staff to shift"
        >
          <Plus className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

// ── Assignment Chip ──────────────────────────────────────────────────────────

function AssignmentChip({
  assignment,
  name,
  defaultHours,
}: {
  assignment: ShiftAssignment
  name: string
  defaultHours: string
}) {
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState(assignment.hours || defaultHours)
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm(`Remove ${name}?`)) return
    setPending(true)
    const fd = new FormData()
    fd.set('id', String(assignment.id))
    await deleteShiftAssignment(fd)
    setPending(false)
  }

  async function handleSave() {
    setPending(true)
    const fd = new FormData()
    fd.set('id', String(assignment.id))
    fd.set('shiftDate', assignment.shiftDate)
    fd.set('shiftType', assignment.shiftType)
    fd.set('staffId', String(assignment.staffId))
    fd.set('hours', hours)
    await saveShiftAssignment(fd)
    setEditing(false)
    setPending(false)
  }

  if (editing) {
    return (
      <div className="my-0.5 flex items-center gap-1 rounded-md border border-neon-blue/50 bg-card px-1.5 py-1">
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground">{name}</span>
        <input
          type="number"
          step="0.5"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-9 rounded bg-steel/30 px-1 py-0.5 text-center text-[10px] text-foreground outline-none"
          autoFocus
          aria-label="Hours"
        />
        <span className="text-[9px] text-mid-grey">h</span>
        <button type="button" onClick={handleSave} disabled={pending} className="text-neon-green disabled:opacity-50">
          <Check className="size-3" />
        </button>
        <button type="button" onClick={() => { setEditing(false); setHours(assignment.hours || defaultHours) }} className="text-mid-grey hover:text-foreground">
          <X className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <div className={`group flex min-h-[36px] items-center gap-1 rounded-md bg-background/50 px-2 py-1 ${pending ? 'opacity-40' : ''}`}>
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground leading-tight">{name}</span>
      <span className="shrink-0 rounded bg-steel/30 px-1 py-0.5 text-[10px] font-bold tabular-nums text-foreground">{hours || defaultHours}h</span>
      {/* Always visible on mobile; subtle on desktop until hover */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex size-7 items-center justify-center rounded text-mid-grey transition-colors hover:bg-steel/30 hover:text-neon-blue active:scale-90"
          aria-label={`Edit ${name} hours`}
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="flex size-7 items-center justify-center rounded text-mid-grey transition-colors hover:bg-red-500/10 hover:text-red-400 active:scale-90 disabled:opacity-50"
          aria-label={`Remove ${name}`}
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}

// ── Staff Hours Summary ──────────────────────────────────────────────────────

function StaffHoursSummary({
  staff,
  currentMonth,
  prevMonth,
  calcHours,
  calcDays,
  getShiftDetails,
  shiftSettings,
}: {
  staff: Staff[]
  currentMonth: ReturnType<typeof getMonthRange>
  prevMonth: ReturnType<typeof getMonthRange>
  calcHours: (id: number, start: string, end: string) => number
  calcDays: (id: number, start: string, end: string) => number
  getShiftDetails: (id: number, start: string, end: string) => ShiftAssignment[]
  shiftSettings: ShiftSetting[]
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandMonth, setExpandMonth] = useState<'current' | 'prev'>('current')
  // per-row inline edit state: key = assignmentId
  const [editingHours, setEditingHours] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

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
    [staff, currentMonth, prevMonth, calcHours, calcDays],
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

  if (staff.length === 0) return null

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
        const month = expandMonth === 'current' ? currentMonth : prevMonth
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
                  setExpandMonth('current')
                }
              }}
            >
              {/* Avatar + name */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-steel/50 text-[10px] font-bold text-foreground">
                  {s.name.charAt(0).toUpperCase()}
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
              <div className="border-b border-steel/20 bg-background/40 px-3 pb-2 pt-1.5 last:border-0">
                {/* Month pills inline */}
                <div className="mb-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpandMonth('current') }}
                    className={`rounded-full px-3 py-0.5 text-[11px] font-semibold transition-colors ${
                      expandMonth === 'current'
                        ? 'bg-neon-green/20 text-neon-green'
                        : 'text-mid-grey hover:text-foreground'
                    }`}
                  >
                    {currentMonth.label}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpandMonth('prev') }}
                    className={`rounded-full px-3 py-0.5 text-[11px] font-semibold transition-colors ${
                      expandMonth === 'prev'
                        ? 'bg-steel/50 text-foreground'
                        : 'text-mid-grey hover:text-foreground'
                    }`}
                  >
                    {prevMonth.label}
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
                        <div key={a.id} className="flex items-center gap-2 py-1">
                          {/* Date */}
                          <span className="w-24 shrink-0 text-[11px] text-light-grey">
                            {date.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </span>
                          {/* Shift type dot + label */}
                          <div className="flex min-w-0 flex-1 items-center gap-1">
                            <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
                            <span className="text-[11px] text-mid-grey">{shift?.label ?? a.shiftType}</span>
                          </div>
                          {/* Hours — inline edit */}
                          {isEditing ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={editingHours[a.id]}
                                onChange={(e) =>
                                  setEditingHours((prev) => ({ ...prev, [a.id]: e.target.value }))
                                }
                                className="w-12 rounded border border-neon-blue/50 bg-background px-1.5 py-0.5 text-center text-[11px] text-foreground outline-none"
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
                                onClick={() =>
                                  setEditingHours((prev) => { const n = { ...prev }; delete n[a.id]; return n })
                                }
                                className="rounded p-1 text-mid-grey hover:text-foreground"
                                aria-label="Cancel"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <span className="min-w-[2rem] text-right text-[11px] font-bold text-foreground">{hrs}h</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingHours((prev) => ({ ...prev, [a.id]: hrs }))
                                }
                                className="rounded p-1 text-mid-grey opacity-0 transition-opacity hover:text-neon-blue group-hover:opacity-100 sm:opacity-100"
                                aria-label="Edit hours"
                              >
                                <Pencil className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* Total */}
                    <div className="flex items-center justify-between pt-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-mid-grey">Total</span>
                      <span className="text-xs font-bold text-neon-green">
                        {detailAssignments.reduce((sum, a) => {
                          const shift = shiftSettings.find((ss) => ss.shiftType === a.shiftType)
                          return sum + (parseFloat(a.hours) || parseFloat(shift?.defaultHours ?? '0') || 0)
                        }, 0)}h
                        &nbsp;
                        <span className="text-[10px] font-normal text-mid-grey">
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
