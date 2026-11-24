'use client'

import { useState } from 'react'

type FunnelMetrics = {
  dateRange: { startDate: string; endDate: string }
  refreshedAt: string
  visitors: number
  sessions: number
  pageViews: number
  formViews: number
  ctaClicks: number
  bookedUsers: number
  successfulBookings: number
  notBookedUsers: number
  conversionRate: number
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZA').format(value)
}

function localYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? 'bg-[#102A43] text-white' : 'border border-slate-200 bg-white text-[#102A43]'}`}>
      <p className={`text-[10px] font-black uppercase tracking-wider ${accent ? 'text-slate-300' : 'text-slate-400'}`}>{label}</p>
      <p className={`mt-2 text-3xl font-black tabular-nums ${accent ? 'text-[#FFE36E]' : ''}`}>{value}</p>
      <p className={`mt-1 text-xs leading-5 ${accent ? 'text-slate-300' : 'text-slate-500'}`}>{detail}</p>
    </div>
  )
}

export function Ga4TrialFunnel() {
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const now = new Date()
    const startDate = localYmd(new Date(now.getFullYear(), now.getMonth(), 1))
    const endDate = localYmd(now)
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/operations/ga4-trial-funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'GA4 could not return the trial funnel.')
      setMetrics(result as FunnelMetrics)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'GA4 refresh failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const refreshedLabel = metrics
    ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }).format(new Date(metrics.refreshedAt))
    : null

  return (
    <section className="mt-8 rounded-[28px] border border-slate-200 bg-[#EAF8FD] p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#008FC4]">02 / GA4 free-trial landing funnel</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102A43] sm:text-3xl">Who visits the trial page but doesn't book?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Live Google Analytics 4 figures for this month. Refresh only when you choose, with no scheduled polling or background jobs.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#102A43] px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#17496B] disabled:cursor-wait disabled:opacity-60">
          <span aria-hidden="true">{loading ? '↻' : '⟳'}</span>{loading ? 'Refreshing GA4…' : 'Refresh GA4 data'}
        </button>
      </div>

      {!metrics && !error ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#8CCFE7] bg-white/75 p-6 text-center">
          <p className="font-extrabold text-[#102A43]">Ready when you are</p>
          <p className="mt-1 text-sm text-slate-500">Press Refresh GA4 data to fetch this month's trial-page visitors, CTA activity and completed bookings.</p>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-extrabold text-amber-900">GA4 refresh needs attention</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">{error}</p>
          <p className="mt-2 text-xs leading-5 text-amber-800">The website events are already firing. The Cockpit's private Google Analytics reporting credentials still need to be configured if this is the first connection.</p>
        </div>
      ) : null}

      {metrics ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-bold">{metrics.dateRange.startDate} to {metrics.dateRange.endDate}</span>
            <span>Last refreshed {refreshedLabel} · Property 338885680</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Unique trial-page visitors" value={formatNumber(metrics.visitors)} detail={`${formatNumber(metrics.sessions)} sessions · ${formatNumber(metrics.pageViews)} page views`} />
            <Metric label="Visitors who didn't book" value={formatNumber(metrics.notBookedUsers)} detail="No trial_success event during this reporting window" accent />
            <Metric label="Completed bookings" value={formatNumber(metrics.bookedUsers)} detail={`${formatNumber(metrics.successfulBookings)} successful booking events`} />
            <Metric label="Page-to-booking rate" value={`${metrics.conversionRate.toFixed(1)}%`} detail="Unique users with trial_success ÷ unique page visitors" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Metric label="Trial CTA clicks" value={formatNumber(metrics.ctaClicks)} detail="Clicks on free-trial links across the website" />
            <Metric label="Trial form views" value={formatNumber(metrics.formViews)} detail="Form-view events recorded on /free-trial" />
          </div>
          <div className="mt-5 rounded-xl border border-[#B8E3F1] bg-white/80 p-4">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#102A43]"><span>Visitor-to-booking journey</span><span>{metrics.conversionRate.toFixed(1)}% booked during this reporting window</span></div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-[#00AEEF]" style={{ width: `${metrics.visitors ? Math.min(100, metrics.bookedUsers / metrics.visitors * 100) : 0}%` }} />
              <div className="h-full flex-1 bg-[#102A43]/15" />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">The not-booked figure is the unique-user gap for this reporting window: it counts people who viewed /free-trial but did not trigger trial_success during the selected dates. Someone who books after the date range ends will remain in this gap until the next refresh includes that booking.</p>
          </div>
        </>
      ) : null}
    </section>
  )
}
