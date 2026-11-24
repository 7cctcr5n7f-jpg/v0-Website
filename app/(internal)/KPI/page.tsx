import type { Metadata } from 'next'
import { desc } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, ArrowRight, BarChart3, CalendarDays, CheckCircle2, CircleAlert, Compass, Search, Settings2, Sparkles, Users, Zap } from 'lucide-react'
import { db } from '@/lib/db'
import { trialBookings, membershipSignups, sessionPurchases } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { OperationsLogin } from '@/components/operations/operations-login'
import { Ga4MiniRefresh } from '@/components/operations/ga4-mini-refresh'
import { FullGrowthFunnel } from '@/components/operations/full-growth-funnel'
import {
  buildSignupEmailIndex,
  buildSessionPurchaseEmailIndex,
  getTrialConversion,
  ymdInJohannesburg,
  normalizeEmail,
} from '@/lib/trial-conversion'

export const metadata: Metadata = {
  title: 'TENROUNDS | Growth Cockpit',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const MONTHS = [
  { key: '2026-09', label: 'Sep', full: 'September', clicks: 165, impressions: 5148, ctr: 3.21, position: 12.75, trialVisitors: 723, trialPageViews: 759 },
  { key: '2026-10', label: 'Oct', full: 'October', clicks: 176, impressions: 4905, ctr: 3.59, position: 10.39, trialVisitors: 55, trialPageViews: 69 },
  { key: '2026-11', label: 'Nov', full: 'November', clicks: 202, impressions: 4592, ctr: 4.40, position: 9.06, trialVisitors: 61, trialPageViews: 76 },
]

function monthKey(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit' }).format(new Date(value)).slice(0, 7)
}
function localDate(value: Date | string) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) }
function pct(value: number) { return `${value > 0 ? '+' : ''}${value.toFixed(1)}%` }

function StatPill({ label, value, note, accent = false }: { label: string; value: string | number; note: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? 'border-[#00AEEF]/30 bg-[#00AEEF] text-[#06283D]' : 'border-white/10 bg-white/[.075] text-white'}`}>
    <p className={`text-[9px] font-black uppercase tracking-[.16em] ${accent ? 'text-[#06324A]/75' : 'text-slate-300'}`}>{label}</p>
    <div className="mt-2 flex items-end justify-between gap-2"><span className="text-[34px] font-black leading-none tracking-[-.05em] tabular-nums">{value}</span><span className={`pb-1 text-[10px] font-semibold ${accent ? 'text-[#06324A]/75' : 'text-slate-300'}`}>{note}</span></div>
  </div>
}

function TrendMark({ positive = true }: { positive?: boolean }) {
  return positive ? <ArrowUpRight size={15} className="text-emerald-600" /> : <ArrowDownRight size={15} className="text-amber-600" />
}

export default async function KpiPage() {
  if (!(await isOperationsAuthed())) return <OperationsLogin />

  const [allTrials, allSignups, allPurchases] = await Promise.all([
    db.select().from(trialBookings).orderBy(desc(trialBookings.createdAt)),
    db.select().from(membershipSignups).orderBy(desc(membershipSignups.createdAt)),
    db.select().from(sessionPurchases).orderBy(desc(sessionPurchases.createdAt)),
  ])

  const today = ymdInJohannesburg()
  const signupIndex = buildSignupEmailIndex(allSignups)
  const purchaseIndex = buildSessionPurchaseEmailIndex(allPurchases)
  const cohort = allTrials.map(booking => ({
    booking,
    conversion: getTrialConversion(booking, signupIndex, purchaseIndex, today),
  }))
  const monthly = MONTHS.map(month => {
    const monthTrials = cohort.filter(row => monthKey(row.booking.createdAt) === month.key && localDate(row.booking.createdAt) <= month.key + '-23')
    const monthSignups = allSignups.filter(row => monthKey(row.createdAt) === month.key)
    const converted = monthTrials.filter(row => row.conversion.status === 'converted').length
    const eligible = monthTrials.filter(row => row.conversion.status !== 'upcoming').length
    return { ...month, bookings: monthTrials.length, signups: monthSignups.length, converted, eligible, conversionRate: eligible ? Math.round(converted / eligible * 100) : 0 }
  })
  const current = monthly[2]
  const currentMonthBookings = cohort.filter(row => monthKey(row.booking.createdAt) === '2026-11').length
  const latestTrials = cohort.slice(0, 4)
  const allConverted = cohort.filter(row => row.conversion.status === 'converted').length
  const allEligible = cohort.filter(row => row.conversion.status !== 'upcoming').length
  const allRate = allEligible ? Math.round(allConverted / allEligible * 100) : 0
  const clickChange = ((monthly[2].clicks - monthly[0].clicks) / monthly[0].clicks) * 100
  const positionChange = monthly[0].position - monthly[2].position
  const nowLabel = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())

  return <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#EEF3F7] px-4 py-4 text-[#102A43] sm:px-6 lg:h-screen lg:overflow-hidden lg:px-7 lg:py-4">
    <div className="mx-auto flex min-h-full w-full min-w-0 max-w-[1600px] flex-col gap-3">
      <header className="flex h-11 shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#102A43] text-sm font-black text-white">10<span className="text-[#00AEEF]">.</span></div>
          <div className="leading-tight"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#008FC4]">TENROUNDS</p><p className="text-xs font-bold text-slate-500">OWNER COCKPIT <span className="px-1 text-slate-300">/</span> GROWTH</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-[#DDE6ED] bg-white px-3 py-2 text-[10px] font-bold text-slate-500 sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" /> Database live</span>
          <span className="rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-slate-500">Updated {nowLabel}</span>
          <Link href="/operations" className="inline-flex items-center gap-2 rounded-xl bg-[#102A43] px-3.5 py-2.5 text-[11px] font-extrabold text-white transition hover:bg-[#17496B]"><Settings2 size={13}/> Operations</Link>
        </div>
      </header>

      <section className="relative grid min-w-0 shrink-0 gap-5 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_80%_5%,rgba(0,174,239,.26),transparent_27%),linear-gradient(115deg,#081B2D,#102A43_60%,#17496B)] p-5 text-white shadow-[0_18px_50px_rgba(16,42,67,.15)] sm:p-6 lg:min-h-[190px] lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="pointer-events-none absolute -right-10 -top-28 size-72 rounded-full border-[38px] border-white/[.045]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.19em] text-[#FFE36E]"><Sparkles size={11}/> The business, in one view</div>
          <h1 className="mt-3 text-3xl font-black leading-[.98] tracking-[-.05em] sm:text-4xl">Turn attention into <span className="text-[#00B5EF]">trials.</span><br/>Turn trials into members.</h1>
          <p className="mt-2 max-w-xl text-xs leading-5 text-slate-300">One screen for discovery, trial demand and member conversion. The sources are labelled so you can tell verified outcomes from analytics snapshots.</p>
        </div>
        <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-2.5">
          <StatPill label="Trial bookings" value={currentMonthBookings} note="Nov · 1–24"/>
          <StatPill label="Matched members" value={current.converted} note="After trial"/>
          <StatPill label="Matured conversion" value={`${current.conversionRate}%`} note={`${current.eligible} eligible`} accent/>
          <StatPill label="Trial-page visitors" value={current.trialVisitors} note="Vercel · 1–23"/>
        </div>
      </section>

      <section className="grid min-h-0 min-w-0 flex-1 gap-3 xl:grid-cols-[1fr_1.08fr_.95fr]">
        <article className="flex min-w-0 min-h-[290px] flex-col rounded-[24px] border border-[#E0E8EE] bg-white p-5 shadow-[0_8px_28px_rgba(16,42,67,.045)]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#008FC4]">01 / Get discovered</p><h2 className="mt-1 text-lg font-black tracking-tight">Search demand</h2><p className="text-[11px] text-slate-500">Google organic · matching 23-day windows</p></div>
            <span className="rounded-xl bg-[#EAF8FD] p-2 text-[#008FC4]"><Search size={17}/></span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Clicks this month</p><p className="mt-1 text-4xl font-black tracking-[-.05em] tabular-nums">{current.clicks}</p></div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right"><p className="flex items-center justify-end gap-1 text-sm font-black text-emerald-700"><TrendMark/>{pct(clickChange)}</p><p className="text-[9px] font-semibold text-emerald-700/70">vs September</p></div>
          </div>
          <div className="mt-4 space-y-3">
            {monthly.map((m,i)=><div key={m.key} className="grid grid-cols-[30px_1fr_35px] items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">{m.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-[#EDF2F6]"><div className={`h-full rounded-full ${i===2?'bg-[#00AEEF]':'bg-[#9CB8C9]'}`} style={{width:`${m.clicks/220*100}%`}}/></div>
              <span className="text-right text-xs font-black tabular-nums">{m.clicks}</span>
            </div>)}
          </div>
          <div className="mt-auto grid grid-cols-3 gap-2 border-t border-[#E9EEF2] pt-4">
            <div><p className="text-[9px] font-bold uppercase text-slate-400">CTR</p><p className="mt-1 text-lg font-black">{current.ctr.toFixed(2)}%</p><p className="text-[9px] text-emerald-700">↑ from 3.21%</p></div>
            <div><p className="text-[9px] font-bold uppercase text-slate-400">Avg. position</p><p className="mt-1 text-lg font-black">{current.position.toFixed(1)}</p><p className="text-[9px] text-emerald-700">↑ {positionChange.toFixed(1)} places</p></div>
            <div><p className="text-[9px] font-bold uppercase text-slate-400">Impressions</p><p className="mt-1 text-lg font-black">{(current.impressions/1000).toFixed(1)}k</p><p className="text-[9px] text-slate-400">Search visibility</p></div>
          </div>
        </article>

        <FullGrowthFunnel bookings={currentMonthBookings} trialsReached={current.eligible} members={new Set(cohort.filter(row => monthKey(row.booking.createdAt) === "2026-11" && (row.conversion.source === "membership" || row.booking.manuallyConverted)).map(row => normalizeEmail(row.booking.email) || `manual-${row.booking.id}`)).size} />

        <article className="flex min-h-[290px] flex-col rounded-[24px] border border-[#E0E8EE] bg-white p-5 shadow-[0_8px_28px_rgba(16,42,67,.045)]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#008FC4]">03 / What needs attention</p><h2 className="mt-1 text-lg font-black tracking-tight">Owner's radar</h2><p className="text-[11px] text-slate-500">The next best moves, not another report</p></div>
            <span className="rounded-xl bg-[#FFF6D9] p-2 text-[#9B7300]"><Compass size={17}/></span>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-[#FFFAEA] p-3.5">
            <div className="flex items-center gap-2"><CircleAlert size={15} className="text-amber-700"/><p className="text-[10px] font-black uppercase tracking-wider text-amber-900">Tracking setup incomplete</p></div>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-amber-950">GA4 is connected in Supermetrics, but standard reporting has not returned /free-trial page views or trial_* events. I found and corrected a report-query bug that omitted the filtered dimensions.</p>
            <p className="mt-2 text-[10px] font-bold text-amber-800">Vercel Analytics independently recorded 61 unique trial-page visitors in November.</p>
          </div>
          <div className="mt-3 rounded-2xl border border-[#DDE8EF] bg-[#F7FAFC] p-3.5">
            <div className="flex items-center gap-2"><BarChart3 size={15} className="text-[#008FC4]"/><p className="text-[10px] font-black uppercase tracking-wider text-[#102A43]">SEO is moving in the right direction</p></div>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">Search clicks are up {clickChange.toFixed(0)}% since September. Social referrals to the trial page fell from 615 in September to 7 in November. Check whether campaigns or links changed.</p>
          </div>
          <Ga4MiniRefresh />
          <div className="mt-auto flex items-center justify-between border-t border-[#E9EEF2] pt-3"><span className="text-[10px] font-semibold text-slate-500">Manual refresh only · no background jobs</span><Link href="/operations" className="inline-flex items-center gap-1 text-[10px] font-black text-[#008FC4] hover:underline">Open operations <ArrowRight size={12}/></Link></div>
        </article>
      </section>

      <section className="grid shrink-0 gap-3 lg:grid-cols-[1.1fr_.9fr]">
        <article className="rounded-[20px] border border-[#E0E8EE] bg-white px-5 py-3.5">
          <div className="flex items-center justify-between gap-2"><div><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#008FC4]">04 / Momentum</p><h3 className="text-sm font-black">Trial-page visitors and bookings, side by side.</h3></div><span className="text-[9px] font-semibold text-slate-400">Vercel Analytics · /free-trial · 1st–23rd</span></div>
          <div className="mt-3 grid grid-cols-3 divide-x divide-[#E7EDF1]">
            {monthly.map((m,i)=><div key={m.key} className={`px-3 first:pl-0 last:pr-0 ${i===2?'text-[#008FC4]':''}`}><p className="text-[9px] font-bold uppercase text-slate-400">{m.full}</p><div className="mt-1 flex items-center gap-2"><span className="text-xl font-black tabular-nums">{m.trialVisitors}</span><span className="text-[9px] font-semibold text-slate-400">visitors</span><span className="ml-auto text-[10px] font-black">{m.bookings} bookings</span></div></div>)}
          </div>
        </article>
        <article className="rounded-[20px] border border-[#E0E8EE] bg-white px-5 py-3.5">
          <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#008FC4]">05 / Recent activity</p><h3 className="text-sm font-black">Latest trial bookings</h3></div><Link href="/operations" className="text-[10px] font-black text-[#008FC4]">View all →</Link></div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            {latestTrials.slice(0,4).map(({booking,conversion})=><div key={booking.id} className="flex min-w-0 items-center gap-2"><span className={`size-2 shrink-0 rounded-full ${conversion.status==='converted'?'bg-emerald-500':conversion.status==='upcoming'?'bg-sky-500':'bg-amber-400'}`}/><div className="min-w-0"><p className="truncate text-[10px] font-bold">{booking.fullName}</p><p className="text-[9px] text-slate-400">{booking.appointmentDate} · {conversion.status==='converted'?'Converted':conversion.status==='upcoming'?'Upcoming':'Awaiting conversion'}</p></div></div>)}
          </div>
        </article>
      </section>
      <footer className="flex shrink-0 items-center justify-between pb-1 text-[9px] text-slate-400"><span>TENROUNDS Growth Cockpit · One-page owner view</span><span>Bookings: TENROUNDS DB · Search: Search Console · Visitors: Vercel snapshot · GA4 API credentials pending</span></footer>
    </div>
  </main>
}
