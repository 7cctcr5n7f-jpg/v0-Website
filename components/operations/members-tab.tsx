'use client'

import { useMemo } from 'react'
import { Flame, Clock } from 'lucide-react'
import type { MembershipSignup } from '@/lib/db/schema'

function isPeak(membershipType: string) {
  const lower = membershipType.toLowerCase()
  // "Anytime Access" or "Peak" = peak; "Off-Peak" = off-peak
  if (lower.includes('off-peak') || lower.includes('off peak')) return false
  return true
}

function ymdInJhb(d: Date | string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(d))
}

function timeInJhb(d: Date | string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(d))
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

  const grouped = useMemo(() => {
    const map = new Map<string, MembershipSignup[]>()
    for (const s of recent) {
      const key = ymdInJhb(s.createdAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return [...map.entries()].map(([ymd, items]) => {
      const label = new Date(`${ymd}T00:00:00`).toLocaleDateString('en-ZA', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      })
      return { ymd, label, items }
    })
  }, [recent])

  if (recent.length === 0) {
    return (
      <p className="py-2 text-xs text-light-grey">No new members in the past 2 weeks.</p>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-xl border border-steel/50 bg-card/40 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-mid-grey">Last 2 weeks</p>
        <p className="text-sm font-black text-foreground">
          {recent.length} sign-up{recent.length > 1 ? 's' : ''}
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.ymd} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mid-grey">{group.label}</p>
            <p className="text-[10px] text-light-grey">{group.items.length} member{group.items.length > 1 ? 's' : ''}</p>
          </div>

          {group.items.map((s) => {
            const peak = isPeak(s.membershipType)
            const packageLabel = `${s.contractLength} Month ${s.accessType}`.trim()
            const initials = `${s.firstName?.[0] ?? ''}${s.surname?.[0] ?? ''}`.toUpperCase() || '?'
            const price = s.monthlyFee > 0 ? `R${s.monthlyFee.toLocaleString()}/mo` : 'No monthly fee'

            return (
              <div key={s.id} className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 ${
                peak ? 'border-neon-blue/35 bg-neon-blue/5' : 'border-neon-green/35 bg-neon-green/5'
              }`}>
                <div className={`absolute left-0 top-0 h-full w-1 ${peak ? 'bg-neon-blue/70' : 'bg-neon-green/70'}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5 pl-1">
                    <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${peak ? 'border-neon-blue/50 bg-neon-blue/20 text-neon-blue' : 'border-neon-green/50 bg-neon-green/20 text-neon-green'}`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-black leading-tight text-foreground">{s.firstName} {s.surname}</p>
                      <p className="truncate text-sm leading-tight text-foreground">{packageLabel}</p>
                      <p className="truncate text-xs text-light-grey">{s.membershipType}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${peak ? 'bg-neon-blue/15 text-neon-blue' : 'bg-neon-green/15 text-neon-green'}`}>
                      {peak ? <Flame className="size-2.5" /> : <Clock className="size-2.5" />}
                      {peak ? 'Peak' : 'Off-Peak'}
                    </span>
                    <span className="text-[11px] text-light-grey">{price}</span>
                    <span className="text-[10px] text-mid-grey">{timeInJhb(s.createdAt)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
