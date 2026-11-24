'use client'

import { useEffect, useState } from 'react'
import { Activity, Check, ChevronDown, Lightbulb, RefreshCw, Search, Target, X } from 'lucide-react'

type Metrics = {
  seo: { clicks: number; previousClicks: number; impressions: number; previousImpressions: number; ctr: number; previousCtr: number; position: number; previousPosition: number }
  website: { trialVisitors: number; trialBookings: number; trialToBookingRate: number; campaignAttributedBookings: number; websiteVisitors: number | null; websiteToTrialRate: number | null; trialReached: number; members: number; memberRate: number | null }
}
type Recommendation = {
  id: string; baseId: string; area: 'search' | 'website'; title: string; insight: string; action: string
  kpi: string; metricKey: string; direction: 'up' | 'down'; baseline: number | null; baselineDate: string
  createdDate: string; status: 'open' | 'implemented' | 'dismissed'; implementedDate?: string
  outcome?: { checkedDate: string; value: number | null; delta: number | null; improved: boolean | null; summary: string }
}
type Props = {
  seo: Metrics['seo']
  fallbackWebsite: { trialVisitors: number; trialBookings: number; trialReached: number; members: number }
}
type StoreResponse = { recommendations?: Recommendation[]; history?: Recommendation[]; lastReviewDate?: string; today?: string }

function monthWindow(offset: number) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() - offset
  const first = new Date(year, month, 1)
  const endDay = Math.min(now.getDate(), new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate())
  const pad = (n: number) => String(n).padStart(2, '0')
  return { startDate: `${first.getFullYear()}-${pad(first.getMonth()+1)}-01`, endDate: `${first.getFullYear()}-${pad(first.getMonth()+1)}-${pad(endDay)}` }
}
function fmt(value: number | null) { return value === null ? 'Not available' : new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 }).format(value) }

export function GrowthRecommendations({ seo, fallbackWebsite }: Props) {
  const [items, setItems] = useState<Recommendation[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sourceNote, setSourceNote] = useState('SEO snapshots · booking database · live website data checked when available')
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/operations/growth-recommendations', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json() as StoreResponse
        if (!response.ok) throw new Error('Could not load saved recommendation history.')
        if (active) setItems(body.recommendations || body.history || [])
      })
      .catch(() => { if (active) setError('Saved recommendation history is temporarily unavailable.') })
    return () => { active = false }
  }, [])

  async function review() {
    setLoading(true)
    setError('')
    try {
      const currentWindow = monthWindow(0)
      const previousWindow = monthWindow(1)
      const [currentResponse, previousResponse] = await Promise.all([
        fetch('/api/operations/growth-funnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentWindow) }),
        fetch('/api/operations/growth-funnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(previousWindow) }),
      ])
      const current = currentResponse.ok ? await currentResponse.json() : null
      const previous = previousResponse.ok ? await previousResponse.json() : null
      const trialVisitors = current?.trialPage?.visitors ?? fallbackWebsite.trialVisitors
      const trialBookings = current?.bookings ?? fallbackWebsite.trialBookings
      const trialReached = current?.trialsReached ?? fallbackWebsite.trialReached
      const members = current?.members ?? fallbackWebsite.members
      const attributed = current?.campaigns?.attributedBookings ?? 0
      const websiteVisitors = typeof current?.website?.visitors === 'number' ? current.website.visitors : null
      const websiteToTrialRate = websiteVisitors && websiteVisitors > 0 ? trialVisitors / websiteVisitors * 100 : null
      const trialToBookingRate = trialVisitors > 0 ? trialBookings / trialVisitors * 100 : 0
      const memberRate = trialReached > 0 ? members / trialReached * 100 : null
      const nextMetrics: Metrics = {
        seo,
        website: { trialVisitors, trialBookings, trialToBookingRate, campaignAttributedBookings: attributed, websiteVisitors, websiteToTrialRate, trialReached, members, memberRate },
      }
      const response = await fetch('/api/operations/growth-recommendations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', metrics: nextMetrics }),
      })
      const body = await response.json() as StoreResponse & { error?: string }
      if (!response.ok) throw new Error(body.error || 'Could not generate recommendations.')
      setItems(body.history || body.recommendations || [])
      setMetrics(nextMetrics)
      setSourceNote(current ? 'Google Search Console snapshots · live Vercel traffic · TENROUNDS booking database' : 'Google Search Console snapshots · Vercel trial-page snapshot · TENROUNDS booking database. Live visitor API unavailable, so website-wide rates are withheld.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not review growth performance.')
    } finally { setLoading(false) }
  }

  async function updateStatus(item: Recommendation, status: 'implemented' | 'dismissed') {
    try {
      const response = await fetch('/api/operations/growth-recommendations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', id: item.id, status, metrics }),
      })
      const body = await response.json() as StoreResponse & { error?: string }
      if (!response.ok) throw new Error(body.error || 'Could not update recommendation.')
      setItems(body.recommendations || body.history || [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update recommendation status.')
    }
  }

  const currentSearch = items.filter(item => item.area === 'search' && item.status !== 'dismissed').slice(-1)[0]
  const currentWebsite = items.filter(item => item.area === 'website' && item.status !== 'dismissed').slice(-1)[0]
  const completed = items.filter(item => item.status === 'implemented' || item.status === 'dismissed').slice().reverse().slice(0, 6)
  const card = (item: Recommendation | undefined, area: 'search' | 'website') => {
    const isSearch = area === 'search'
    return (
      <article className="rounded-2xl border border-[#DDE8EF] bg-white p-4 shadow-[0_5px_18px_rgba(16,42,67,.035)]">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${isSearch ? 'bg-[#EAF7FC] text-[#007FAE]' : 'bg-[#FFF6DD] text-[#8A6500]'}`}>{isSearch ? <Search size={11}/> : <Activity size={11}/>} {isSearch ? 'Google Search' : 'Website & conversion'}</span>
          {item ? <span className="text-[9px] font-semibold text-slate-400">Added {item.createdDate}</span> : null}
        </div>
        {item ? <>
          <h3 className="mt-3 text-sm font-black leading-5 text-[#102A43]">{item.title}</h3>
          <p className="mt-1.5 text-[11px] leading-5 text-slate-600">{item.insight}</p>
          <div className="mt-3 rounded-xl bg-[#F3F7FA] p-3">
            <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#007FAE]"><Target size={11}/> Recommended action</p>
            <p className="mt-1 text-[11px] leading-5 text-[#17344C]">{item.action}</p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div><p className="text-[9px] font-bold uppercase text-slate-400">Measure success</p><p className="text-[11px] font-black text-[#102A43]">{item.kpi}</p></div>
            {item.status === 'open' ? <div className="flex gap-1.5">
              <button type="button" onClick={() => updateStatus(item, 'implemented')} className="inline-flex items-center gap-1 rounded-lg bg-[#102A43] px-2.5 py-2 text-[9px] font-bold text-white"><Check size={11}/> Done</button>
              <button type="button" onClick={() => updateStatus(item, 'dismissed')} aria-label="Dismiss recommendation" className="rounded-lg border border-slate-200 px-2 py-2 text-slate-500"><X size={12}/></button>
            </div> : <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Implemented · outcome pending</span>}
          </div>
          {item.outcome ? <div className={`mt-3 rounded-lg p-2.5 text-[10px] leading-4 ${item.outcome.improved ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}><span className="font-black">Follow-up · {item.outcome.checkedDate}: </span>{item.outcome.summary}</div> : null}
        </> : <div className="mt-4 rounded-xl border border-dashed border-[#D6E3EA] bg-[#F8FBFC] p-4 text-center"><Lightbulb className="mx-auto text-[#00AEEF]" size={18}/><p className="mt-2 text-[11px] font-bold text-[#17344C]">No recommendation generated yet</p><p className="mt-1 text-[10px] text-slate-500">Run today's review to identify the next best action.</p></div>}
      </article>
    )
  }

  return (
    <section className="rounded-[24px] border border-[#DCE7ED] bg-[linear-gradient(135deg,#F7FAFC,#EDF5F8)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#008FC4]">06 / Improve the numbers</p><h2 className="mt-1 text-xl font-black tracking-tight text-[#102A43]">Today's growth action plan</h2><p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500">Recommendations are based on current KPI signals and saved action history. Mark work as implemented so the next review can measure its effect before choosing the next move.</p></div>
        <button type="button" onClick={review} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#102A43] px-4 py-2.5 text-[10px] font-extrabold text-white shadow-sm hover:bg-[#17496B] disabled:opacity-60"><RefreshCw size={12} className={loading ? 'animate-spin' : ''}/>{loading ? 'Reviewing KPIs…' : "Review today's KPIs"}</button>
      </div>
      {error ? <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-900">{error}</p> : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{card(currentSearch, 'search')}{card(currentWebsite, 'website')}</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#D8E5EB] pt-3">
        <p className="text-[9px] text-slate-500">{sourceNote}</p>
        <button type="button" onClick={() => setShowHistory(value => !value)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#007FAE]">{showHistory ? 'Hide' : 'View'} action history <ChevronDown size={12} className={showHistory ? 'rotate-180' : ''}/></button>
      </div>
      {showHistory ? <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{completed.map(item => <div key={item.id} className="rounded-xl border border-[#E1E9EE] bg-white p-3"><p className="text-[9px] font-black uppercase text-slate-400">{item.area === 'search' ? 'Google Search' : 'Website'} · {item.createdDate}</p><p className="mt-1 text-[11px] font-bold text-[#17344C]">{item.title}</p><p className="mt-1 text-[9px] text-slate-500">{item.status === 'implemented' ? item.outcome?.summary || 'Implemented. Awaiting next KPI review.' : 'Dismissed'}</p></div>)}</div> : null}
      <p className="mt-3 text-[9px] leading-4 text-slate-400">Reviews are owner-triggered, not automatic background jobs. The dashboard stores recommendation history and KPI baselines. Daily suggestions become more specific as fresh Search Console, website and campaign data accumulates.</p>
    </section>
  )
}
