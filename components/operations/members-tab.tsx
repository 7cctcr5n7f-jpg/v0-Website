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
      <p className="py-6 text-center text-xs font-medium text-zinc-400">No member sign-ups yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {showPast ? 'All Activity' : 'Last 2 Weeks'}
        </p>
        <p className="text-xs font-bold text-zinc-800">
          {visible.length} sign-up{visible.length === 1 ? '' : 's'}
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.ymd} className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{group.label}</p>
            <p className="text-[10px] font-medium text-zinc-400">{group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}</p>
          </div>

          {group.items.map((s) => {
            const peak = s.kind === 'signup' ? s.peak : null
            const initials = `${s.firstName?.[0] ?? ''}${s.surname?.[0] ?? ''}`.toUpperCase() || '?'
            const isSession = s.kind === 'session'

            return (
              <div
                key={s.id}
                className={`relative overflow-hidden rounded-xl border p-3 shadow-xs transition-colors ${
                  isSession
                    ? 'border-fuchsia-200 bg-fuchsia-50/40'
                    : peak
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'border-emerald-200 bg-emerald-50/40'
                }`}
              >
                <div
                  className={`absolute left-0 top-0 h-full w-1 ${
                    isSession
                      ? 'bg-fuchsia-500'
                      : peak
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <div className="flex items-start justify-between gap-3 pl-1">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                        isSession
                          ? 'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800'
                          : peak
                          ? 'border-blue-200 bg-blue-100 text-blue-800'
                          : 'border-emerald-200 bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-zinc-900">{s.firstName} {s.surname}</p>
                      <p className="truncate text-xs font-semibold text-zinc-700">{s.title}</p>
                      <p className="truncate text-[11px] text-zinc-500">{s.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        isSession
                          ? 'bg-fuchsia-100 text-fuchsia-800'
                          : peak
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isSession ? <Gift className="size-2.5" /> : peak ? <Flame className="size-2.5" /> : <Clock className="size-2.5" />}
                      {isSession ? 'Sessions' : peak ? 'Peak' : 'Off-Peak'}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-600">{s.detail}</span>
                    <span className="text-[10px] font-medium text-zinc-400">{timeInJhb(s.createdAt)}</span>
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
          className="w-full pt-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors text-center"
        >
          {showPast ? 'Hide past activity' : `Show past activity (${pastCount})`}
        </button>
      )}
    </div>
  )
}
