'use client'

import { useState } from 'react'
import { RefreshCw, Globe2, MousePointer2, CalendarCheck, Dumbbell, UserRoundCheck, AlertTriangle, ArrowDownRight, ArrowUpRight, Minus, CalendarDays } from 'lucide-react'

type DailyVisit = { date: string; visitors: number; pageviews: number }
type Funnel = {
  dateRange: { startDate: string; endDate: string }
  refreshedAt: string
  website: { visitors: number; pageviews: number; daily: DailyVisit[] }
  trialPage: { visitors: number; pageviews: number; daily: DailyVisit[] }
  bookings: number
  trialsReached: number
  members: number
  campaigns?: { attributedBookings: number; unattributedBookings: number; breakdown: Array<{ source: string; medium: string; campaign: string; bookings: number; members: number }> }
  rates: { websiteToTrialPage: number; trialPageToBooking: number; bookingToTrialReached: number; trialReachedToMember: number; websiteToMember: number }
  notes: { trialReached: string }
}
type MonthResult = Funnel & { label: string }
type BaselineComparison = { before: Funnel; after: Funnel }
type Props = { bookings: number; trialsReached: number; members: number }

function fmt(value: number) { return new Intl.NumberFormat('en-ZA').format(value) }
function dateInJohannesburg(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
function monthWindow(offset: number, today: Date) {
  const local = dateInJohannesburg(today)
  const day = Number(local.slice(8, 10))
  const first = new Date(Date.UTC(Number(local.slice(0, 4)), Number(local.slice(5, 7)) - 1 - offset, 1))
  const year = first.getUTCFullYear()
  const month = String(first.getUTCMonth() + 1).padStart(2, '0')
  const lastDay = new Date(Date.UTC(year, first.getUTCMonth() + 1, 0)).getUTCDate()
  const endDay = Math.min(day, lastDay)
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(endDay).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('en-ZA', { month: 'long', timeZone: 'UTC' }).format(first),
  }
}
function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? { label: '0%', tone: 'flat' as const, icon: Minus } : { label: 'New', tone: 'up' as const, icon: ArrowUpRight }
  const delta = ((current - previous) / previous) * 100
  return { label: `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`, tone: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'flat' as const, icon: delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus }
}

export function FullGrowthFunnel({ bookings, trialsReached, members }: Props) {
  const [history, setHistory] = useState<MonthResult[]>([])
  const [selectedMonth, setSelectedMonth] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [baselineComparison, setBaselineComparison] = useState<BaselineComparison | null>(null)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const windows = [2, 1, 0].map(offset => monthWindow(offset, new Date()))
      const loadRange = async (startDate: string, endDate: string, label: string) => {
        const response = await fetch('/api/operations/growth-funnel', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate }),
        })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || `Could not load ${label}.`)
        return body as Funnel
      }
      const today = dateInJohannesburg(new Date())
      const [results, before, after] = await Promise.all([
        Promise.all(windows.map(async window => ({ ...(await loadRange(window.startDate, window.endDate, window.label)), label: window.label }))),
        loadRange('2026-10-28', '2026-11-24', 'the 28-day pre-change baseline'),
        loadRange('2026-11-25', today < '2026-11-25' ? '2026-11-25' : today, 'the post-change period'),
      ])
      setHistory(results)
      setBaselineComparison({ before, after })
      setSelectedMonth(2)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh the funnel history.')
    } finally { setLoading(false) }
  }

  const latest = history[history.length - 1]
  const previous = history[history.length - 2]
  const selected = history[selectedMonth]
  const metrics = [
    { label: 'Website visitors', key: 'websiteVisitors', icon: Globe2, values: history.map(row => row.website.visitors), current: latest?.website.visitors, note: 'Vercel daily visitor IDs; repeat visitors can count on different days' },
    { label: 'Free-trial page visitors', key: 'trialVisitors', icon: MousePointer2, values: history.map(row => row.trialPage.visitors), current: latest?.trialPage.visitors, note: 'Unique visitors to /free-trial' },
    { label: 'Booked a free trial', key: 'bookings', icon: CalendarCheck, values: history.map(row => row.bookings), current: latest?.bookings, note: 'Confirmed booking records' },
    { label: 'Trial date reached', key: 'trialsReached', icon: Dumbbell, values: history.map(row => row.trialsReached), current: latest?.trialsReached, note: 'Scheduled appointment date passed' },
    { label: 'Became a member', key: 'members', icon: UserRoundCheck, values: history.map(row => row.members), current: latest?.members, note: 'Email-matched membership signups' },
  ]
  const period = latest ? `${latest.dateRange.startDate} to ${latest.dateRange.endDate}` : 'Refresh to load live history'
  const afterDays = baselineComparison ? Math.max(1, Math.round((Date.parse(baselineComparison.after.dateRange.endDate + 'T00:00:00Z') - Date.parse(baselineComparison.after.dateRange.startDate + 'T00:00:00Z')) / 86400000) + 1) : 0
  const maxDaily = Math.max(1, ...(selected?.website.daily || []).map(row => row.visitors), ...(selected?.trialPage.daily || []).map(row => row.visitors))

  return (
    <article className="flex min-w-0 min-h-[290px] flex-col rounded-[24px] border border-[#CFE5EF] bg-[linear-gradient(155deg,#F8FCFE,#EAF7FB)] p-4 shadow-[0_8px_28px_rgba(16,42,67,.055)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#008FC4]">02 / The customer journey</p>
          <h2 className="mt-1 text-lg font-black tracking-tight">From visitor to member</h2>
          <p className="text-[10px] text-slate-500">Three-month trend · select a month to inspect daily traffic</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#102A43] px-3 py-2 text-[10px] font-extrabold text-white shadow-sm hover:bg-[#17496B] disabled:opacity-60">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''}/>{loading ? 'Loading' : 'Refresh'}
        </button>
      </div>

      <section className="mt-3 rounded-2xl border border-[#CDE3EF] bg-white/90 p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.17em] text-[#008FC4]">Growth change log · measurement marker</p>
            <h3 className="mt-1 text-sm font-black text-[#102A43]">25 November 2026 · Website & Google positioning update</h3>
            <p className="mt-1 max-w-3xl text-[10px] leading-4 text-slate-600">Homepage SEO title, description and hero positioning updated to boutique HIIT fitness; boxing pages repositioned as boxing-inspired fitness; How It Works, footer and opening-hours FAQ copy corrected; Google Business Profile updated by owner.</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#EAF7FC] px-2.5 py-1 text-[9px] font-black text-[#007FAE]">BASELINE · 25 NOV</span>
        </div>
        {baselineComparison ? <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Before changes · 28 days</p>
              <p className="mt-1 text-xs font-black text-[#102A43]">28 Oct – 24 Nov 2026</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="block text-slate-500">Website visitors</span><strong className="text-lg tabular-nums">{fmt(baselineComparison.before.website.visitors)}</strong></div>
                <div><span className="block text-slate-500">Trial-page visitors</span><strong className="text-lg tabular-nums">{fmt(baselineComparison.before.trialPage.visitors)}</strong></div>
                <div><span className="block text-slate-500">Trial bookings</span><strong className="text-lg tabular-nums">{fmt(baselineComparison.before.bookings)}</strong></div>
                <div><span className="block text-slate-500">Trial-matched members</span><strong className="text-lg tabular-nums">{fmt(baselineComparison.before.members)}</strong></div>
              </div>
            </div>
            <div className="rounded-xl border border-[#B9E4F2] bg-[#F0FAFE] p-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-[#007FAE]">After changes · live</p>
              <p className="mt-1 text-xs font-black text-[#102A43]">25 Nov – {baselineComparison.after.dateRange.endDate}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="block text-slate-500">Website visitors</span><strong className="text-lg tabular-nums">{fmt(baselineComparison.after.website.visitors)}</strong><small className="block text-slate-500">{(baselineComparison.after.website.visitors / afterDays).toFixed(1)} per day</small></div>
                <div><span className="block text-slate-500">Trial-page visitors</span><strong className="text-lg tabular-nums">{fmt(baselineComparison.after.trialPage.visitors)}</strong><small className="block text-slate-500">{(baselineComparison.after.trialPage.visitors / afterDays).toFixed(1)} per day</small></div>
                <div><span className="block text-slate-500">Trial bookings</span><strong className="text-lg tabular-nums">{fmt(baselineComparison.after.bookings)}</strong><small className="block text-slate-500">{(baselineComparison.after.bookings / afterDays).toFixed(2)} per day</small></div>
                <div><span className="block text-slate-500">New members</span><strong className="text-lg tabular-nums">{fmt(baselineComparison.after.members)}</strong><small className="block text-slate-500">{(baselineComparison.after.members / afterDays).toFixed(2)} per day</small></div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-slate-500">The post-change window is currently {afterDays} day(s). Compare daily averages rather than raw totals until both periods are 28 days long. Refresh is manual and retrieves Vercel visitor data plus verified booking and email-matched member records.</p>
        </> : <p className="mt-2 text-[10px] leading-4 text-slate-500">Select Refresh to capture the 28-day pre-change baseline and start the live post-change measurement. This is a one-time comparison marker; no background refresh is running.</p>}
      </section>

      {error ? <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-[#FFF9EA] p-2.5 text-[10px] leading-4 text-amber-900"><AlertTriangle size={12} className="mr-1 inline"/> {error}</div> : null}

      {!history.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#BBD7E4] bg-white/70 p-5 text-center">
          <p className="text-xs font-bold text-[#17344C]">Load live visitor-to-member history</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Refresh retrieves the last three monthly windows and the fixed before/after comparison around 25 November 2026, including daily website and trial-page traffic.</p>
          <p className="mt-2 text-[9px] text-slate-400">Bookings and member outcomes come from the TENROUNDS database. Visitor counts come from Vercel Web Analytics.</p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {history.map((row, index) => {
              const active = selectedMonth === index
              return <button key={row.label} type="button" onClick={() => setSelectedMonth(index)} className={`rounded-lg border px-2 py-2 text-left transition ${active ? 'border-[#00AEEF] bg-[#DDF5FD] shadow-sm' : 'border-white bg-white/75 hover:bg-white'}`}>
                <span className="block text-[9px] font-bold text-slate-500">{row.label}</span>
                <span className="mt-0.5 block text-base font-black tabular-nums text-[#102A43]">{fmt(row.trialPage.visitors)}</span>
                <span className="block text-[8px] text-slate-500">trial-page visitors</span>
              </button>
            })}
          </div>

          <div className="mt-2 space-y-1.5">
            {metrics.map((metric, index) => {
              const Icon = metric.icon
              const movement = change(metric.values[2] || 0, metric.values[1] || 0)
              const MovementIcon = movement.icon
              return <div key={metric.key} className="rounded-xl border border-white/90 bg-white/90 px-3 py-2 shadow-[0_3px_10px_rgba(16,42,67,.035)]">
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
                      <div className="flex shrink-0 gap-2 text-[9px] font-bold tabular-nums text-slate-500">
                        {history.map((row, i) => <span key={row.label} className={i === 2 ? 'text-[#007FAE]' : ''}>{row.label.slice(0,3)} {fmt(metric.values[i] || 0)}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            })}
          </div>

          <div className="mt-2 rounded-xl border border-[#CFE5EF] bg-white/85 p-3">
            <div className="flex items-center justify-between gap-2">
              <div><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#007FAE]"><CalendarDays size={11}/> Daily traffic drill-down</p><p className="text-[10px] font-bold text-[#17344C]">{selected?.label} · {selected?.dateRange.startDate} to {selected?.dateRange.endDate}</p></div>
              <span className="text-[9px] text-slate-400">Daily visitor counts</span>
            </div>
            {selected && selected.website.daily.length ? <div className="mt-3">
              <div className="flex h-[76px] items-end gap-[3px]">
                {selected.website.daily.map(day => {
                  const trial = selected.trialPage.daily.find(row => row.date === day.date)
                  const h = Math.max(day.visitors > 0 ? 3 : 0, day.visitors / maxDaily * 70)
                  const th = Math.max(trial?.visitors ? 2 : 0, (trial?.visitors || 0) / maxDaily * 70)
                  return <div key={day.date} title={`${day.date}: ${day.visitors} site visitors, ${trial?.visitors || 0} trial-page visitors`} className="group flex h-full min-w-0 flex-1 items-end justify-center gap-[1px]">
                    <div className="w-[48%] rounded-t bg-[#9CB8C9] group-hover:bg-[#6F9CB4]" style={{height:`${h}px`}}/>
                    <div className="w-[48%] rounded-t bg-[#00AEEF] group-hover:bg-[#008FC4]" style={{height:`${th}px`}}/>
                  </div>
                })}
              </div>
              <div className="mt-1 flex items-center justify-between text-[8px] text-slate-400"><span>{selected.website.daily[0]?.date.slice(8)}</span><span>{selected.website.daily[Math.floor(selected.website.daily.length/2)]?.date.slice(8)}</span><span>{selected.website.daily[selected.website.daily.length-1]?.date.slice(8)}</span></div>
              <div className="mt-2 flex flex-wrap gap-3 text-[9px] font-semibold text-slate-500"><span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-[#9CB8C9]"/> Website visitors</span><span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-[#00AEEF]"/> Trial-page visitors</span></div>
            </div> : <p className="mt-2 text-[10px] text-slate-500">No daily visit rows were returned for this month.</p>}
            {selected?.campaigns ? <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-wider text-[#007FAE]">Campaign attribution</p><p className="text-[9px] font-semibold text-slate-500">{selected.campaigns.attributedBookings} tagged · {selected.campaigns.unattributedBookings} untagged bookings</p></div>
              {selected.campaigns.breakdown.length ? <div className="mt-1.5 space-y-1">{selected.campaigns.breakdown.slice(0,3).map((campaign) => <div key={campaign.source + campaign.medium + campaign.campaign} className="flex items-center justify-between gap-2 text-[9px]"><span className="min-w-0 truncate font-semibold text-slate-600">{campaign.source} / {campaign.medium} · {campaign.campaign}</span><span className="shrink-0 font-black text-[#102A43]">{campaign.bookings} bookings · {campaign.members} members</span></div>)}</div> : <p className="mt-1 text-[9px] leading-4 text-slate-500">No tagged trial bookings in this period yet. New bookings will capture first-touch campaign UTMs.</p>}
            </div> : null}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
              <div><p className="text-[9px] text-slate-400">Website → trial page</p><p className="text-sm font-black text-[#102A43]">{selected?.rates.websiteToTrialPage.toFixed(1) ?? '0.0'}%</p></div>
              <div><p className="text-[9px] text-slate-400">Website → member</p><p className="text-sm font-black text-[#102A43]">{selected?.rates.websiteToMember.toFixed(2) ?? '0.00'}%</p></div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[#102A43] px-3 py-2 text-white">
            <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Website visitor → member</p><p className="text-lg font-black">{latest?.rates.websiteToMember.toFixed(2) ?? '0.00'}%</p></div>
            <p className="text-right text-[9px] text-slate-300">{period}<br/>Same day-of-month windows</p>
          </div>
        </>
      )}
      <p className="mt-auto border-t border-[#D8E8EF] pt-2 text-[9px] leading-3 text-slate-400">“Trial date reached” uses the scheduled appointment date, not confirmed attendance. Vercel visitor IDs reset daily, so monthly totals can count the same person on different days. Daily bars show each day's visitor count. No attendance field is collected.</p>
    </article>
  )
}
