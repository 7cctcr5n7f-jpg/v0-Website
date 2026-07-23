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
  Sun,
  Sunset,
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

function getMonthRange(monthOffset: number): { start: string; end: string; label: string } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const start = toIso(d)
  const end = toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  const label = d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
  return { start, end, label }
}

export function RosterTab({ staff, assignments, shiftSettings }: Props) {
  const [anchor, setAnchor] = useState(() => new Date())

  const weekDates = useMemo(() => getWeekDates(anchor), [anchor])
  const weekStart = toIso(weekDates[0])
  const weekEnd = toIso(weekDates[5])

  const weekLabel = `${weekDates[0].toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })} – ${weekDates[5].toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}`

  // Build a map: date → shiftType → assignments[]
  const shiftMap = useMemo(() => {
    const m: Record<string, Record<string, ShiftAssignment[]>> = {}
    for (const a of assignments) {
      if (!m[a.shiftDate]) m[a.shiftDate] = {}
      if (!m[a.shiftDate][a.shiftType]) m[a.shiftDate][a.shiftType] = []
      m[a.shiftDate][a.shiftType].push(a)
    }
    return m
  }, [assignments])

  const morningShift = shiftSettings.find((s) => s.shiftType === 'morning')
  const afternoonShift = shiftSettings.find((s) => s.shiftType === 'afternoon')
  const saturdayShift = shiftSettings.find((s) => s.shiftType === 'saturday')

  // ── Hours summary (current + previous month) ──────────────────────────────
  const currentMonth = getMonthRange(0)
  const prevMonth = getMonthRange(-1)

  function calcHours(staffId: number, start: string, end: string) {
    return assignments
      .filter((a) => a.staffId === staffId && a.shiftDate >= start && a.shiftDate <= end)
      .reduce((sum, a) => sum + (parseFloat(a.hours) || 0), 0)
  }

  function getShiftDetails(staffId: number, start: string, end: string) {
    return assignments
      .filter((a) => a.staffId === staffId && a.shiftDate >= start && a.shiftDate <= end)
      .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate))
  }

  return (
    <div className="space-y-6">
      {/* ── Staff Hours Summary ─────────────────────────────────────────── */}
      <StaffHoursSummary
        staff={staff}
        currentMonth={currentMonth}
        prevMonth={prevMonth}
        calcHours={calcHours}
        getShiftDetails={getShiftDetails}
        shiftSettings={shiftSettings}
      />

      {/* ── Weekly Roster ──────────────────────────────────────────────── */}
      <div>
        {/* Week navigator */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() - 7); return d })}
            className="flex size-8 items-center justify-center rounded-lg border border-steel text-light-grey transition-colors hover:border-neon-blue hover:text-neon-blue"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="flex-1 text-center text-sm font-bold text-foreground">{weekLabel}</p>
          <button
            type="button"
            onClick={() => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() + 7); return d })}
            className="flex size-8 items-center justify-center rounded-lg border border-steel text-light-grey transition-colors hover:border-neon-blue hover:text-neon-blue"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* 7-column roster grid: Shift label + Mon-Sat */}
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            {/* Header row */}
            <div className="mb-1 grid grid-cols-7 gap-1.5">
              <div /> {/* shift label column */}
              {weekDates.map((d, i) => {
                const isToday = toIso(d) === toIso(new Date())
                const isSat = i === 5
                return (
                  <div
                    key={i}
                    className={`rounded-lg px-2 py-2 text-center ${
                      isToday
                        ? 'bg-neon-blue/20 ring-1 ring-neon-blue/50'
                        : isSat
                        ? 'bg-neon-green/10'
                        : 'bg-steel/20'
                    }`}
                  >
                    <p className={`text-xs font-bold ${isToday ? 'text-neon-blue' : isSat ? 'text-neon-green' : 'text-foreground'}`}>
                      {WEEK_DAYS[i]}
                    </p>
                    <p className={`text-[10px] ${isToday ? 'text-neon-blue/70' : 'text-mid-grey'}`}>
                      {d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Morning row */}
            {morningShift && (
              <ShiftRow
                shiftSetting={morningShift}
                weekDates={weekDates}
                shiftMap={shiftMap}
                staff={staff}
                icon={<Sun className="size-3.5 text-amber-400" />}
                rowColor="border-amber-400/20 bg-amber-400/5"
              />
            )}

            {/* Afternoon row */}
            {afternoonShift && (
              <ShiftRow
                shiftSetting={afternoonShift}
                weekDates={weekDates}
                shiftMap={shiftMap}
                staff={staff}
                icon={<Sunset className="size-3.5 text-cobalt" />}
                rowColor="border-cobalt/20 bg-cobalt/5"
              />
            )}

            {/* Saturday row spans the whole grid if saturday shift is separate */}
            {/* Saturday is already column 7 (index 5) in the Mon–Sat grid above */}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shift Row ────────────────────────────────────────────────────────────────

function ShiftRow({
  shiftSetting,
  weekDates,
  shiftMap,
  staff,
  icon,
  rowColor,
}: {
  shiftSetting: ShiftSetting
  weekDates: Date[]
  shiftMap: Record<string, Record<string, ShiftAssignment[]>>
  staff: Staff[]
  icon: React.ReactNode
  rowColor: string
}) {
  return (
    <div className={`mb-1.5 grid grid-cols-7 gap-1.5 rounded-xl border ${rowColor} p-1.5`}>
      {/* Label */}
      <div className="flex flex-col items-start justify-center px-1.5">
        <div className="flex items-center gap-1">
          {icon}
          <span className="text-xs font-bold text-foreground">{shiftSetting.label}</span>
        </div>
        <span className="text-[10px] text-mid-grey">{shiftSetting.startTime}–{shiftSetting.endTime}</span>
      </div>

      {/* One cell per day */}
      {weekDates.map((d) => {
        const dateStr = toIso(d)
        const isSat = d.getDay() === 6
        const shiftType = isSat && shiftSetting.shiftType !== 'saturday' ? null : shiftSetting.shiftType
        // Saturday uses its own shift type only for the saturday column
        const effectiveType = isSat && shiftSetting.shiftType !== 'saturday'
          ? 'saturday_skip'
          : shiftSetting.shiftType
        const cell = effectiveType !== 'saturday_skip'
          ? (shiftMap[dateStr]?.[shiftSetting.shiftType] ?? [])
          : []

        if (effectiveType === 'saturday_skip') {
          // Saturday column: show the saturday shift if the shiftSetting is for morning/afternoon
          // Actually we handle sat inline in the same row — for morning row col 7, show saturday shift
          return (
            <div
              key={dateStr}
              className="min-h-[56px] rounded-lg bg-black/10 px-1.5 py-1.5 opacity-20"
            />
          )
        }

        return (
          <DayCell
            key={dateStr}
            date={dateStr}
            shiftType={shiftSetting.shiftType}
            defaultHours={shiftSetting.defaultHours}
            assignments={cell}
            staff={staff}
            isSat={isSat}
          />
        )
      })}
    </div>
  )
}

// ── Day Cell ─────────────────────────────────────────────────────────────────

function DayCell({
  date,
  shiftType,
  defaultHours,
  assignments,
  staff,
  isSat,
}: {
  date: string
  shiftType: string
  defaultHours: string
  assignments: ShiftAssignment[]
  staff: Staff[]
  isSat: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [hours, setHours] = useState(defaultHours)
  const [pending, setPending] = useState(false)

  const assignedIds = new Set(assignments.map((a) => a.staffId))
  const available = staff.filter((s) => !assignedIds.has(s.id))

  async function handleAdd() {
    if (!selectedId) return
    setPending(true)
    const fd = new FormData()
    fd.set('shiftDate', date)
    fd.set('shiftType', shiftType)
    fd.set('staffId', selectedId)
    fd.set('hours', hours)
    await saveShiftAssignment(fd)
    setAdding(false)
    setSelectedId('')
    setHours(defaultHours)
    setPending(false)
  }

  return (
    <div className={`min-h-[56px] rounded-lg px-1.5 py-1.5 ${isSat ? 'bg-neon-green/5' : 'bg-background/40'}`}>
      <div className="flex flex-col gap-1">
        {assignments.map((a) => {
          const member = staff.find((s) => s.id === a.staffId)
          return <AssignmentChip key={a.id} assignment={a} name={member?.name ?? 'Unknown'} defaultHours={defaultHours} />
        })}

        {adding ? (
          <div className="flex flex-col gap-1">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded border border-steel bg-card px-1.5 py-1 text-[10px] text-foreground outline-none focus:border-neon-blue"
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
              className="w-full rounded border border-steel bg-card px-1.5 py-1 text-[10px] text-foreground outline-none focus:border-neon-blue"
              aria-label="Hours"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleAdd}
                disabled={pending || !selectedId}
                className="flex-1 rounded bg-neon-green py-1 text-[9px] font-bold text-black disabled:opacity-50"
              >
                {pending ? '…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded px-1.5 py-1 text-[9px] text-light-grey hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : available.length > 0 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-0.5 rounded border border-dashed border-steel/50 py-1 text-[9px] text-light-grey/60 transition-colors hover:border-neon-green/60 hover:text-neon-green"
          >
            <Plus className="size-2.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ── Assignment Chip ──────────────────────────────────────────────────────────

function AssignmentChip({ assignment, name, defaultHours }: { assignment: ShiftAssignment; name: string; defaultHours: string }) {
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
      <div className="flex items-center gap-0.5 rounded-md border border-neon-blue/60 bg-card px-1.5 py-1">
        <input
          type="number"
          step="0.5"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-10 bg-transparent text-[10px] text-foreground outline-none"
          autoFocus
          aria-label="Hours"
        />
        <span className="text-[9px] text-mid-grey">h</span>
        <button type="button" onClick={handleSave} disabled={pending} className="ml-0.5 text-neon-green disabled:opacity-50">
          <Check className="size-3" />
        </button>
        <button type="button" onClick={() => { setEditing(false); setHours(assignment.hours || defaultHours) }} className="text-light-grey hover:text-foreground">
          <X className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`group flex items-center justify-between gap-1 rounded-md bg-steel/30 px-1.5 py-1 ${pending ? 'opacity-50' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold text-foreground leading-tight">{name}</p>
        {hours && (
          <p className="text-[9px] text-mid-grey leading-tight">{hours}h</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-0.5 text-light-grey hover:text-neon-blue"
          aria-label={`Edit ${name}`}
        >
          <Pencil className="size-2.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded p-0.5 text-light-grey hover:text-red-400"
          aria-label={`Remove ${name}`}
        >
          <Trash2 className="size-2.5" />
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
  getShiftDetails,
  shiftSettings,
}: {
  staff: Staff[]
  currentMonth: { start: string; end: string; label: string }
  prevMonth: { start: string; end: string; label: string }
  calcHours: (id: number, start: string, end: string) => number
  getShiftDetails: (id: number, start: string, end: string) => ShiftAssignment[]
  shiftSettings: ShiftSetting[]
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandMonth, setExpandMonth] = useState<'current' | 'prev'>('current')

  const staffWithHours = useMemo(
    () =>
      staff
        .map((s) => ({
          ...s,
          currentHours: calcHours(s.id, currentMonth.start, currentMonth.end),
          prevHours: calcHours(s.id, prevMonth.start, prevMonth.end),
        }))
        .sort((a, b) => b.currentHours - a.currentHours),
    [staff, currentMonth, prevMonth, calcHours],
  )

  if (staff.length === 0) return null

  return (
    <div className="rounded-2xl border border-steel/60 bg-card/50">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-steel/40 px-4 py-3">
        <p className="text-xs font-bold text-foreground">Staff</p>
        <p className="w-24 text-center text-[10px] font-semibold uppercase tracking-widest text-mid-grey">
          {currentMonth.label.split(' ')[0]}
        </p>
        <p className="w-24 text-center text-[10px] font-semibold uppercase tracking-widest text-mid-grey">
          {prevMonth.label.split(' ')[0]}
        </p>
      </div>

      {staffWithHours.map((s) => {
        const isExpanded = expandedId === s.id
        const detailAssignments = isExpanded
          ? getShiftDetails(s.id, (expandMonth === 'current' ? currentMonth : prevMonth).start, (expandMonth === 'current' ? currentMonth : prevMonth).end)
          : []

        return (
          <Fragment key={s.id}>
            <div
              className="grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-steel/30 px-4 py-3 last:border-0 transition-colors hover:bg-steel/10"
              onClick={() => {
                if (expandedId === s.id) {
                  setExpandedId(null)
                } else {
                  setExpandedId(s.id)
                  setExpandMonth('current')
                }
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-steel/50 text-[10px] font-bold text-foreground">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-sm font-semibold text-foreground">{s.name}</span>
                <ChevronDown
                  className={`size-3.5 shrink-0 text-mid-grey transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
              {/* Current month hours */}
              <div className="w-24 text-center">
                <span className={`text-sm font-bold tabular-nums ${s.currentHours > 0 ? 'text-neon-green' : 'text-mid-grey'}`}>
                  {s.currentHours > 0 ? `${s.currentHours}h` : '—'}
                </span>
              </div>
              {/* Previous month hours */}
              <div className="w-24 text-center">
                <span className={`text-sm tabular-nums ${s.prevHours > 0 ? 'text-light-grey' : 'text-mid-grey'}`}>
                  {s.prevHours > 0 ? `${s.prevHours}h` : '—'}
                </span>
              </div>
            </div>

            {/* Expandable detail */}
            {isExpanded && (
              <div className="border-b border-steel/30 bg-background/40 px-4 py-3 last:border-0">
                {/* Month toggle */}
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandMonth('current')}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                      expandMonth === 'current'
                        ? 'bg-neon-green text-black'
                        : 'border border-steel text-light-grey hover:text-foreground'
                    }`}
                  >
                    {currentMonth.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandMonth('prev')}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                      expandMonth === 'prev'
                        ? 'bg-neon-green text-black'
                        : 'border border-steel text-light-grey hover:text-foreground'
                    }`}
                  >
                    {prevMonth.label}
                  </button>
                </div>

                {detailAssignments.length === 0 ? (
                  <p className="text-xs text-light-grey">No shifts this month.</p>
                ) : (
                  <div className="space-y-1">
                    {detailAssignments.map((a) => {
                      const shift = shiftSettings.find((ss) => ss.shiftType === a.shiftType)
                      const date = new Date(a.shiftDate + 'T00:00:00')
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 text-light-grey">
                              {date.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </span>
                            <span className="truncate text-mid-grey">{shift?.label ?? a.shiftType}</span>
                          </div>
                          <span className="shrink-0 font-bold text-foreground">{a.hours || shift?.defaultHours || '?'}h</span>
                        </div>
                      )
                    })}
                    <div className="mt-2 flex justify-end border-t border-steel/40 pt-2">
                      <span className="text-xs font-bold text-neon-green">
                        Total: {detailAssignments.reduce((sum, a) => {
                          const shift = shiftSettings.find((ss) => ss.shiftType === a.shiftType)
                          return sum + (parseFloat(a.hours) || parseFloat(shift?.defaultHours ?? '0') || 0)
                        }, 0)}h
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
