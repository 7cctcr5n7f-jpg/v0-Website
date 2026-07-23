'use client'

import { useMemo, useState } from 'react'
import { Flame, Clock, Gift } from 'lucide-react'
import { sessionPurchaseOccurredAt, uniqueQualifyingSessionPurchases } from '@/lib/trial-conversion'
import type { MembershipSignup, SessionPurchase } from '@/lib/db/schema'

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

export function MembersTab({
  signups,
  sessionPurchases,
}: {
  signups: MembershipSignup[]
  sessionPurchases: SessionPurchase[]
}) {
  type MemberEvent =
    | { kind: 'signup'; id: string; createdAt: Date | string; firstName: string; surname: string; title: string; subtitle: string; detail: string; peak: boolean }
    | { kind: 'session'; id: string; createdAt: Date | string; firstName: string; surname: string; title: string; subtitle: string; detail: string; peak: null }
  const [showPast, setShowPast] = useState(false)
  const twoWeeksAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d
  }, [])

  const allSorted = useMemo(() => {
    const signupItems: MemberEvent[] = signups.map((signup) => ({
      kind: 'signup',
      id: `signup-${signup.id}`,
      createdAt: signup.createdAt,
      firstName: signup.firstName,
      surname: signup.surname,
      title: `${signup.contractLength} Month ${signup.accessType}`.trim(),
      subtitle: signup.membershipType,
      detail: signup.monthlyFee > 0 ? `R${signup.monthlyFee.toLocaleString()}/mo` : 'No monthly fee',
      peak: isPeak(signup.membershipType),
    }))
    const sessionItems: MemberEvent[] = uniqueQualifyingSessionPurchases(sessionPurchases)
      .map((purchase) => ({
        kind: 'session',
        id: `session-${purchase.id}`,
        createdAt: sessionPurchaseOccurredAt(purchase),
        firstName: purchase.firstName,
        surname: purchase.surname,
        title: purchase.totalSessions > purchase.packQuantity ? `${purchase.packQuantity} + ${purchase.bonusSessions} free sessions` : `${purchase.packQuantity} session pack`,
        subtitle: purchase.specialTitle || '30+ session purchase',
        detail: purchase.paymentStatus === 'Paid' ? `R${purchase.amount.toLocaleString()} paid` : purchase.paymentStatus,
        peak: null,
      }))
    return [...signupItems, ...sessionItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [sessionPurchases, signups])

  const recent = useMemo(
    () =>
      allSorted.filter((s) => new Date(s.createdAt) >= twoWeeksAgo),
    [allSorted, twoWeeksAgo],
  )

  const visible = showPast ? allSorted : recent
  const pastCount = Math.max(allSorted.length - recent.length, 0)

  const grouped = useMemo(() => {
    const map = new Map<string, MemberEvent[]>()
    for (const s of visible) {
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
  }, [visible])

  if (allSorted.length === 0) {
    return (
      <p className="py-2 text-xs text-light-grey">No member sign-ups yet.</p>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-xl border border-steel/50 bg-card/40 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-mid-grey">
          {showPast ? 'All activity' : 'Last 2 weeks'}
        </p>
        <p className="text-sm font-black text-foreground">
          {visible.length} entr{visible.length === 1 ? 'y' : 'ies'}
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.ymd} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mid-grey">{group.label}</p>
            <p className="text-[10px] text-light-grey">{group.items.length} entr{group.items.length === 1 ? 'y' : 'ies'}</p>
          </div>

          {group.items.map((s) => {
            const peak = s.kind === 'signup' ? s.peak : null
            const initials = `${s.firstName?.[0] ?? ''}${s.surname?.[0] ?? ''}`.toUpperCase() || '?'
            const isSession = s.kind === 'session'

            return (
              <div key={s.id} className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 ${
                isSession
                  ? 'border-fuchsia-400/35 bg-fuchsia-400/5'
                  : peak
                    ? 'border-neon-blue/35 bg-neon-blue/5'
                    : 'border-neon-green/35 bg-neon-green/5'
              }`}>
                <div className={`absolute left-0 top-0 h-full w-1 ${
                  isSession
                    ? 'bg-fuchsia-400/70'
                    : peak
                      ? 'bg-neon-blue/70'
                      : 'bg-neon-green/70'
                }`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5 pl-1">
                    <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                      isSession
                        ? 'border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200'
                        : peak
                          ? 'border-neon-blue/50 bg-neon-blue/20 text-neon-blue'
                          : 'border-neon-green/50 bg-neon-green/20 text-neon-green'
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-black leading-tight text-foreground">{s.firstName} {s.surname}</p>
                      <p className="truncate text-[13px] leading-tight text-foreground">{s.title}</p>
                      <p className="truncate text-[11px] text-light-grey">{s.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                      isSession
                        ? 'bg-fuchsia-400/15 text-fuchsia-200'
                        : peak
                          ? 'bg-neon-blue/15 text-neon-blue'
                          : 'bg-neon-green/15 text-neon-green'
                    }`}>
                      {isSession ? <Gift className="size-2.5" /> : peak ? <Flame className="size-2.5" /> : <Clock className="size-2.5" />}
                      {isSession ? 'Sessions' : peak ? 'Peak' : 'Off-Peak'}
                    </span>
                    <span className="text-[11px] text-light-grey">{s.detail}</span>
                    <span className="text-[10px] text-mid-grey">{timeInJhb(s.createdAt)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {pastCount > 0 && (
        <button
          type="button"
          onClick={() => setShowPast((value) => !value)}
          className="w-full pt-1 text-[10px] font-semibold uppercase tracking-wide text-light-grey hover:text-foreground"
        >
          {showPast ? 'Hide past' : `Show past (${pastCount})`}
        </button>
      )}
    </div>
  )
}
