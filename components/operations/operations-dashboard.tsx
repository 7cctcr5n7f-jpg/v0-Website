'use client'

import { useState } from 'react'
import { CalendarDays, Clock, ClipboardList, Users, Droplets, Settings, LogOut } from 'lucide-react'
import { opsLogout } from '@/app/actions/operations'
import { RosterTab } from './roster-tab'
import { HoursTab } from './hours-tab'
import { TrialsTab } from './trials-tab'
import { MembersTab } from './members-tab'
import { WaterTab } from './water-tab'
import { SettingsTab } from './settings-tab'
import type { Staff, ShiftAssignment, ShiftSetting, WaterCredit, TrialBooking, TrialBookingNote, MembershipSignup } from '@/lib/db/schema'

type TabKey = 'roster' | 'hours' | 'trials' | 'members' | 'water' | 'settings'

interface Props {
  staff: Staff[]
  shiftSettings: ShiftSetting[]
  assignments: ShiftAssignment[]
  bookings: TrialBooking[]
  notes: TrialBookingNote[]
  signups: MembershipSignup[]
  waterCredits: WaterCredit[]
}

export function OperationsDashboard({
  staff,
  shiftSettings,
  assignments,
  bookings,
  notes,
  signups,
  waterCredits,
}: Props) {
  const [tab, setTab] = useState<TabKey>('roster')

  const tabs: { key: TabKey; label: string; icon: typeof CalendarDays }[] = [
    { key: 'roster', label: 'Roster', icon: CalendarDays },
    { key: 'hours', label: 'Hours', icon: Clock },
    { key: 'trials', label: 'Trials', icon: ClipboardList },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'water', label: 'Water', icon: Droplets },
    { key: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-32 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-widest text-neon-green">Ten Rounds Boxing</p>
          <h1 className="font-display text-4xl font-black uppercase tracking-tight">Operations</h1>
          <p className="mt-1 text-sm text-light-grey">Staff roster, hours, trials &amp; member management.</p>
        </div>
        <form action={opsLogout}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md border border-steel px-4 py-2 text-sm font-semibold text-light-grey transition-colors hover:border-red-500 hover:text-red-400"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </form>
      </div>

      {/* Tab navigation */}
      <div className="mt-8 flex gap-0.5 rounded-xl border border-steel bg-card p-1" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={t.label}
              onClick={() => setTab(t.key)}
              className={
                'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors lg:px-3 lg:py-2.5 lg:text-xs ' +
                (active
                  ? 'bg-neon-green text-black'
                  : 'text-light-grey hover:bg-secondary hover:text-foreground')
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden lg:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="mt-10">
        {tab === 'roster' && (
          <section role="tabpanel">
            <SectionHeader icon={CalendarDays} title="Weekly Roster" description="Assign trainers to morning, afternoon and Saturday shifts. Click + Add to slot a trainer in." />
            <div className="mt-6">
              <RosterTab staff={staff} assignments={assignments} shiftSettings={shiftSettings} />
            </div>
          </section>
        )}

        {tab === 'hours' && (
          <section role="tabpanel">
            <SectionHeader icon={Clock} title="Hours Summary" description="Total paid hours per trainer for the selected week, broken down by shift." />
            <div className="mt-6">
              <HoursTab staff={staff} assignments={assignments} shiftSettings={shiftSettings} />
            </div>
          </section>
        )}

        {tab === 'trials' && (
          <section role="tabpanel">
            <SectionHeader icon={ClipboardList} title="Trial Bookings" description="View upcoming and past free-trial bookings. Add trainer notes to any booking." />
            <div className="mt-6">
              <TrialsTab bookings={bookings} notes={notes} />
            </div>
          </section>
        )}

        {tab === 'members' && (
          <section role="tabpanel">
            <SectionHeader icon={Users} title="Members" description="Read-only view of all membership signups. Use the Admin portal to update statuses." />
            <div className="mt-6">
              <MembersTab signups={signups} />
            </div>
          </section>
        )}

        {tab === 'water' && (
          <section role="tabpanel">
            <SectionHeader icon={Droplets} title="Water Credits" description="Track water-bottle credits per member. Use + Credit to add, Use to deduct." />
            <div className="mt-6">
              <WaterTab credits={waterCredits} />
            </div>
          </section>
        )}

        {tab === 'settings' && (
          <section role="tabpanel">
            <SectionHeader icon={Settings} title="Settings" description="Manage trainers and configure shift types, times and default hours." />
            <div className="mt-6">
              <SettingsTab staff={staff} shiftSettings={shiftSettings} />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarDays
  title: string
  description: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-neon-green" />
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-light-grey">{description}</p>
    </div>
  )
}
