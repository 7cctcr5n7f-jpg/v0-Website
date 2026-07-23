'use client'

import { useState } from 'react'
import { Settings, LogOut } from 'lucide-react'
import { opsLogout } from '@/app/actions/operations'
import { RosterTab } from './roster-tab'
import { TrialsTab } from './trials-tab'
import { MembersTab } from './members-tab'
import { WaterTab } from './water-tab'
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
} from '@/lib/db/schema'

interface Props {
  staff: Staff[]
  shiftSettings: ShiftSetting[]
  assignments: ShiftAssignment[]
  bookings: TrialBooking[]
  notes: TrialBookingNote[]
  signups: MembershipSignup[]
  waterCredits: WaterCredit[]
  waterAuditLog: WaterAuditLog[]
}

export function OperationsDashboard({
  staff,
  shiftSettings,
  assignments,
  bookings,
  notes,
  signups,
  waterCredits,
  waterAuditLog,
}: Props) {
  const [showSettings, setShowSettings] = useState(false)

  if (showSettings) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
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
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      {/* Minimal top bar */}
      <div className="mb-6 flex items-center justify-between">
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

      {/* Main grid: 3-panel row first, Roster full-width below */}
      <div className="space-y-5">
        {/* Top 3-panel row */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Trials */}
          <section className="rounded-2xl border border-steel bg-card p-4">
            <h2 className="mb-4 font-display text-sm font-black uppercase tracking-widest text-neon-green">
              Trials
            </h2>
            <TrialsTab bookings={bookings} notes={notes} />
          </section>

          {/* New Members */}
          <section className="rounded-2xl border border-steel bg-card p-4">
            <h2 className="mb-4 font-display text-sm font-black uppercase tracking-widest text-neon-green">
              New Members
            </h2>
            <MembersTab signups={signups} />
          </section>

          {/* Water Credits */}
          <section className="rounded-2xl border border-steel bg-card p-4">
            <h2 className="mb-4 font-display text-sm font-black uppercase tracking-widest text-neon-green">
              Water Credits
            </h2>
            <WaterTab credits={waterCredits} auditLog={waterAuditLog} />
          </section>
        </div>

        {/* Roster — full width below */}
        <section className="rounded-2xl border border-steel bg-card p-4">
          <h2 className="mb-4 font-display text-sm font-black uppercase tracking-widest text-neon-green">
            Roster
          </h2>
          <RosterTab staff={staff} assignments={assignments} shiftSettings={shiftSettings} />
        </section>
      </div>
    </div>
  )
}
