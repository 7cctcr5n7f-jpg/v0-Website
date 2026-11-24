'use client'

import { useState } from 'react'
import { RefreshCw, Globe2, MousePointer2, CalendarCheck, Dumbbell, UserRoundCheck, AlertTriangle, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

type Funnel = {
  dateRange: { startDate: string; endDate: string }
  refreshedAt: string
  website: { visitors: number; pageviews: number }
  trialPage: { visitors: number; pageviews: number }
  bookings: number
  trialsReached: number
  members: number
  rates: {
    websiteToTrialPage: number
    trialPageToBooking: number
    bookingToTrialReached: number
    trialReachedToMember: number
    websiteToMember: number
  }
  notes: { trialReached: string }
}
type MonthResult = Funnel & { label: string }
type Props = { bookings: number; trialsReached: number; members: number }

function fmt(value: number) { return new Intl.NumberFormat('en-ZA').format(value) }
function dateInJohannesburg(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
function monthWindow(offset: number, today: Date) {
  const local = dateInJohannesburg(today)
  const [, , day] = local.split('-')
  const first = new Date(Date.UTC(Number(local.slice(0, 4)), Number(local.slice(5, 7)) - 1 - offset, 1))
  const year = first.getUTCFullYear()
  const month = String(first.getUTCMonth() + 1).padStart(2, '0')
  const lastDay = new Date(Date.UTC(year, first.getUTCMonth() + 1, 0)).getUTCDate()
  const endDay = Math.min(Number(day), lastDay)
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(endDay).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('en-ZA', { month: 'short', timeZone: 'UTC' }).format(first),
  }
}
function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? { label: 'No change', tone: 'flat' as const, icon: Minus } : { label: 'New', tone: 'up' as const, icon: ArrowUpRight }
  const delta = ((current - previous) / previous) * 100
  return { label: `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`, tone: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'flat' as const, icon: delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus }
}

export function FullGrowthFunnel({ bookings, trialsReached, members }: Props) {
  const [history, setHistory] = useState<MonthResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const windows = [2, 1, 0].map(offset => monthWindow(offset, new Date()))
      const results = await Promise.all(windows.map(async window => {
        const response = await fetch('/api/operations/growth-funnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: window.startDate, endDate: window.endDate }),
        })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || `Could not load ${window.label}.`)
        return { ...(body as Funnel), label: window.label }
      }))
      setHistory(results)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh the funnel history.')
    } finally {
      setLoading(false)
    }
  }

  const latest = history[history.length - 1]
  const previous = history[history.length - 2]
  const metrics = [
    { label: 'Website visitors', key: 'websiteVisitors', icon: Globe2, values: history.map(row => row.website.visitors), current: latest?.website.visitors, note: 'Unique site visitors' },
    { label: 'Free-trial page visitors', key: 'trialVisitors', icon: MousePointer2, values: history.map(row => row.trialPage.visitors), current: latest?.trialPage.visitors, note: 'Unique visitors to /free-trial' },
    { label: 'Booked a free trial', key: 'bookings', icon: CalendarCheck, values: history.map(row => row.bookings), current: latest?.bookings, note: 'Confirmed booking records' },
    { label: 'Trial date reached', key: 'trialsReached', icon: Dumbbell, values: history.map(row => row.trialsReached), current: latest?.trialsReached, note: 'Scheduled appointment date passed' },
    { label: 'Became a member', key: 'members', icon: UserRoundCheck, values: history.map(row => row.members), current: latest?.members, note: 'Email-matched membership signups' },
  ]
  const currentRate = latest?.rates.websiteToMember
  const period = latest ? `${latest.dateRange.startDate} to ${latest.dateRange.endDate}` : 'Refresh to load three-month history'

  return (
    <article className="flex min-w-0 min-h-[290px] flex-col rounded-[24px] border border-[#CFE5EF] bg-[linear-gradient(155deg,#F8FCFE,#EAF7FB)] p-4 shadow-[0_8px_28px_rgba(16,42,67,.055)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#008FC4]">02 / The customer journey</p>
          <h2 className="mt-1 text-lg font-black tracking-tight">From visitor to member</h2>
          <p className="text-[10px] text-slate-500">Five funnel stages · three-month history · month-on-month movement</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#102A43] px-3 py-2 text-[10px] font-extrabold text-white shadow-sm hover:bg-[#17496B] disabled:opacity-60">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''}/>{loading ? 'Loading' : 'Refresh'}
        </button>
      </div>

      {error ? <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-[#FFF9EA] p-2.5 text-[10px] leading-4 text-amber-900"><AlertTriangle size={12} className="mr-1 inline"/> {error}</div> : null}

      {!history.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#BBD7E4] bg-white/70 p-5 text-center">
          <p className="text-xs font-bold text-[#17344C]">Load your visitor-to-member history</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">One manual refresh retrieves the same day-of-month window for each of the last three months, so the comparison is fair.</p>
        </div>
      ) : (
        <>
          <div className="mt-3 space-y-1.5">
            {metrics.map((metric, index) => {
              const Icon = metric.icon
              const movement = change(metric.values[2] || 0, metric.values[1] || 0)
              const MovementIcon = movement.icon
              return (
                <div key={metric.key} className="rounded-xl border border-white/90 bg-white/90 px-3 py-2 shadow-[0_3px_10px_rgba(16,42,67,.035)]">
                  <div className="flex items-center gap-2">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${index === 4 ? 'bg-[#E5F8F2] text-emerald-600' : 'bg-[#EAF7FC] text-[#008FC4]'}`}><Icon size={14}/></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-extrabold text-[#17344C]">{metric.label}</p>
                        <div className="flex shrink-0 items-center gap-2">
                          <p className="text-lg font-black leading-none tabular-nums text-[#102A43]">{fmt(metric.current ?? 0)}</p>
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-1 text-[9px] font-black ${movement.tone === 'up' ? 'bg-emerald-50 text-emerald-700' : movement.tone === 'down' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}><MovementIcon size={11}/>{movement.label}</span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-[9px] text-slate-500">{metric.note}</p>
                        <div className="flex shrink-0 gap-3 text-[9px] font-bold tabular-nums text-slate-500">
                          {history.map((row, i) => <span key={row.label} className={i === 2 ? 'text-[#007FAE]' : ''}>{row.label} {fmt(metric.values[i] || 0)}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#102A43] px-3 py-2 text-white">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Website visitor → member</p>
              <p className="mt-0.5 text-xl font-black">{currentRate?.toFixed(2) ?? '0.00'}%</p>
            </div>
            <div className="rounded-xl border border-[#CFE5EF] bg-white/80 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Reporting window</p>
              <p className="mt-1 text-[10px] font-bold text-[#17344C]">{period}</p>
              {previous && latest ? <p className="mt-0.5 text-[9px] text-slate-500">Compared with {previous.dateRange.startDate} to {previous.dateRange.endDate}</p> : null}
            </div>
          </div>
        </>
      )}
      <p className="mt-auto border-t border-[#D8E8EF] pt-2 text-[9px] leading-3 text-slate-400">“Trial date reached” uses the scheduled appointment date, not confirmed attendance. Month-on-month compares equal day-of-month windows. No attendance field is collected.</p>
    </article>
  )
}
