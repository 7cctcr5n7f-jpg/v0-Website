'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { deleteShiftAssignment, saveShiftAssignment } from '@/app/actions/operations'
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

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

function signupName(signup: MembershipSignup) {
  return normalizedName(`${signup.firstName} ${signup.surname}`)
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

const SHIFT_STYLES: Record<string, { accent: string; label: string }> = {
  morning: {
    accent: 'text-amber-800',
    label: 'AM',
  },
  afternoon: {
    accent: 'text-blue-800',
    label: 'PM',
  },
  saturday: {
    accent: 'text-amber-800',
    label: 'AM',
  },
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
  const convertedSignupIds = useMemo(() => {
    const ids = new Set<number>()
    for (const booking of bookings) {
      const conversion = getTrialConversion(booking, signupIndex, sessionPurchaseIndex, todayYmd)
      if (conversion.status !== 'converted') continue

      if (conversion.signup) {
        ids.add(conversion.signup.id)
      }

      // A manually confirmed conversion may use a different email. In that case,
      // associate the later membership record by the member's full name.
      const trialName = normalizedName(booking.fullName)
      for (const signup of signups) {
        if (
          signupName(signup) === trialName &&
          ymdInJohannesburg(new Date(signup.createdAt)) >= booking.appointmentDate
        ) {
          ids.add(signup.id)
        }
      }
    }
    return ids
  }, [bookings, sessionPurchaseIndex, signups, signupIndex, todayYmd])

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

        <div className="mb-2 flex items-center justify-end gap-3 px-1 text-[10px] font-semibold text-zinc-600" aria-label="Roster legend">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-emerald-500" aria-hidden="true" />
            Converted member
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-amber-400" aria-hidden="true" />
            Trial
          </span>
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

              // Converted trials stay on their trial shift; only direct sign-ups appear here.
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
                  if (convertedSignupIds.has(s.id)) continue
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
                  className={`flex h-[500px] flex-col overflow-hidden rounded-xl border shadow-sm transition-colors ${
                    isToday
                      ? 'border-blue-200 bg-blue-50/30 shadow-none'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  {/* Day header */}
                  <div className={`px-2 py-2 text-center border-b ${isToday ? 'border-blue-200 bg-blue-50' : 'bg-zinc-50 border-zinc-200'}`}>
                    <p className={`flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-blue-700' : 'text-zinc-500'}`}>
                      {WEEK_DAYS[i]}
                      {isToday && (
                        <span className="rounded bg-blue-100 px-1 py-px text-[8px] tracking-wide text-blue-700">Today</span>
                      )}
                    </p>
                    <p className={`text-base font-black leading-tight ${isToday ? 'text-blue-900' : 'text-zinc-900'}`}>
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
  style: { accent: string; label: string }
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

  const hasConvertedTrial = trials.some((t) => t.conversion.status === 'converted')
  const hasUnconvertedTrial = trials.some((t) => t.conversion.status !== 'converted')
  const trialTreatment = hasConvertedTrial ? 'converted' : hasUnconvertedTrial ? 'trial' : null

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
          : trialTreatment === 'converted'
          ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200/60'
          : trialTreatment === 'trial'
          ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-200/60'
          : 'border-zinc-200 bg-zinc-50/70'
      }`}
    >
      <div
        className={`flex items-center justify-between border-b px-2 py-1 ${
          disabled
            ? 'border-zinc-200/50 bg-zinc-100/50'
            : trialTreatment === 'converted'
            ? 'border-emerald-200 bg-emerald-100/50'
            : trialTreatment === 'trial'
            ? 'border-amber-200 bg-amber-100/50'
            : 'border-zinc-200 bg-zinc-100/70'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <p className={`text-[10px] font-black uppercase tracking-widest ${disabled ? 'text-zinc-400' : style.accent}`}>
            {style.label}
          </p>
          <span className="text-[9px] font-medium text-zinc-500">{shift ? `${shift.startTime}–${shift.endTime}` : '—'}</span>
        </div>
        <div className="flex items-center gap-1">
          <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">{peopleLabel}</p>
          {!adding && staff.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600"
              aria-label={`Add trainer to ${shiftType}`}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-1.5">
        {disabled ? (
          <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-zinc-400 font-medium">No shift</p>
        ) : (
          <>
            <div className="max-h-[108px] shrink-0 space-y-1 overflow-y-auto pr-0.5">
              {orderedAssignments.map((a) => {
                const member = staff.find((s) => s.id === a.staffId)
                return (
                  <AssignmentChip
                    actionAuthToken={actionAuthToken}
                    key={a.id}
                    assignment={a}
                    name={member?.name ?? 'Unknown'}
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
  defaultHours,
}: {
  actionAuthToken: string
  assignment: ShiftAssignment
  name: string
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
      <div className="flex min-h-[32px] items-center gap-1.5 border-b border-zinc-100 py-1">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{name}</span>
        <input
          type="number"
          step="0.5"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-10 rounded border border-zinc-300 bg-white px-1 py-0.5 text-center text-xs font-semibold text-zinc-900 outline-none focus:border-emerald-500"
          autoFocus
          aria-label={`Hours for ${name}`}
        />
        <span className="text-[10px] text-zinc-500">h</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 disabled:opacity-50"
          aria-label={`Save hours for ${name}`}
        >
          <Check className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setHours(assignment.hours || defaultHours) }}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-600"
          aria-label={`Cancel editing ${name}`}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div className={`flex min-h-[32px] items-center gap-1.5 border-b border-zinc-100 py-1 last:border-b-0 ${pending ? 'opacity-40' : ''}`}>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
        {name}
      </span>
      <span className="shrink-0 tabular-nums text-xs font-semibold text-zinc-600">{hours || defaultHours}h</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={pending}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded text-zinc-600 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 disabled:opacity-50"
        aria-label={`Edit ${name}'s hours`}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleRemove}
        disabled={pending}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-600 disabled:opacity-50"
        aria-label={`Remove ${name} from shift`}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Shift Indicators (trials / new members during a shift) ───────────────────

type ActivityEvent = {
  id: number
  name: string
  detail: string
}

function ActivityPanel({
  label,
  events,
  tone,
}: {
  label: string
  events: ActivityEvent[]
  tone: 'amber' | 'emerald' | 'purple'
}) {
  const visibleEvents = events.length === 2 ? events : events.slice(0, 1)
  const remainingCount = events.length - visibleEvents.length
  const styles = {
    amber: 'border-amber-300 bg-amber-100 text-amber-950',
    emerald: 'border-emerald-600 bg-emerald-600 text-white shadow-sm',
    purple: 'border-purple-300 bg-purple-100 text-purple-950',
  }[tone]
  const labelColor = tone === 'emerald' ? 'text-emerald-100' : tone === 'purple' ? 'text-purple-700' : 'text-amber-800'
  const detailColor = tone === 'emerald' ? 'text-emerald-100' : tone === 'purple' ? 'text-purple-700' : 'text-amber-800'

  return (
    <div className={`rounded-md border px-2 py-1.5 ${styles}`}>
      <p className={`text-[8px] font-black uppercase tracking-wider ${labelColor}`}>{label}</p>
      <div className="space-y-0.5">
        {visibleEvents.map((event) => (
          <div key={event.id}>
            <p className="truncate text-[11px] font-bold leading-tight">{event.name}</p>
            <p className={`text-[9px] font-medium leading-tight ${detailColor}`}>{event.detail}</p>
          </div>
        ))}
        {remainingCount > 0 && (
          <p className={`text-[9px] font-semibold ${detailColor}`}>+{remainingCount} more</p>
        )}
      </div>
    </div>
  )
}

function ShiftIndicators({
  trials,
  newMembers,
  newSessionMembers,
}: {
  trials: { booking: TrialBooking; conversion: TrialConversion }[]
  newMembers: MembershipSignup[]
  newSessionMembers: SessionPurchase[]
}) {
  const convertedTrials = trials
    .filter((t) => t.conversion.status === 'converted')
    .map((t) => ({
      id: t.booking.id,
      name: t.booking.fullName,
      detail: `Trial · ${t.booking.appointmentTime}`,
    }))
  const unconvertedTrials = trials
    .filter((t) => t.conversion.status !== 'converted')
    .map((t) => ({
      id: t.booking.id,
      name: t.booking.fullName,
      detail: `Trial · ${t.booking.appointmentTime}`,
    }))
  const signupEvents = newMembers.map((member) => ({
    id: member.id,
    name: `${member.firstName} ${member.surname}`,
    detail: `Signup · ${jhbTime(member.createdAt)}`,
  }))
  const sessionEvents = newSessionMembers.map((member) => ({
    id: member.id,
    name: `${member.firstName} ${member.surname}`,
    detail: `Session · ${jhbTime(sessionPurchaseOccurredAt(member))}`,
  }))

  return (
    <div className="mb-0.5 flex flex-col gap-1">
      {convertedTrials.length > 0 && (
        <ActivityPanel label="Converted member" events={convertedTrials} tone="emerald" />
      )}
      {unconvertedTrials.length > 0 && (
        <ActivityPanel label="Trial" events={unconvertedTrials} tone="amber" />
      )}
      {signupEvents.length > 0 && (
        <ActivityPanel label="New signup" events={signupEvents} tone="emerald" />
      )}
      {sessionEvents.length > 0 && (
        <ActivityPanel label="Session member" events={sessionEvents} tone="purple" />
      )}
    </div>
  )
}
