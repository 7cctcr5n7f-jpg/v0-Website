'use client'

import { useState } from 'react'
import { Search, RefreshCw, ExternalLink, AlertTriangle, MousePointerClick, Eye } from 'lucide-react'

type Row = { page?: string; query?: string; clicks: number; impressions: number; ctr: number; position: number }
type Result = {
  property: string
  dateRange: { startDate: string; endDate: string }
  refreshedAt: string
  totals: { clicks: number; impressions: number; ctr: number }
  pages: Row[]
  queries: Row[]
  notes: string[]
}

function isoDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
function defaultWindow() {
  const end = new Date()
  end.setDate(end.getDate() - 3)
  const start = new Date(end)
  start.setDate(start.getDate() - 27)
  return { startDate: isoDate(start), endDate: isoDate(end) }
}
function number(value: number) { return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(value) }
function percent(value: number) { return (value * 100).toFixed(2) + '%' }

export function SearchConsoleDetails() {
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const range = defaultWindow()
      const response = await fetch('/api/operations/search-console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(range),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Search Console could not be refreshed.')
      setResult(body as Result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Search Console refresh failed.')
      setResult(null)
    } finally { setLoading(false) }
  }

  const table = (title: string, rows: Row[], key: 'page' | 'query') => (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs font-black text-[#102A43]">{title}</h3>
      {rows.length ? <div className="overflow-x-auto rounded-xl border border-[#E5EDF2]">
        <table className="w-full min-w-[520px] text-left text-[10px]">
          <thead className="bg-[#F4F8FA] text-[9px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-2">{key === 'page' ? 'Landing page' : 'Search query'}</th><th className="px-2 py-2 text-right">Clicks</th><th className="px-2 py-2 text-right">Impr.</th><th className="px-2 py-2 text-right">CTR</th><th className="px-3 py-2 text-right">Position</th></tr></thead>
          <tbody>{rows.slice(0,10).map((row,index)=><tr key={(row[key] || '') + index} className="border-t border-[#EDF2F5]"><td className="max-w-[260px] truncate px-3 py-2 font-semibold text-[#17344C]" title={row[key]}>{row[key]}</td><td className="px-2 py-2 text-right tabular-nums">{number(row.clicks)}</td><td className="px-2 py-2 text-right tabular-nums">{number(row.impressions)}</td><td className="px-2 py-2 text-right tabular-nums">{percent(row.ctr)}</td><td className="px-3 py-2 text-right tabular-nums">{row.position.toFixed(1)}</td></tr>)}</tbody>
        </table>
      </div> : <p className="rounded-xl border border-dashed border-[#D8E5EB] p-4 text-[10px] text-slate-500">No rows returned for this reporting window.</p>}
    </div>
  )

  return (
    <section className="rounded-[24px] border border-[#DDE8EF] bg-white p-4 shadow-[0_8px_28px_rgba(16,42,67,.035)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#008FC4]">04 / Organic search intelligence</p><h2 className="mt-1 text-lg font-black text-[#102A43]">What people search for, and which pages they find</h2><p className="mt-1 text-[10px] text-slate-500">Live Google Search Console page and query detail · last 28 complete days available</p></div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#102A43] px-3.5 py-2.5 text-[10px] font-extrabold text-white disabled:opacity-60"><RefreshCw size={12} className={loading ? 'animate-spin' : ''}/>{loading ? 'Loading Search Console…' : 'Refresh Search Console'}</button>
      </div>
      {error ? <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-950"><AlertTriangle size={14} className="mt-0.5 shrink-0"/><span>{error}</span></div> : null}
      {result ? <>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#F3F8FA] p-3"><p className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-500"><MousePointerClick size={11}/> Clicks</p><p className="mt-1 text-xl font-black text-[#102A43]">{number(result.totals.clicks)}</p></div>
          <div className="rounded-xl bg-[#F3F8FA] p-3"><p className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-500"><Eye size={11}/> Impressions</p><p className="mt-1 text-xl font-black text-[#102A43]">{number(result.totals.impressions)}</p></div>
          <div className="rounded-xl bg-[#F3F8FA] p-3"><p className="text-[9px] font-bold uppercase text-slate-500">CTR</p><p className="mt-1 text-xl font-black text-[#102A43]">{percent(result.totals.ctr)}</p></div>
        </div>
        <p className="mt-2 text-[9px] text-slate-400">{result.property} · {result.dateRange.startDate} to {result.dateRange.endDate} · refreshed {new Date(result.refreshedAt).toLocaleString('en-ZA')}</p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">{table('Top landing pages',result.pages,'page')}{table('Top Google search queries',result.queries,'query')}</div>
        <p className="mt-3 text-[9px] leading-4 text-slate-400">{result.notes.join(' ')}</p>
      </> : <div className="mt-4 rounded-xl border border-dashed border-[#D8E5EB] bg-[#F8FBFC] p-5 text-center"><Search size={18} className="mx-auto text-[#00AEEF]"/><p className="mt-2 text-xs font-bold text-[#17344C]">Load live search performance detail</p><p className="mt-1 text-[10px] text-slate-500">This retrieves the pages earning impressions and clicks, plus the exact search queries bringing people to TENROUNDS.</p></div>}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EDF2F5] pt-3"><span className="text-[9px] text-slate-400">Owner-triggered refresh · no scheduled jobs</span><a href="https://search.google.com/search-console?resource_id=sc-domain%3Atenrounds.co.za" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#008FC4]">Open Search Console <ExternalLink size={11}/></a></div>
    </section>
  )
}
