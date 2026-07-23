'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, UserRound, Pencil, Check, X } from 'lucide-react'
import { saveShiftAssignment, deleteShiftAssignment } from '@/app/actions/operations'
import type { Staff, ShiftAssignment, ShiftSetting } from '@/lib/db/schema'

interface Props {
  staff: Staff[]
  assignments: ShiftAssignment[]
  shiftSettings: ShiftSetting[]
}

function getWeekDates(anchor: Date): Date[] {
  const d = new Date(anchor)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7)) // start of Mon–Sat week
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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function RosterTab({ staff, assignments, shiftSettings }: Props) {
  const [anchor, setAnchor] = useState(() => new Date())
  const weekDates = useMemo(() => getWeekDates(anchor), [anchor])
  const weekStart = toIso(weekDates[0])
  const weekEnd = toIso(weekDates[5])

  const shiftMap = useMemo(() => {
    const m: Record<string, Record<string, ShiftAssignment[]>> = {}
    for (const a of assignments) {
      if (a.shiftDate >= weekStart && a.shiftDate <= weekEnd) {
        if (!m[a.shiftDate]) m[a.shiftDate] = {}
        if (!m[a.shiftDate][a.shiftType]) m[a.shiftDate][a.shiftType] = []
        m[a.shiftDate][a.shiftType].push(a)
      }
    }
    return m
  }, [assignments, weekStart, weekEnd])

  function prevWeek() {
    setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() - 7); return d })
  }
  function nextWeek() {
    setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() + 7); return d })
  }

  const shiftTypes = shiftSettings.filter((s) => s.shiftType !== 'saturday')
  const saturdaySetting = shiftSettings.find((s) => s.shiftType === 'saturday')

  return (
    <div>
      {/* Week navigator */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={prevWeek}
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
          onClick={nextWeek}
          className="rounded-lg border border-steel p-2 text-light-grey transition-colors hover:border-neon-blue hover:text-neon-blue"
          aria-label="Next week"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Mon–Fri shifts (morning + afternoon) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-light-grey">
              <th className="w-24 py-2 pr-3 text-left font-semibold">Shift</th>
              {weekDates.slice(0, 5).map((d, i) => (
                <th key={i} className="px-2 py-2 text-center font-semibold">
                  <span className="block">{DAY_LABELS[i]}</span>
                  <span className="text-[10px] font-normal text-mid-grey">
                    {d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shiftTypes.map((shift) => (
              <tr key={shift.shiftType} className="border-t border-steel/50">
                <td className="py-3 pr-3 align-top">
                  <p className="font-semibold text-foreground">{shift.label || shift.shiftType}</p>
                  <p className="text-xs text-light-grey">{shift.startTime}–{shift.endTime}</p>
                </td>
                {weekDates.slice(0, 5).map((d) => {
                  const dateStr = toIso(d)
                  const cell = shiftMap[dateStr]?.[shift.shiftType] ?? []
                  return (
                    <td key={dateStr} className="px-2 py-3 align-top">
                      <ShiftCell
                        date={dateStr}
                        shiftType={shift.shiftType}
                        defaultHours={shift.defaultHours}
                        assignments={cell}
                        staff={staff}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Saturday row (separate full-width card) */}
      {saturdaySetting && (
        <div className="mt-6 rounded-2xl border border-steel bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <p className="font-semibold text-foreground">{saturdaySetting.label || 'Saturday'}</p>
            <p className="text-xs text-light-grey">{saturdaySetting.startTime}–{saturdaySetting.endTime}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(() => {
              const satDate = toIso(weekDates[5])
              const cell = shiftMap[satDate]?.['saturday'] ?? []
              return (
                <ShiftCell
                  date={satDate}
                  shiftType="saturday"
                  defaultHours={saturdaySetting.defaultHours}
                  assignments={cell}
                  staff={staff}
                  inline
                />
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

function ShiftCell({
  date,
  shiftType,
  defaultHours,
  assignments,
  staff,
  inline = false,
}: {
  date: string
  shiftType: string
  defaultHours: string
  assignments: ShiftAssignment[]
  staff: Staff[]
  inline?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [hours, setHours] = useState(defaultHours)
  const [pending, setPending] = useState(false)

  const assignedIds = new Set(assignments.map((a) => a.staffId))
  const available = staff.filter((s) => !assignedIds.has(s.id))

  async function handleAdd() {
    if (!selectedStaffId) return
    setPending(true)
    const fd = new FormData()
    fd.set('shiftDate', date)
    fd.set('shiftType', shiftType)
    fd.set('staffId', selectedStaffId)
    fd.set('hours', hours)
    await saveShiftAssignment(fd)
    setAdding(false)
    setSelectedStaffId('')
    setHours(defaultHours)
    setPending(false)
  }

  return (
    <div className={inline ? 'flex flex-wrap gap-2' : 'flex flex-col gap-1.5'}>
      {assignments.map((a) => {
        const member = staff.find((s) => s.id === a.staffId)
        return (
          <AssignmentPill key={a.id} assignment={a} name={member?.name ?? 'Unknown'} />
        )
      })}

      {adding ? (
        <div className="rounded-lg border border-steel bg-background p-2">
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="mb-1.5 w-full rounded border border-steel bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-neon-blue"
            aria-label="Select staff member"
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
            placeholder="Hrs"
            className="mb-1.5 w-full rounded border border-steel bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-neon-blue"
            aria-label="Hours"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={pending || !selectedStaffId}
              className="flex-1 rounded bg-neon-green px-2 py-1 text-[10px] font-bold uppercase text-black transition-opacity disabled:opacity-50"
            >
              {pending ? '…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded border border-steel px-2 py-1 text-[10px] text-light-grey hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : available.length > 0 ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-md border border-dashed border-steel px-2 py-1 text-[10px] text-light-grey transition-colors hover:border-neon-green hover:text-neon-green"
        >
          <Plus className="size-3" /> Add
        </button>
      ) : null}
    </div>
  )
}

function AssignmentPill({ assignment, name }: { assignment: ShiftAssignment; name: string }) {
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState(assignment.hours)
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm(`Remove ${name} from this shift?`)) return
    setPending(true)
    const fd = new FormData()
    fd.set('id', String(assignment.id))
    await deleteShiftAssignment(fd)
    setPending(false)
  }

  async function handleSaveHours() {
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
      <div className="flex items-center gap-1 rounded-full border border-neon-blue bg-card px-2.5 py-1 text-xs">
        <UserRound className="size-3 text-neon-blue" />
        <span className="font-medium text-foreground">{name}</span>
        <input
          type="number"
          step="0.5"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-12 rounded border border-steel bg-background px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-neon-blue"
          aria-label="Edit hours"
          autoFocus
        />
        <span className="text-light-grey">h</span>
        <button
          type="button"
          onClick={handleSaveHours}
          disabled={pending}
          className="text-neon-green transition-colors hover:text-neon-green/70 disabled:opacity-50"
          aria-label="Save hours"
        >
          <Check className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setHours(assignment.hours) }}
          className="text-light-grey transition-colors hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-steel bg-card px-2.5 py-1 text-xs">
      <UserRound className="size-3 text-neon-blue" />
      <span className="font-medium text-foreground">{name}</span>
      {assignment.hours && (
        <span className="text-light-grey">· {assignment.hours}h</span>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="ml-0.5 text-light-grey transition-colors hover:text-neon-blue"
        aria-label={`Edit hours for ${name}`}
      >
        <Pencil className="size-3" />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-light-grey transition-colors hover:text-red-400 disabled:opacity-50"
        aria-label={`Remove ${name}`}
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  )
}
