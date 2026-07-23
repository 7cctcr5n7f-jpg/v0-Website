'use client'

import { useMemo } from 'react'
import type { MembershipSignup } from '@/lib/db/schema'

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-neon-blue/15 text-neon-blue',
  Processed: 'bg-amber-400/15 text-amber-400',
  Active: 'bg-neon-green/15 text-neon-green',
  Cancelled: 'bg-red-500/15 text-red-400',
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
    <div className="space-y-1.5">
      <p className="mb-2 text-[10px] uppercase tracking-wide text-light-grey">
        {recent.length} in past 2 weeks
      </p>
      {recent.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-2 rounded-xl border border-steel/60 bg-background px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {s.firstName} {s.surname}
            </p>
            <p className="truncate text-[10px] text-light-grey">{s.accessType}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                STATUS_COLORS[s.status] ?? 'bg-steel text-light-grey'
              }`}
            >
              {s.status}
            </span>
            <span className="text-[10px] text-light-grey">
              {new Date(s.createdAt).toLocaleDateString('en-ZA', {
                day: '2-digit',
                month: 'short',
                timeZone: 'Africa/Johannesburg',
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
