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
  CheckCircle2,
} from 'lucide-react'
import { deleteShiftAssignment, saveShiftAssignment } from '@/app/actions/operations'
import { StaffIcon } from './staff-icon'
import {
  buildSignupEmailIndex,
  buildSessionPurchaseEmailIndex,
  getTrialConversion,
  sessionPurchaseOccurredAt,
  uniqueQualifyingSessionPurchases,
  ymdInJohannesburg,
  type TrialConversion,
} from '@/lib/trial-conversion'
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
    dot: 'bg-amber-500',
    accent: 'text-amber-800',
    label: 'AM',
  },
  afternoon: {
    dot: 'bg-blue-500',
    accent: 'text-blue-800',
    label: 'PM',
  },
  saturday: {
    dot: 'bg-amber-500',
    accent: 'text-amber-800',
    label: 'AM',
  },
}

const STAFF_TONES = [
  { name: 'text-fuchsia-900', dot: 'bg-fuchsia-500' },
  { name: 'text-cyan-900', dot: 'bg-cyan-600' },
  { name: 'text-emerald-900', dot: 'bg-emerald-600' },
  { name: 'text-violet-900', dot: 'bg-violet-600' },
  { name: 'text-amber-900', dot: 'bg-amber-600' },
  { name: 'text-rose-900', dot: 'bg-rose-600' },
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

  const todayYmd = ymdInJohannesburg()
  const signupIndex = useMemo(() => buildSignupEmailIndex(signups), [signups])
  const sessionPurchaseIndex = useMemo(() => buildSessionPurchaseEmailIndex(sessionPurchases), [sessionPurchases])

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
    <div className="space-y-3">
      {/* ── Weekly Schedule ─────────────────────────────────────── */}
      <div>
        {/* Week navigator */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-2">
          <button
            type="button"
            onClick={() => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() - 7); return d })}
            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-500 hover:text-emerald-600 active:scale-95"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <p className="text-center text-sm font-bold text-zinc-900">{weekLabel}</p>
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-900"
            >
              Today
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() + 7); return d })}
            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-500 hover:text-emerald-600 active:scale-95"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Day cards */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="grid min-w-[560px] grid-cols-6 gap-2">
            {weekDates.map((d, i) => {
              const dateStr = toIso(d)
              const isToday = toIso(d) === toIso(new Date())
              const isSat = i === 5
              const dayShifts = isSat
                ? saturdayShift ? [saturdayShift] : []
                : gridShifts

              // Attribute same-day trials / new members to their shift (client-only)
              const trialsByShift: Record<string, { booking: TrialBooking; conversion: TrialConversion }[]> = {}
              const membersByShift: Record<string, MembershipSignup[]> = {}
              const newSessionMembersByShift: Record<string, SessionPurchase[]> = {}

              if (mounted) {
                for (const b of bookings) {
                  if (b.appointmentDate !== dateStr) continue
                  const st = shiftForTime(b.appointmentTime, dayShifts, isSat)
                  if (st) {
                    const conv = getTrialConversion(b, signupIndex, sessionPurchaseIndex, todayYmd)
                    ;(trialsByShift[st] ??= []).push({ booking: b, conversion: conv })
                  }
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
                  className={`flex h-[540px] flex-col overflow-hidden rounded-xl border shadow-sm transition-colors ${
                    isToday
                      ? 'border-emerald-500/70 bg-emerald-50/15 ring-2 ring-emerald-500/20'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  {/* Day header */}
                  <div className={`px-2 py-2 text-center border-b ${isToday ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-emerald-700' : 'text-zinc-500'}`}>
                      {WEEK_DAYS[i]}
                    </p>
                    <p className={`text-base font-black leading-tight ${isToday ? 'text-emerald-900' : 'text-zinc-900'}`}>
                      {d.getDate()}
                    </p>
                  </div>

                  {/* Fixed AM/PM lanes so PM always sits in the same row */}
                  <div className="grid flex-1 grid-rows-2 gap-2 p-2">
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
  trials: { booking: TrialBooking; conversion: TrialConversion }[]
  newMembers: MembershipSignup[]
  newSessionMembers: SessionPurchase[]
}) {
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [hours, setHours] = useState(shift?.defaultHours ?? '0')
  const [applyWholeWeek, setApplyWholeWeek] = useState(false)
  const [pending, setPending] = useState(false)
  const disabled = !shift

  const hasConversion = trials.some((t) => t.conversion.status === 'converted') || newMembers.length > 0 || newSessionMembers.length > 0

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
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border transition-all ${
        disabled
          ? 'border-zinc-200/50 bg-zinc-50/50'
          : hasConversion
          ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200/60'
          : 'border-zinc-200 bg-zinc-50/70'
      }`}
    >
      <div
        className={`flex items-center justify-between border-b px-2 py-1 ${
          disabled
            ? 'border-zinc-200/50 bg-zinc-100/50'
            : hasConversion
            ? 'border-emerald-200 bg-emerald-100/50'
            : 'border-zinc-200 bg-zinc-100/70'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${style.dot}`} />
          <p className={`text-[10px] font-black uppercase tracking-widest ${disabled ? 'text-zinc-400' : style.accent}`}>
            {style.label}
          </p>
          <span className="text-[9px] font-medium text-zinc-500">{shift ? `${shift.startTime}–${shift.endTime}` : '—'}</span>
        </div>
        <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">{peopleLabel}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-1.5">
        {disabled ? (
          <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-zinc-400 font-medium">No shift</p>
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
              <div className="space-y-1 rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm">
                <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600">
                  <input
                    type="checkbox"
                    checked={applyWholeWeek}
                    onChange={(e) => setApplyWholeWeek(e.target.checked)}
                    className="size-3 accent-emerald-600"
                  />
                  Mon–Fri
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => {
                    const next = e.target.value
                    setSelectedId(next)
                    void handleQuickAdd(next)
                  }}
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
                  autoFocus
                  disabled={pending}
                >
                  <option value="">{applyWholeWeek ? 'Trainer (whole week)…' : 'Select trainer…'}</option>
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
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => { setAdding(false); setSelectedId(''); setHours(shift.defaultHours); setApplyWholeWeek(false) }}
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            ) : staff.length > 0 ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-0.5 flex min-h-[28px] w-full items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white/80 text-zinc-500 transition-colors hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 active:scale-95"
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
      <div className="my-0.5 flex items-center gap-1 rounded-md border border-emerald-300 bg-white p-1 shadow-sm">
        <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
        <span className={`flex min-w-0 flex-1 items-center gap-1 text-[10px] font-bold ${tone.name}`}>
          <StaffIcon icon={icon} className="shrink-0" />
          <span className="leading-tight truncate">{name}</span>
        </span>
        <input
          type="number"
          step="0.5"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-9 rounded border border-zinc-300 bg-zinc-50 px-1 py-0.5 text-center text-[10px] font-bold text-zinc-900 outline-none focus:border-emerald-500"
          autoFocus
          aria-label="Hours"
        />
        <span className="text-[9px] text-zinc-400">h</span>
        <button type="button" onClick={handleSave} disabled={pending} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
          <Check className="size-3.5" />
        </button>
        <button type="button" onClick={() => { setEditing(false); setHours(assignment.hours || defaultHours) }} className="text-zinc-400 hover:text-zinc-700">
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  // Click the chip to open edit mode
  return (
    <div className={`w-full rounded-md border border-zinc-200 bg-white shadow-xs transition-colors hover:border-zinc-300 ${pending ? 'opacity-40' : ''}`}>
      {/* Top row: dot + icon + hours + remove */}
      <div className="flex items-center gap-1 px-1.5 pt-1">
        <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
        <StaffIcon icon={icon} className="shrink-0 text-xs" />
        <span className="ml-auto shrink-0 rounded bg-zinc-100 px-1 py-0.2 text-[9px] font-black tabular-nums text-zinc-700">
          {hours || defaultHours}h
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
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
        className={`block w-full truncate px-1.5 pb-1 pt-0.5 text-left text-[10px] font-bold leading-tight hover:opacity-80 active:scale-[0.98] ${tone.name}`}
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
  trials: { booking: TrialBooking; conversion: TrialConversion }[]
  newMembers: MembershipSignup[]
  newSessionMembers: SessionPurchase[]
}) {
  const [open, setOpen] = useState<null | 'trials' | 'converted' | 'members' | 'sessions'>(null)

  const convertedTrials = trials.filter((t) => t.conversion.status === 'converted')
  const unconvertedTrials = trials.filter((t) => t.conversion.status !== 'converted')

  return (
    <div className="mb-0.5 flex flex-col gap-1">
      {/* Converted trials (Trial -> Member) */}
      {convertedTrials.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === 'converted' ? null : 'converted'))}
          className="flex w-full items-center justify-between rounded-md border border-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 text-left transition-colors hover:bg-emerald-500/20"
        >
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-2.5 shrink-0 text-emerald-700" />
            <span className="text-[9px] font-black uppercase tracking-wide text-emerald-800">
              {convertedTrials.length} New Member{convertedTrials.length > 1 ? 's' : ''}
            </span>
          </span>
          <span className="text-[8px] font-bold text-emerald-700">{open === 'converted' ? 'Hide' : 'Show'}</span>
        </button>
      )}
      {open === 'converted' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-2 py-1">
          {convertedTrials.map((t) => (
            <p key={t.booking.id} className="truncate text-[9px] font-semibold leading-relaxed text-emerald-900">
              {t.booking.appointmentTime} · {t.booking.fullName} (Converted)
            </p>
          ))}
        </div>
      )}

      {/* Unconverted / upcoming trials */}
      {unconvertedTrials.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === 'trials' ? null : 'trials'))}
          className="flex w-full items-center justify-between rounded-md border border-amber-300 bg-amber-400/20 px-1.5 py-0.5 text-left transition-colors hover:bg-amber-400/30"
        >
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-2.5 shrink-0 text-amber-700" />
            <span className="text-[9px] font-black uppercase tracking-wide text-amber-800">
              {unconvertedTrials.length} Trial{unconvertedTrials.length > 1 ? 's' : ''}
            </span>
          </span>
          <span className="text-[8px] font-bold text-amber-700">{open === 'trials' ? 'Hide' : 'Show'}</span>
        </button>
      )}
      {open === 'trials' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
          {unconvertedTrials.map((t) => (
            <p key={t.booking.id} className="truncate text-[9px] font-medium leading-relaxed text-amber-900">
              {t.booking.appointmentTime} · {t.booking.fullName}
            </p>
          ))}
        </div>
      )}

      {/* Direct new members */}
      {newMembers.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === 'members' ? null : 'members'))}
          className="flex w-full items-center justify-between rounded-md border border-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 text-left transition-colors hover:bg-emerald-500/20"
        >
          <span className="inline-flex items-center gap-1">
            <UserPlus2 className="size-2.5 shrink-0 text-emerald-700" />
            <span className="text-[9px] font-black uppercase tracking-wide text-emerald-800">
              {newMembers.length} Signup{newMembers.length > 1 ? 's' : ''}
            </span>
          </span>
          <span className="text-[8px] font-bold text-emerald-700">{open === 'members' ? 'Hide' : 'Show'}</span>
        </button>
      )}
      {open === 'members' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1">
          {newMembers.map((m) => (
            <p key={m.id} className="truncate text-[9px] font-semibold leading-relaxed text-emerald-900">
              {m.firstName} {m.surname}
            </p>
          ))}
        </div>
      )}

      {/* Session members */}
      {newSessionMembers.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === 'sessions' ? null : 'sessions'))}
          className="flex w-full items-center justify-between rounded-md border border-fuchsia-300 bg-fuchsia-400/15 px-1.5 py-0.5 text-left transition-colors hover:bg-fuchsia-400/25"
        >
          <span className="inline-flex items-center gap-1">
            <UserPlus2 className="size-2.5 shrink-0 text-fuchsia-700" />
            <span className="text-[9px] font-black uppercase tracking-wide text-fuchsia-800">
              {newSessionMembers.length} Session{newSessionMembers.length > 1 ? 's' : ''}
            </span>
          </span>
          <span className="text-[8px] font-bold text-fuchsia-700">{open === 'sessions' ? 'Hide' : 'Show'}</span>
        </button>
      )}
      {open === 'sessions' && (
        <div className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2 py-1">
          {newSessionMembers.map((member) => (
            <p key={member.id} className="truncate text-[9px] font-semibold leading-relaxed text-fuchsia-900">
              {member.firstName} {member.surname}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

