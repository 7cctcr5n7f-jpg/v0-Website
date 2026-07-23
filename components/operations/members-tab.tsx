'use client'

import { useMemo } from 'react'
import { Flame, Clock } from 'lucide-react'
import type { MembershipSignup } from '@/lib/db/schema'

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  New:       { dot: 'bg-neon-blue',  label: 'New'       },
  Processed: { dot: 'bg-amber-400',  label: 'Processed' },
  Active:    { dot: 'bg-neon-green', label: 'Active'    },
  Cancelled: { dot: 'bg-red-500',    label: 'Cancelled' },
}

function isPeak(membershipType: string) {
  const lower = membershipType.toLowerCase()
  // "Anytime Access" or "Peak" = peak; "Off-Peak" = off-peak
  if (lower.includes('off-peak') || lower.includes('off peak')) return false
  return true
}

export function MembersTab({ signups }: { signups: MembershipSignup[] }) {
  const twoWeeksAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d
  }, [])

  const recent = useMemo(
    () =>
      signups
        .filter((s) => new Date(s.createdAt) >= twoWeeksAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [signups, twoWeeksAgo],
  )

  if (recent.length === 0) {
    return (
      <p className="py-2 text-xs text-light-grey">No new members in the past 2 weeks.</p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-mid-grey">
        {recent.length} sign-up{recent.length !== 1 ? 's' : ''} &middot; last 2 weeks
      </p>

      {recent.map((s) => {
        const peak = isPeak(s.membershipType)
        const statusCfg = STATUS_CONFIG[s.status] ?? { dot: 'bg-steel', label: s.status }
        const joinDate = new Date(s.createdAt).toLocaleDateString('en-ZA', {
          day: '2-digit',
          month: 'short',
          timeZone: 'Africa/Johannesburg',
        })

        return (
          <div
            key={s.id}
            className="relative overflow-hidden rounded-2xl border border-steel/60 bg-card px-4 py-3"
          >
            {/* Accent stripe */}
            <div
              className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${
                peak ? 'bg-neon-blue' : 'bg-neon-green'
              }`}
            />

            <div className="flex items-start justify-between gap-2 pl-2">
              {/* Left: name + membership info */}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {s.firstName} {s.surname}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {/* Access type */}
                  <span className="text-xs font-semibold text-foreground">{s.accessType}</span>

                  {/* Peak / Off-Peak badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      peak
                        ? 'bg-neon-blue/15 text-neon-blue'
                        : 'bg-neon-green/15 text-neon-green'
                    }`}
                  >
                    {peak ? <Flame className="size-2.5" /> : <Clock className="size-2.5" />}
                    {peak ? 'Peak' : 'Off-Peak'}
                  </span>
                </div>

                {/* Contract length + monthly fee */}
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-light-grey">
                    {s.contractLength} {s.contractLength === 1 ? 'month' : 'months'}
                  </span>
                  {s.monthlyFee > 0 && (
                    <>
                      <span className="text-[11px] text-steel">&middot;</span>
                      <span className="text-[11px] text-light-grey">
                        R{s.monthlyFee.toLocaleString()}/mo
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right: status + date */}
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${statusCfg.dot}`} />
                  <span className="text-[11px] font-semibold text-foreground">{statusCfg.label}</span>
                </div>
                <span className="text-[10px] text-mid-grey">{joinDate}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
