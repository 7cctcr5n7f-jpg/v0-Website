'use client'

import { useState } from 'react'
import { Settings, LogOut } from 'lucide-react'
import { opsLogout } from '@/app/actions/operations'
import { RosterTab } from './roster-tab'
import { TrialsTab } from './trials-tab'
import { MembersTab } from './members-tab'
import { WaterTab } from './water-tab'
import { StockTab } from './stock-tab'
import { StaffHoursSummary } from './staff-hours-summary'
import { SettingsTab } from './settings-tab'
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

type LeftTab = 'trials' | 'members' | 'water'

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
  const [leftTab, setLeftTab] = useState<LeftTab>('trials')

  if (showSettings) {
    return (
      <div className="min-h-screen px-4 pb-6 pt-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-display text-2xl font-black uppercase tracking-tight">Settings</h1>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="rounded-lg border border-steel px-4 py-2 text-sm font-semibold text-light-grey transition-colors hover:border-neon-blue hover:text-foreground"
            >
              Back to Dashboard
            </button>
          </div>
          <SettingsTab staff={staff} shiftSettings={shiftSettings} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden px-3 pb-3 pt-3">
      {/* Top bar */}
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-neon-green">
          Ten Rounds — Operations
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 rounded-lg border border-steel px-3 py-2 text-xs font-semibold text-light-grey transition-colors hover:border-neon-blue hover:text-foreground"
          >
            <Settings className="size-3.5" /> Settings
          </button>
          <form action={opsLogout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-steel px-3 py-2 text-xs font-semibold text-light-grey transition-colors hover:border-red-500 hover:text-red-400"
            >
              <LogOut className="size-3.5" /> Log out
            </button>
          </form>
        </div>
      </div>

      {/* ── Main area: fills remaining height ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* iPad landscape (lg+): left sidebar + roster side by side */}
        <div className="flex h-full gap-3 lg:flex-row flex-col">

          {/* ── Left sidebar: tabbed Trials / Members / Water ── */}
          <div className="flex shrink-0 flex-col lg:w-[360px] lg:h-full">
            {/* Tab bar */}
            <div className="mb-2 flex shrink-0 rounded-xl border border-steel/60 bg-card p-1">
              {(['trials', 'members', 'water'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLeftTab(tab)}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    leftTab === tab
                      ? 'bg-neon-green/20 text-neon-green'
                      : 'text-mid-grey hover:text-foreground'
                  }`}
                >
                  {tab === 'trials' ? 'Trials' : tab === 'members' ? 'Members' : 'Water'}
                </button>
              ))}
            </div>

            {/* Tab content — scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-steel bg-card p-4">
              {leftTab === 'trials' && (
                <TrialsTab bookings={bookings} notes={notes} signups={signups} sessionPurchases={sessionPurchases} />
              )}
              {leftTab === 'members' && (
                <MembersTab signups={signups} sessionPurchases={sessionPurchases} />
              )}
              {leftTab === 'water' && (
                <WaterTab credits={waterCredits} auditLog={waterAuditLog} />
              )}
            </div>
          </div>

          {/* ── Right: Roster + Stock/Hours below ── */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:overflow-y-auto">
            {/* Roster */}
            <section className="shrink-0 rounded-2xl border border-steel bg-card p-4">
              <h2 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-neon-green">
                Roster
              </h2>
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

            {/* Stock + Staff Hours — side by side */}
            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <section className="rounded-2xl border border-steel bg-card p-4">
                <h2 className="mb-4 font-display text-sm font-black uppercase tracking-widest text-neon-green">
                  Stock
                </h2>
                <StockTab items={stockItems} lastConfirmation={lastStockConfirmation} staff={staff} />
              </section>
              <section className="rounded-2xl border border-steel bg-card p-4">
                <h2 className="mb-4 font-display text-sm font-black uppercase tracking-widest text-neon-green">
                  Staff Hours
                </h2>
                <StaffHoursSummary staff={staff} assignments={assignments} shiftSettings={shiftSettings} />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
