'use client'

import { useState } from 'react'
import { Activity, RefreshCw, CircleAlert, CheckCircle2 } from 'lucide-react'

type Result = {
  dateRange: { startDate: string; endDate: string }
  visitors: number
  bookedUsers: number
  ctaClicks: number
  formViews: number
  dataStatus: 'active' | 'no_activity'
  realtime?: { trialSuccess: number; trialSubmit: number; trialCtaClick: number }
}

function localDate(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}

export function Ga4MiniRefresh() {
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function refresh() {
    const today = localDate(new Date())
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/operations/ga4-trial-funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: today.slice(0, 7) + '-01', endDate: today }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'GA4 report could not be refreshed.')
      setResult(body as Result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'GA4 refresh failed.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-[#DDE8EF] bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Activity size={14} className="text-[#008FC4]"/><p className="text-[10px] font-black uppercase tracking-wider text-[#102A43]">GA4 live report</p></div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-[#102A43] px-2.5 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-[#17496B] disabled:opacity-60"><RefreshCw size={11} className={loading ? 'animate-spin' : ''}/>{loading ? 'Checking…' : 'Refresh'}</button>
      </div>
      {error ? <p role="alert" className="mt-2 flex gap-2 text-[10px] leading-4 text-amber-800"><CircleAlert size={13} className="mt-0.5 shrink-0"/>{error}</p> : null}
      {result ? result.dataStatus === 'active' ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          <div><p className="text-[9px] text-slate-400">Visitors</p><p className="text-lg font-black">{result.visitors}</p></div>
          <div><p className="text-[9px] text-slate-400">CTA clicks</p><p className="text-lg font-black">{result.ctaClicks}</p></div>
          <div><p className="text-[9px] text-slate-400">Form views</p><p className="text-lg font-black">{result.formViews}</p></div>
          <div><p className="text-[9px] text-slate-400">Bookings</p><p className="text-lg font-black">{result.bookedUsers}</p></div>
          <p className="col-span-4 flex items-center gap-1 text-[9px] text-emerald-700"><CheckCircle2 size={11}/> GA4 standard report returned data for {result.dateRange.startDate} to {result.dateRange.endDate}; Realtime events are checked separately</p>
        </div>
      ) : <p role="status" className="mt-2 flex gap-2 text-[10px] leading-4 text-amber-800"><CircleAlert size={13} className="mt-0.5 shrink-0"/>Standard GA4 reporting has no trial-page activity in this date range. Realtime (last 30 minutes): CTA {result.realtime?.trialCtaClick ?? 0}, form submits {result.realtime?.trialSubmit ?? 0}, successful bookings {result.realtime?.trialSuccess ?? 0}. If you just tested, these Realtime counts should appear first; standard reports can take longer to process.</p> : !error ? <p className="mt-2 text-[10px] leading-4 text-slate-500">Owner-triggered check only. Pulls this month's GA4 trial-page visits, CTA clicks, form views and successful bookings.</p> : null}
    </div>
  )
}
