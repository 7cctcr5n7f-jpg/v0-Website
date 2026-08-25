'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  CalendarClock,
  UserPlus2,
} from 'lucide-react'
import { deleteShiftAssignment, saveShiftAssignment } from '@/app/actions/operations'
import { StaffIcon } from './staff-icon'
import { sessionPurchaseOccurredAt, uniqueQualifyingSessionPurchases, ymdInJohannesburg } from '@/lib/trial-conversion'
import type { Staff, ShiftAssignment, ShiftSetting, TrialBooking, MembershipSignup, SessionPurchase } from '@/lib/db/schema'

interface Props {
  actionAuthToken: string
  staff: Staff[]
  assignments: ShiftAssignment[]
  shiftSettings: ShiftSetting[]
  bookings: TrialBooking[]
  signups: MembershipSignup[]
  sessionPurchases: SessionPurchase[]
}

// Time-of-day (HH:mm, JHB) for a signup's createdAt timestamp
function jhbTime(d: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(d))
}

function inWindow(hm: string, shift: ShiftSetting): boolean {
  if (!hm || !shift.startTime || !shift.endTime) return false
  return hm >= shift.startTime && hm < shift.endTime
}

// Which shift a same-day event at time `hm` belongs to. Falls back to the shift
// whose trainer would be on duty when the time lands between configured windows.
function shiftForTime(hm: string, dayShifts: ShiftSetting[], isSat: boolean): string | null {
  const hit = dayShifts.find((sh) => inWindow(hm, sh))
  if (hit) return hit.shiftType
  if (isSat) return dayShifts[0]?.shiftType ?? null
  const wantsAfternoon = hm >= '13:00'
  return (
    dayShifts.find((sh) => sh.shiftType === (wantsAfternoon ? 'afternoon' : 'morning'))?.shiftType ??
    dayShifts[0]?.shiftType ??
    null
  )
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

const SHIFT_STYLES: Record<string, { dot: string; accent: string; label: string }> = {
  morning: {
    dot: 'bg-amber-400',
    accent: 'text-amber-300',
    label: 'AM',
  },
  afternoon: {
    dot: 'bg-neon-blue',
    accent: 'text-neon-blue',
    label: 'PM',
  },
  saturday: {
    dot: 'bg-amber-400',
    accent: 'text-amber-300',
    label: 'AM',
  },
}

const STAFF_TONES = [
  { name: 'text-fuchsia-200', dot: 'bg-fuchsia-300' },
  { name: 'text-cyan-200', dot: 'bg-cyan-300' },
  { name: 'text-emerald-200', dot: 'bg-emerald-300' },
  { name: 'text-violet-200', dot: 'bg-violet-300' },
  { name: 'text-orange-200', dot: 'bg-orange-300' },
  { name: 'text-rose-200', dot: 'bg-rose-300' },
] as const

function toneForStaff(staffId: number, name: string) {
  const seed = Number.isFinite(staffId) && staffId > 0
    ? staffId
    : [...name].reduce((n, ch) => n + ch.charCodeAt(0), 0)
  return STAFF_TONES[Math.abs(seed) % STAFF_TONES.length]
}

function handleOpsActionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.toLowerCase().includes('unauthorized')) {
    window.location.href = '/operations'
    return
  }
  console.error(error)
  window.alert('Could not save shift. Please try again.')
}

export function RosterTab({ actionAuthToken, staff, assignments, shiftSettings, bookings, signups, sessionPurchases }: Props) {
  const [anchor, setAnchor] = useState(() => new Date())
  // Gate date-derived indicators until mounted to avoid SSR/client hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
  const qualifyingSessionPurchases = useMemo(
    () => uniqueQualifyingSessionPurchases(sessionPurchases),
    [sessionPurchases],
  )

  // Non-Saturday shifts for the weekly grid
  const gridShifts = shiftSettings.filter((s) => s.shiftType !== 'saturday')
  const saturdayShift = shiftSettings.find((s) => s.shiftType === 'saturday')

  return (
    <div className="space-y-4">
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

        {/* Day cards */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="grid min-w-[480px] grid-cols-6 gap-1.5">
            {weekDates.map((d, i) => {
              const dateStr = toIso(d)
              const isToday = toIso(d) === toIso(new Date())
              const isSat = i === 5
              const dayShifts = isSat
                ? saturdayShift ? [saturdayShift] : []
                : gridShifts

              // Attribute same-day trials / new members to their shift (client-only)
              const trialsByShift: Record<string, TrialBooking[]> = {}
              const membersByShift: Record<string, MembershipSignup[]> = {}
              const newSessionMembersByShift: Record<string, SessionPurchase[]> = {}
              if (mounted) {
                for (const b of bookings) {
                  if (b.appointmentDate !== dateStr) continue
                  const st = shiftForTime(b.appointmentTime, dayShifts, isSat)
                  if (st) (trialsByShift[st] ??= []).push(b)
                }
                for (const s of signups) {
                  if (ymdInJohannesburg(new Date(s.createdAt)) !== dateStr) continue
                  const st = shiftForTime(jhbTime(s.createdAt), dayShifts, isSat)
                  if (st) (membersByShift[st] ??= []).push(s)
                }
                for (const purchase of qualifyingSessionPurchases) {
                  const occurredAt = sessionPurchaseOccurredAt(purchase)
                  if (ymdInJohannesburg(occurredAt) !== dateStr) continue
                  const st = shiftForTime(jhbTime(occurredAt), dayShifts, isSat)
                  if (st) (newSessionMembersByShift[st] ??= []).push(purchase)
                }
              }
              const amShift = dayShifts.find((s) => s.shiftType === 'morning' || s.shiftType === 'saturday') ?? null
              const pmShift = dayShifts.find((s) => s.shiftType === 'afternoon') ?? null
              const amType = amShift?.shiftType ?? (isSat ? 'saturday' : 'morning')
              const pmType = 'afternoon'
              const amAssignments = shiftMap[dateStr]?.[amType] ?? []
              const pmAssignments = shiftMap[dateStr]?.[pmType] ?? []

              return (
                <div
                  key={dateStr}
                  className={`flex h-[520px] flex-col overflow-hidden rounded-lg border transition-colors ${
                    isToday
                      ? 'border-neon-blue/40 bg-neon-blue/5'
                      : 'border-steel/30 bg-card/30'
                  }`}
                >
                  {/* Day header */}
                  <div className={`px-2 py-1.5 text-center ${isToday ? 'bg-neon-blue/20' : 'bg-steel/10'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-neon-blue' : 'text-mid-grey'}`}>
                      {WEEK_DAYS[i]}
                    </p>
                    <p className={`text-base font-bold leading-tight ${isToday ? 'text-neon-blue' : 'text-foreground'}`}>
                      {d.getDate()}
                    </p>
                  </div>

                  {/* Fixed AM/PM lanes so PM always sits in the same row */}
                  <div className="grid flex-1 grid-rows-2 gap-1.5 p-1.5">
                    <ShiftBlock
                      actionAuthToken={actionAuthToken}
                      date={dateStr}
                      shiftType={amType}
                      shift={amShift}
                      style={SHIFT_STYLES[amType] ?? SHIFT_STYLES.morning}
                      assignments={amAssignments}
                      staff={staff}
                      trials={trialsByShift[amType] ?? []}
                      newMembers={membersByShift[amType] ?? []}
                      newSessionMembers={newSessionMembersByShift[amType] ?? []}
                    />
                    <ShiftBlock
                      actionAuthToken={actionAuthToken}
                      date={dateStr}
                      shiftType={pmType}
                      shift={pmShift}
                      style={SHIFT_STYLES[pmType]}
                      assignments={pmAssignments}
                      staff={staff}
                      trials={trialsByShift[pmType] ?? []}
                      newMembers={membersByShift[pmType] ?? []}
                      newSessionMembers={newSessionMembersByShift[pmType] ?? []}
                    />
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
  actionAuthToken,
  date,
  shiftType,
  shift,
  style,
  assignments,
  staff,
  trials,
  newMembers,
  newSessionMembers,
}: {
  actionAuthToken: string
  date: string
  shiftType: string
  shift: ShiftSetting | null
  style: { dot: string; accent: string; label: string }
  assignments: ShiftAssignment[]
  staff: Staff[]
  trials: TrialBooking[]
  newMembers: MembershipSignup[]
  newSessionMembers: SessionPurchase[]
}) {
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [hours, setHours] = useState(shift?.defaultHours ?? '0')
  const [applyWholeWeek, setApplyWholeWeek] = useState(false)
  const [pending, setPending] = useState(false)
  const disabled = !shift

  const assignedIds = new Set(assignments.map((a) => a.staffId))
  const available = applyWholeWeek ? staff : staff.filter((s) => !assignedIds.has(s.id))
  const staffNameById = new Map(staff.map((s) => [s.id, s.name]))
  const orderedAssignments = [...assignments].sort((a, b) => {
    const an = staffNameById.get(a.staffId) ?? ''
    const bn = staffNameById.get(b.staffId) ?? ''
    return an.localeCompare(bn)
  })

  async function handleQuickAdd(nextStaffId: string) {
    if (!shift) return
    if (!nextStaffId) return
    setPending(true)
    const fd = new FormData()
    fd.set('authToken', actionAuthToken)
    fd.set('shiftDate', date)
    fd.set('shiftType', shift.shiftType)
    fd.set('staffId', nextStaffId)
    fd.set('hours', hours)
    if (applyWholeWeek) fd.set('applyWholeWeek', '1')
    try {
      await saveShiftAssignment(fd)
      setAdding(false)
      setSelectedId('')
      setHours(shift.defaultHours)
      setApplyWholeWeek(false)
    } catch (error) {
      handleOpsActionError(error)
    } finally {
      setPending(false)
    }
  }

  const peopleLabel = `${assignments.length} ${assignments.length === 1 ? 'trainer' : 'trainers'}`

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border ${disabled ? 'border-steel/20 bg-background/20' : 'border-steel/35 bg-background/30'}`}>
      <div className={`flex items-center justify-between border-b px-2 py-1 ${disabled ? 'border-steel/20 bg-steel/5' : 'border-steel/25 bg-background/55'}`}>
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${style.dot}`} />
          <p className={`text-[10px] font-black uppercase tracking-widest ${disabled ? 'text-foreground' : style.accent}`}>{style.label}</p>
          <span className="text-[9px] text-mid-grey">{shift ? `${shift.startTime}–${shift.endTime}` : '—'}</span>
        </div>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-mid-grey">{peopleLabel}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-1.5">
        {disabled ? (
          <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-mid-grey">No shift</p>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
              {orderedAssignments.map((a) => {
                const member = staff.find((s) => s.id === a.staffId)
                return (
                  <AssignmentChip
                    actionAuthToken={actionAuthToken}
                    key={a.id}
                    assignment={a}
                    name={member?.name ?? 'Unknown'}
                    icon={member?.icon ?? ''}
                    tone={toneForStaff(member?.id ?? 0, member?.name ?? 'Unknown')}
                    defaultHours={shift.defaultHours}
                  />
                )
              })}
            </div>

            {(trials.length > 0 || newMembers.length > 0 || newSessionMembers.length > 0) && (
              <ShiftIndicators trials={trials} newMembers={newMembers} newSessionMembers={newSessionMembers} />
            )}

            {/* Add form */}
            {adding ? (
              <div className="space-y-1">
                <label className="flex items-center gap-2 rounded-md border border-steel/40 bg-background/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-light-grey">
                  <input
                    type="checkbox"
                    checked={applyWholeWeek}
                    onChange={(e) => setApplyWholeWeek(e.target.checked)}
                    className="size-3 accent-neon-green"
                  />
                  Apply to whole week (Mon–Fri)
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => {
                    const next = e.target.value
                    setSelectedId(next)
                    void handleQuickAdd(next)
                  }}
                  className="w-full rounded-md border border-steel/60 bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-neon-blue"
                  autoFocus
                  disabled={pending}
                >
                  <option value="">{applyWholeWeek ? 'Select trainer for whole week…' : 'Select trainer…'}</option>
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
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
                <button
                  type="button"
                  onClick={() => { setAdding(false); setSelectedId(''); setHours(shift.defaultHours); setApplyWholeWeek(false) }}
                  className="w-full rounded-md border border-steel/60 px-3 py-1.5 text-xs text-mid-grey hover:text-foreground active:scale-95"
                >
                  Cancel
                </button>
              </div>
            ) : staff.length > 0 ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-0.5 flex min-h-[32px] w-full items-center justify-center rounded-md border border-dashed border-steel/30 text-mid-grey transition-colors hover:border-neon-green/60 hover:text-neon-green active:scale-95"
                aria-label={`Add trainer to ${shiftType}`}
              >
                <Plus className="size-3.5" />
              </button>
            ) : null}

          </>
        )}
      </div>
    </div>
  )
}

// ── Assignment Chip ──────────────────────────────────────────────────────────

function AssignmentChip({
  actionAuthToken,
  assignment,
  name,
  icon,
  tone,
  defaultHours,
}: {
  actionAuthToken: string
  assignment: ShiftAssignment
  name: string
  icon: string
  tone: { name: string; dot: string }
  defaultHours: string
}) {
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState(assignment.hours || defaultHours)
  const [pending, setPending] = useState(false)

  async function handleSave() {
    setPending(true)
    const fd = new FormData()
    fd.set('authToken', actionAuthToken)
    fd.set('id', String(assignment.id))
    fd.set('shiftDate', assignment.shiftDate)
    fd.set('shiftType', assignment.shiftType)
    fd.set('staffId', String(assignment.staffId))
    fd.set('hours', hours)
    try {
      await saveShiftAssignment(fd)
      setEditing(false)
    } catch (error) {
      handleOpsActionError(error)
    } finally {
      setPending(false)
    }
  }

  async function handleRemove() {
    setPending(true)
    const fd = new FormData()
    fd.set('authToken', actionAuthToken)
    fd.set('id', String(assignment.id))
    try {
      await deleteShiftAssignment(fd)
    } catch (error) {
      handleOpsActionError(error)
    } finally {
      setPending(false)
    }
  }

  if (editing) {
    return (
      <div className="my-0.5 flex items-center gap-1 rounded-md border border-steel/65 bg-steel/50 px-1.5 py-1">
        <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
        <span className={`flex min-w-0 flex-1 items-center gap-1 text-[10px] font-medium ${tone.name}`}>
          <StaffIcon icon={icon} className="shrink-0" />
          <span className="leading-tight">{name}</span>
        </span>
        <input
          type="number"
          step="0.5"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-9 rounded bg-steel/85 px-1 py-0.5 text-center text-[10px] text-foreground outline-none"
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

  // Click the chip to open edit mode
  return (
    <div className={`w-full rounded-md border border-steel/65 bg-steel/50 ${pending ? 'opacity-40' : ''}`}>
      {/* Top row: dot + icon + hours + remove */}
      <div className="flex items-center gap-1 px-1.5 pt-1.5">
        <span className={`size-2 shrink-0 rounded-full ${tone.dot}`} />
        <StaffIcon icon={icon} className="shrink-0 text-sm" />
        <span className="ml-auto shrink-0 rounded bg-steel/90 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
          {hours || defaultHours}h
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded bg-steel/80 text-mid-grey transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
          aria-label={`Remove ${name} from shift`}
        >
          <X className="size-3" />
        </button>
      </div>
      {/* Bottom row: full name — tappable to edit */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={pending}
        className={`block w-full truncate px-1.5 pb-1.5 pt-0.5 text-left text-[12px] font-bold leading-tight transition-colors hover:opacity-80 active:scale-[0.98] ${tone.name}`}
        aria-label={`Edit ${name}`}
      >
        {name}
      </button>
    </div>
  )
}

// ── Shift Indicators (trials / new members during a shift) ───────────────────

function ShiftIndicators({
  trials,
  newMembers,
  newSessionMembers,
}: {
  trials: TrialBooking[]
  newMembers: MembershipSignup[]
  newSessionMembers: SessionPurchase[]
}) {
  const [open, setOpen] = useState<null | 'trials' | 'members' | 'sessions'>(null)

  return (
    <div className="mb-0.5 flex flex-col gap-1">
      {trials.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === 'trials' ? null : 'trials'))}
          className="flex w-full items-center justify-between rounded-md border border-amber-300/60 bg-amber-400/25 px-2 py-1 text-left shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25)] transition-colors hover:bg-amber-400/30"
        >
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3 shrink-0 text-amber-200" />
            <span className="text-[10px] font-black uppercase tracking-wide text-amber-100">
              {trials.length} Trial{trials.length > 1 ? 's' : ''}
            </span>
          </span>
          <span className="text-[9px] font-bold text-amber-200/80">{open === 'trials' ? 'Hide' : 'Show'}</span>
        </button>
      )}
      {open === 'trials' && (
        <div className="rounded-md border border-amber-400/35 bg-amber-400/15 px-2 py-1.5">
          {trials.map((t) => (
            <p key={t.id} className="truncate text-[10px] leading-relaxed text-amber-100">
              {t.appointmentTime} · {t.fullName}
            </p>
          ))}
        </div>
      )}

      {newMembers.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === 'members' ? null : 'members'))}
          className="flex w-full items-center justify-between rounded-md border border-neon-green/60 bg-neon-green/20 px-2 py-1 text-left shadow-[inset_0_0_0_1px_rgba(34,197,94,0.25)] transition-colors hover:bg-neon-green/25"
        >
          <span className="inline-flex items-center gap-1.5">
            <UserPlus2 className="size-3 shrink-0 text-neon-green" />
            <span className="text-[10px] font-black uppercase tracking-wide text-neon-green">
              {newMembers.length} New Member{newMembers.length > 1 ? 's' : ''}
            </span>
          </span>
          <span className="text-[9px] font-bold text-neon-green/80">{open === 'members' ? 'Hide' : 'Show'}</span>
        </button>
      )}
      {open === 'members' && (
        <div className="rounded-md border border-neon-green/35 bg-neon-green/10 px-2 py-1.5">
          {newMembers.map((m) => (
            <p key={m.id} className="truncate text-[10px] leading-relaxed text-neon-green">
              {m.firstName} {m.surname}
            </p>
          ))}
        </div>
      )}

      {newSessionMembers.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === 'sessions' ? null : 'sessions'))}
          className="flex w-full items-center justify-between rounded-md border border-fuchsia-300/60 bg-fuchsia-400/15 px-2 py-1 text-left shadow-[inset_0_0_0_1px_rgba(232,121,249,0.2)] transition-colors hover:bg-fuchsia-400/20"
        >
          <span className="inline-flex items-center gap-1.5">
            <UserPlus2 className="size-3 shrink-0 text-fuchsia-200" />
            <span className="text-[10px] font-black uppercase tracking-wide text-fuchsia-100">
              {newSessionMembers.length} New Session member{newSessionMembers.length > 1 ? 's' : ''}
            </span>
          </span>
          <span className="text-[9px] font-bold text-fuchsia-200/80">{open === 'sessions' ? 'Hide' : 'Show'}</span>
        </button>
      )}
      {open === 'sessions' && (
        <div className="rounded-md border border-fuchsia-400/35 bg-fuchsia-400/10 px-2 py-1.5">
          {newSessionMembers.map((member) => (
            <p key={member.id} className="truncate text-[10px] leading-relaxed text-fuchsia-100">
              {member.firstName} {member.surname}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
