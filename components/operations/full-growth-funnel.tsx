'use client'

import { useState } from 'react'
import { RefreshCw, Globe2, MousePointer2, CalendarCheck, Dumbbell, UserRoundCheck, AlertTriangle, ArrowDown } from 'lucide-react'

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

type Props = { bookings: number; trialsReached: number; members: number }

function fmt(value: number) { return new Intl.NumberFormat('en-ZA').format(value) }
function localDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function FullGrowthFunnel({ bookings, trialsReached, members }: Props) {
  const [data, setData] = useState<Funnel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    const today = localDate(new Date())
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/operations/growth-funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: today.slice(0, 7) + '-01', endDate: today }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The funnel could not be refreshed.')
      setData(body as Funnel)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh the funnel.')
    } finally {
      setLoading(false)
    }
  }

  const stages = data ? [
    { label: 'Website visitors', count: data.website.visitors, note: fmt(data.website.pageviews) + ' page views', icon: Globe2, rate: null },
    { label: 'Visited free-trial page', count: data.trialPage.visitors, note: fmt(data.trialPage.pageviews) + ' page views', icon: MousePointer2, rate: data.rates.websiteToTrialPage },
    { label: 'Booked a free trial', count: data.bookings, note: 'Confirmed booking records', icon: CalendarCheck, rate: data.rates.trialPageToBooking },
    { label: 'Trial date reached', count: data.trialsReached, note: 'Appointment date has passed', icon: Dumbbell, rate: data.rates.bookingToTrialReached },
    { label: 'Became a member', count: data.members, note: 'Email-matched membership signups', icon: UserRoundCheck, rate: data.rates.trialReachedToMember },
  ] : [
    { label: 'Website visitors', count: null, note: 'Awaiting Vercel Analytics', icon: Globe2, rate: null },
    { label: 'Visited free-trial page', count: null, note: 'Awaiting Vercel Analytics', icon: MousePointer2, rate: null },
    { label: 'Booked a free trial', count: bookings, note: 'Confirmed booking records', icon: CalendarCheck, rate: null },
    { label: 'Trial date reached', count: trialsReached, note: 'Appointment date has passed', icon: Dumbbell, rate: null },
    { label: 'Became a member', count: members, note: 'Email-matched membership signups', icon: UserRoundCheck, rate: null },
  ]

  return (
    <article className="flex min-w-0 min-h-[290px] flex-col rounded-[24px] border border-[#CFE5EF] bg-[linear-gradient(155deg,#F8FCFE,#EAF7FB)] p-4 shadow-[0_8px_28px_rgba(16,42,67,.055)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#008FC4]">02 / The customer journey</p>
          <h2 className="mt-1 text-lg font-black tracking-tight">From visitor to member</h2>
          <p className="text-[10px] text-slate-500">Every step, with its conversion rate</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#102A43] px-3 py-2 text-[10px] font-extrabold text-white shadow-sm hover:bg-[#17496B] disabled:opacity-60">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''}/>{loading ? 'Loading' : 'Refresh'}
        </button>
      </div>

      {error ? <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-[#FFF9EA] p-2.5 text-[10px] leading-4 text-amber-900"><AlertTriangle size={12} className="mr-1 inline"/> {error}</div> : null}

      <div className="mt-3 space-y-1.5">
        {stages.map((stage, index) => {
          const Icon = stage.icon
          const max = data?.website.visitors || 0
          const width = data && max > 0 && typeof stage.count === 'number' ? Math.max(stage.count > 0 ? 2 : 0, stage.count / max * 100) : 0
          return (
            <div key={stage.label} className="rounded-xl border border-white/90 bg-white/90 px-3 py-2 shadow-[0_3px_10px_rgba(16,42,67,.035)]">
              <div className="flex items-center gap-2">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${index === 4 ? 'bg-[#E5F8F2] text-emerald-600' : 'bg-[#EAF7FC] text-[#008FC4]'}`}><Icon size={14}/></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-extrabold text-[#17344C]">{stage.label}</p>
                    <p className="shrink-0 text-lg font-black leading-none tabular-nums text-[#102A43]">{stage.count === null ? '—' : fmt(stage.count)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[9px] text-slate-500">{stage.note}</p>
                    {stage.rate !== null ? <span className="shrink-0 rounded-full bg-[#EAF7FC] px-2 py-0.5 text-[9px] font-black text-[#007FAE]">{stage.rate.toFixed(1)}% from previous</span> : index === 0 ? <span className="text-[9px] font-bold text-slate-400">100% start</span> : null}
                  </div>
                </div>
              </div>
              {data ? <div className="ml-9 mt-1.5 h-1 overflow-hidden rounded-full bg-[#E8EEF2]"><div className={`h-full rounded-full ${index === 4 ? 'bg-emerald-500' : 'bg-[#00AEEF]'}`} style={{ width: width + '%' }}/></div> : null}
            </div>
          )
        })}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#D8E8EF] pt-2.5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Website visitor → member</p>
          <p className="text-xl font-black tracking-tight text-[#102A43]">{data ? data.rates.websiteToMember.toFixed(2) + '%' : '—'}</p>
        </div>
        <p className="max-w-[58%] text-right text-[9px] leading-4 text-slate-500">{data ? data.dateRange.startDate + ' to ' + data.dateRange.endDate : 'Refresh for live website and trial-page traffic'}</p>
      </div>
      <p className="mt-1 text-[9px] leading-3 text-slate-400">“Trial date reached” uses the scheduled appointment date, not confirmed attendance. No attendance field is collected.</p>
    </article>
  )
}
