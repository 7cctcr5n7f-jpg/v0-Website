'use client'

import { useState } from 'react'
import { Activity, ArrowDown, CalendarDays, MousePointerClick, RefreshCw, Users, UserX, CheckCircle2, AlertTriangle } from 'lucide-react'

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
  dataStatus: 'active' | 'no_activity'
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZA').format(value)
}

function localYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'light' }: {
  label: string
  value: string
  detail: string
  icon: typeof Users
  tone?: 'light' | 'dark' | 'blue'
}) {
  const toneClass = tone === 'dark'
    ? 'border-[#163C59] bg-[#102A43] text-white'
    : tone === 'blue'
      ? 'border-[#B9E5F4] bg-[#E8F7FC] text-[#102A43]'
      : 'border-[#E4ECF2] bg-white text-[#102A43]'
  const iconClass = tone === 'dark' ? 'bg-white/10 text-[#FFE36E]' : 'bg-[#EAF7FC] text-[#008FC4]'
  return (
    <article className={'min-h-[156px] rounded-[24px] border p-5 shadow-[0_10px_28px_rgba(16,42,67,.055)] ' + toneClass}>
      <div className="flex items-start justify-between gap-3">
        <p className={'text-[10px] font-black uppercase tracking-[.15em] ' + (tone === 'dark' ? 'text-slate-300' : 'text-slate-400')}>{label}</p>
        <span className={'flex size-9 shrink-0 items-center justify-center rounded-xl ' + iconClass}><Icon size={17} /></span>
      </div>
      <p className={'mt-4 text-[38px] font-black leading-none tracking-[-.045em] tabular-nums ' + (tone === 'dark' ? 'text-[#FFE36E]' : '')}>{value}</p>
      <p className={'mt-2 text-xs leading-5 ' + (tone === 'dark' ? 'text-slate-300' : 'text-slate-500')}>{detail}</p>
    </article>
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
  const hasData = metrics?.dataStatus === 'active'

  return (
    <section className="relative mt-9 overflow-hidden rounded-[32px] border border-[#DCE8EF] bg-[radial-gradient(circle_at_90%_0%,rgba(0,174,239,.12),transparent_30%),linear-gradient(145deg,#F5FBFE,#EAF6FB_55%,#F8FBFD)] p-5 shadow-[0_20px_55px_rgba(16,42,67,.075)] sm:p-8">
      <div className="absolute right-[-65px] top-[-100px] size-64 rounded-full border-[34px] border-[#00AEEF]/[.07]" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[#008FC4]"><span className="h-2 w-2 rounded-full bg-[#00AEEF]" /> Acquisition / 02</div>
            <h2 className="mt-3 text-3xl font-black leading-[1.04] tracking-[-.045em] text-[#102A43] sm:text-[40px]">Where trial-page visitors drop off.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52677B]">See how many people reach the free-trial page, interact with the booking form and complete a booking. Live GA4 data, fetched only when you ask.</p>
          </div>
          <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-[#102A43] px-5 py-3.5 text-xs font-black text-white shadow-[0_9px_24px_rgba(16,42,67,.2)] transition hover:-translate-y-0.5 hover:bg-[#17496B] disabled:cursor-wait disabled:opacity-60">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{loading ? 'Refreshing…' : 'Refresh GA4'}
          </button>
        </div>

        {!metrics && !error ? (
          <div className="mt-7 flex flex-col items-center rounded-[24px] border border-dashed border-[#B7D8E6] bg-white/75 px-6 py-9 text-center">
            <Activity size={25} className="text-[#008FC4]" />
            <p className="mt-3 font-extrabold text-[#102A43]">Your trial funnel is ready</p>
            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">Refresh to load visitors, booking activity and the number of people who leave without booking.</p>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="mt-7 rounded-[22px] border border-amber-200 bg-[#FFF9EC] p-5">
            <div className="flex items-center gap-2 font-extrabold text-amber-900"><AlertTriangle size={17} /> GA4 connection needs attention</div>
            <p className="mt-2 text-sm leading-6 text-amber-800">{error}</p>
          </div>
        ) : null}

        {metrics ? (
          <>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-y border-[#D8E7EF] py-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#29465D]"><CalendarDays size={14} /> {metrics.dateRange.startDate} to {metrics.dateRange.endDate}</div>
              <div className="text-slate-500">Updated {refreshedLabel} · GA4 property 338885680</div>
            </div>
            {!hasData ? (
              <div role="status" className="mt-5 flex gap-3 rounded-[22px] border border-amber-200 bg-[#FFF9EC] p-5">
                <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-extrabold text-amber-950">No trial-page activity is appearing in GA4 reports yet.</p>
                  <p className="mt-1 text-sm leading-6 text-amber-900">These zeros are not a reliable indication that nobody visited. GA4 returned no /free-trial page views and no trial funnel events for this period. We need to confirm the website's live measurement stream is writing to property 338885680 and allow standard reports time to process new events.</p>
                </div>
              </div>
            ) : null}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Trial-page visitors" value={hasData ? formatNumber(metrics.visitors) : '—'} detail={hasData ? formatNumber(metrics.sessions) + ' sessions · ' + formatNumber(metrics.pageViews) + ' page views' : 'No page-view data received'} icon={Users} />
              <MetricCard label="Visited, did not book" value={hasData ? formatNumber(metrics.notBookedUsers) : '—'} detail={hasData ? 'Unique visitors without a completed booking' : 'Calculated once visitor data is available'} icon={UserX} tone="dark" />
              <MetricCard label="Completed bookings" value={hasData ? formatNumber(metrics.bookedUsers) : '—'} detail={hasData ? formatNumber(metrics.successfulBookings) + ' successful booking events' : 'No trial_success events received'} icon={CheckCircle2} />
              <MetricCard label="Visitor-to-booking rate" value={hasData ? metrics.conversionRate.toFixed(1) + '%' : '—'} detail="Completed booking users ÷ trial-page visitors" icon={Activity} tone="blue" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Trial CTA clicks" value={hasData ? formatNumber(metrics.ctaClicks) : '—'} detail="Clicks on free-trial links across the website" icon={MousePointerClick} />
              <MetricCard label="Trial form views" value={hasData ? formatNumber(metrics.formViews) : '—'} detail="Form-view events recorded on /free-trial" icon={ArrowDown} />
            </div>
            <div className="mt-5 rounded-[24px] border border-[#DFE9EF] bg-white/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#008FC4]">Conversion journey</p><h3 className="mt-1 text-lg font-black text-[#102A43]">Page visit → booking confirmed</h3></div>
                <span className="rounded-full bg-[#EEF4F7] px-3 py-1.5 text-xs font-bold text-[#52677B]">{hasData ? metrics.conversionRate.toFixed(1) + '% conversion' : 'Awaiting verified data'}</span>
              </div>
              {hasData ? (
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#00AEEF] to-[#102A43]" style={{ width: Math.min(100, metrics.conversionRate) + '%' }} /></div>
              ) : (
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#E8EEF2]" />
              )}
              <p className="mt-3 text-xs leading-5 text-slate-500">The non-booker count is based on unique users within the same reporting window. It is not a lifetime identity match: someone who books after this date range will be counted as a non-booker until the next refresh includes their booking.</p>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
