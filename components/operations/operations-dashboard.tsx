'use client'

import { useState, useMemo } from 'react'
import {
  Settings,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  Package,
  Users,
  CalendarDays,
  UserPlus,
  X,
  ChevronRight,
} from 'lucide-react'
import { opsLogout } from '@/app/actions/operations'
import { RosterTab } from './roster-tab'
import { TrialsTab } from './trials-tab'
import { MembersTab } from './members-tab'
import { WaterTab } from './water-tab'
import { StockTab } from './stock-tab'
import { StaffHoursSummary } from './staff-hours-summary'
import { SettingsTab } from './settings-tab'
import {
  buildSignupEmailIndex,
  buildSessionPurchaseEmailIndex,
  getTrialConversion,
  ymdInJohannesburg,
  uniqueQualifyingSessionPurchases,
  sessionPurchaseOccurredAt,
} from '@/lib/trial-conversion'
import type {
  Staff,
  ShiftAssignment,
  ShiftSetting,
  WaterCredit,
  WaterAuditLog,
  TrialBooking,
  TrialBookingNote,
  MembershipSignup,
  SessionPurchase,
  StockItem,
  StockConfirmation,
} from '@/lib/db/schema'

interface Props {
  actionAuthToken: string
  staff: Staff[]
  shiftSettings: ShiftSetting[]
  assignments: ShiftAssignment[]
  bookings: TrialBooking[]
  notes: TrialBookingNote[]
  signups: MembershipSignup[]
  sessionPurchases: SessionPurchase[]
  waterCredits: WaterCredit[]
  waterAuditLog: WaterAuditLog[]
  stockItems: StockItem[]
  lastStockConfirmation: StockConfirmation | null
}

function jhbYmd(d: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function jhbFormattedDate(d: Date = new Date()) {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function OperationsDashboard({
  actionAuthToken,
  staff,
  shiftSettings,
  assignments,
  bookings,
  notes,
  signups,
  sessionPurchases,
  waterCredits,
  waterAuditLog,
  stockItems,
  lastStockConfirmation,
}: Props) {
  const [showSettings, setShowSettings] = useState(false)
  const [modalView, setModalView] = useState<'trials' | 'members' | null>(null)

  const todayYmd = ymdInJohannesburg()
  const signupIndex = useMemo(() => buildSignupEmailIndex(signups), [signups])
  const sessionPurchaseIndex = useMemo(() => buildSessionPurchaseEmailIndex(sessionPurchases), [sessionPurchases])

  // ── Attention summary stats ──
  const negativeWaterAccounts = useMemo(
    () => waterCredits.filter((c) => c.balance < 0),
    [waterCredits],
  )

  const upcomingTrials = useMemo(
    () =>
      bookings
        .filter((b) => b.appointmentDate >= todayYmd)
        .sort((a, b) => `${a.appointmentDate} ${a.appointmentTime}`.localeCompare(`${b.appointmentDate} ${b.appointmentTime}`)),
    [bookings, todayYmd],
  )

  const lowStockItems = useMemo(
    () =>
      stockItems.filter((i) => {
        if (i.maxQty <= 0) return i.currentQty <= 0
        return i.currentQty / i.maxQty < 0.2
      }),
    [stockItems],
  )

  const lastConfDate = lastStockConfirmation ? new Date(lastStockConfirmation.confirmedAt) : null
  const stockConfirmedToday = lastConfDate ? jhbYmd(lastConfDate) === todayYmd : false

  // ── Customer flow previews ──
  const previewTrials = upcomingTrials.slice(0, 3)

  const recentSignupsList = useMemo(() => {
    const signupItems = signups.map((s) => ({
      id: `signup-${s.id}`,
      name: `${s.firstName} ${s.surname}`,
      title: `${s.contractLength ? `${s.contractLength} Mo ` : ''}${s.accessType || s.membershipType}`,
      date: new Date(s.createdAt),
      type: 'membership' as const,
    }))
    const sessionItems = uniqueQualifyingSessionPurchases(sessionPurchases).map((p) => ({
      id: `session-${p.id}`,
      name: `${p.firstName} ${p.surname}`,
      title: p.totalSessions > p.packQuantity ? `${p.packQuantity} + ${p.bonusSessions} Sessions` : `${p.packQuantity} Session Pack`,
      date: sessionPurchaseOccurredAt(p),
      type: 'session' as const,
    }))
    return [...signupItems, ...sessionItems]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
  }, [sessionPurchases, signups])

  if (showSettings) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] text-zinc-900 px-4 pb-12 pt-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4">
            <div>
              <h1 className="font-display text-2xl font-black uppercase tracking-tight text-zinc-900">Operations Settings</h1>
              <p className="text-xs text-zinc-500">Manage trainers, icons, and weekly shift schedules</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              Back to Cockpit
            </button>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <SettingsTab staff={staff} shiftSettings={shiftSettings} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-zinc-900 antialiased selection:bg-emerald-500 selection:text-white">
      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-6 sm:py-4">

        {/* ── 1. Top Header ─────────────────────────────────────── */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500 text-white font-black text-sm shadow-sm shadow-emerald-500/20">
              TR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-black tracking-tight text-zinc-900 uppercase">
                  Ten Rounds Operations
                </h1>
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 border border-emerald-200/60">
                  LIVE COCKPIT
                </span>
              </div>
              <p className="text-xs font-medium text-zinc-500" suppressHydrationWarning>
                {jhbFormattedDate()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Settings className="size-3.5 text-zinc-500" />
              <span>Settings</span>
            </button>
            <form action={opsLogout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100/70 hover:text-rose-800"
              >
                <LogOut className="size-3.5" />
                <span>Log out</span>
              </button>
            </form>
          </div>
        </header>

        {/* ── 2. Needs Attention Strip ──────────────────────────── */}
        <section className="mb-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Water alerts */}
            <div
              className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm transition-all ${
                negativeWaterAccounts.length > 0
                  ? 'border-rose-200 bg-rose-50/70 text-rose-950'
                  : 'border-zinc-200/80 bg-white text-zinc-800'
              }`}
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  negativeWaterAccounts.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}
              >
                <Droplets className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Water Accounts</p>
                  {negativeWaterAccounts.length > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                      {negativeWaterAccounts.length}
                    </span>
                  )}
                </div>
                {negativeWaterAccounts.length > 0 ? (
                  <p className="text-xs font-bold text-rose-700 mt-0.5 truncate">
                    {negativeWaterAccounts.length} {negativeWaterAccounts.length === 1 ? 'account is' : 'accounts are'} below zero
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">All accounts in credit</p>
                )}
              </div>
            </div>

            {/* Upcoming Trials */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setModalView('trials')}
              onKeyDown={(e) => { if (e.key === 'Enter') setModalView('trials') }}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50/20"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/20">
                <Clock className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Upcoming Trials</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                    {upcomingTrials.length}
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-900 mt-0.5 truncate">
                  {upcomingTrials.length > 0
                    ? `${upcomingTrials.length} booked ahead`
                    : 'No upcoming trials'}
                </p>
              </div>
            </div>

            {/* Low stock */}
            <div
              className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm transition-all ${
                lowStockItems.length > 0
                  ? 'border-rose-200 bg-rose-50/70 text-rose-950'
                  : 'border-zinc-200/80 bg-white text-zinc-800'
              }`}
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  lowStockItems.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}
              >
                <Package className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Stock Alerts</p>
                  {lowStockItems.length > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                      {lowStockItems.length}
                    </span>
                  )}
                </div>
                {lowStockItems.length > 0 ? (
                  <p className="text-xs font-bold text-rose-700 mt-0.5 truncate">
                    {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'} below 20%
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">Stock levels healthy</p>
                )}
              </div>
            </div>

            {/* Stock take confirmation */}
            <div
              className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm transition-all ${
                stockConfirmedToday
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                  : 'border-amber-200 bg-amber-50/60 text-amber-950'
              }`}
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  stockConfirmedToday ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {stockConfirmedToday ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Daily Stock Take</p>
                {stockConfirmedToday ? (
                  <p className="text-xs font-bold text-emerald-800 mt-0.5 truncate">
                    Confirmed by {lastStockConfirmation?.staffName}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-amber-800 mt-0.5 truncate">
                    Not confirmed yet today
                  </p>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ── 3. Weekly Roster Section ──────────────────────────── */}
        <section className="mb-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CalendarDays className="size-4" />
              </div>
              <h2 className="font-display text-sm font-black uppercase tracking-wider text-zinc-900">
                Weekly Roster & Shifts
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Converted Member</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-400" />
                <span>Trial</span>
              </span>
            </div>
          </div>

          <RosterTab
            actionAuthToken={actionAuthToken}
            staff={staff}
            assignments={assignments}
            shiftSettings={shiftSettings}
            bookings={bookings}
            signups={signups}
            sessionPurchases={sessionPurchases}
          />
        </section>

        {/* ── 4. Customer Flow Section ──────────────────────────── */}
        <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          
          {/* Upcoming Trials Card */}
          <div className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock className="size-4" />
                </div>
                <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-900">
                  Upcoming Trials
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {upcomingTrials.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalView('trials')}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <span>View all trials</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {previewTrials.length === 0 ? (
              <p className="py-6 text-center text-xs font-medium text-zinc-400">No upcoming trials booked.</p>
            ) : (
              <div className="space-y-2 flex-1">
                {previewTrials.map((b) => {
                  const conv = getTrialConversion(b, signupIndex, sessionPurchaseIndex, todayYmd)
                  const isConverted = conv.status === 'converted'
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                        isConverted
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-zinc-100 bg-zinc-50/60 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-zinc-900 truncate">{b.fullName}</p>
                          {isConverted && (
                            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                              Converted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                          <span className="font-semibold text-zinc-700">{b.appointmentDate}</span>
                          <span>·</span>
                          <span className="font-semibold text-zinc-700">{b.appointmentTime}</span>
                          {b.phone && (
                            <>
                              <span>·</span>
                              <span className="truncate">{b.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Sign-ups Card */}
          <div className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <UserPlus className="size-4" />
                </div>
                <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-900">
                  Recent Sign-ups
                </h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Latest 5
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalView('members')}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <span>View all members</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {recentSignupsList.length === 0 ? (
              <p className="py-6 text-center text-xs font-medium text-zinc-400">No recent member sign-ups.</p>
            ) : (
              <div className="space-y-2 flex-1">
                {recentSignupsList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-zinc-900 truncate">{item.name}</p>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                            item.type === 'membership'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-fuchsia-100 text-fuchsia-800'
                          }`}
                        >
                          {item.type === 'membership' ? 'Member' : 'Pack'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 truncate">{item.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-medium text-zinc-400">
                        {item.date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

        {/* ── 5. Daily Operations: Water & Staff Hours ───────────── */}
        <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          
          {/* Water Tracker */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <WaterTab credits={waterCredits} auditLog={waterAuditLog} />
          </div>

          {/* Staff Hours */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Users className="size-4" />
                </div>
                <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-900">
                  Staff Hours & Pay Periods
                </h3>
              </div>
            </div>
            <StaffHoursSummary staff={staff} assignments={assignments} shiftSettings={shiftSettings} />
          </div>

        </section>

        {/* ── 6. Stock Inventory Section ────────────────────────── */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <StockTab items={stockItems} lastConfirmation={lastStockConfirmation} staff={staff} />
        </section>

      </div>

      {/* ── Drilldown Modals ────────────────────────────────────── */}
      {modalView === 'trials' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalView(null) }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 bg-zinc-50/80">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500 text-white font-bold">
                  <Clock className="size-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-black uppercase tracking-tight text-zinc-900">
                    All Trial Bookings & Conversion
                  </h2>
                  <p className="text-xs text-zinc-500">Track trials, monthly rates, reschedule, and export</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalView(null)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            {/* Modal content */}
            <div className="flex-1 overflow-y-auto p-5">
              <TrialsTab
                bookings={bookings}
                notes={notes}
                signups={signups}
                sessionPurchases={sessionPurchases}
              />
            </div>
          </div>
        </div>
      )}

      {modalView === 'members' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalView(null) }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 bg-zinc-50/80">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
                  <UserPlus className="size-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-black uppercase tracking-tight text-zinc-900">
                    All Member Sign-ups & Purchases
                  </h2>
                  <p className="text-xs text-zinc-500">Recent gym memberships and session packs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalView(null)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            {/* Modal content */}
            <div className="flex-1 overflow-y-auto p-5">
              <MembersTab
                signups={signups}
                sessionPurchases={sessionPurchases}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

