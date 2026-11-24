import type { Metadata } from 'next'
import { and, gte, lt, desc } from 'drizzle-orm'
import Link from 'next/link'
import { db } from '@/lib/db'
import { trialBookings, membershipSignups, sessionPurchases } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { OperationsLogin } from '@/components/operations/operations-login'
import {
  buildSignupEmailIndex,
  buildSessionPurchaseEmailIndex,
  getTrialConversion,
  ymdInJohannesburg,
} from '@/lib/trial-conversion'

export const metadata: Metadata = {
  title: 'TENROUNDS | Growth Cockpit',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const MONTHS = [
  { key: '2026-09', label: 'September', seo: { clicks: 165, impressions: 5148, ctr: 3.21, position: 12.75 } },
  { key: '2026-10', label: 'October', seo: { clicks: 176, impressions: 4905, ctr: 3.59, position: 10.39 } },
  { key: '2026-11', label: 'November', seo: { clicks: 202, impressions: 4592, ctr: 4.40, position: 9.06 } },
]

function monthKey(value: Date | string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit' }).format(date).slice(0, 7)
}
function money(value: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value)
}
function change(current: number, previous: number) {
  if (!previous) return null
  const value = ((current - previous) / previous) * 100
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}
function Trend({ value, inverse = false }: { value: string | null; inverse?: boolean }) {
  if (!value) return <span className="text-xs text-slate-400">No comparison</span>
  const positive = value.startsWith('+')
  const good = inverse ? !positive : positive
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{value}</span>
}
function Bar({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  return <div className="grid grid-cols-[86px_1fr_64px] items-center gap-3">
    <span className="text-xs font-semibold text-slate-500">{label}</span>
    <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#00AEEF]" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></div>
    <span className="text-right text-xs font-extrabold tabular-nums text-[#102A43]">{value.toLocaleString('en-ZA')}{suffix}</span>
  </div>
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
    const monthTrials = cohort.filter(row => monthKey(row.booking.createdAt) === month.key)
    const monthSignups = allSignups.filter(row => monthKey(row.createdAt) === month.key)
    const converted = monthTrials.filter(row => row.conversion.status === 'converted').length
    const completed = monthTrials.filter(row => row.conversion.status !== 'upcoming')
    return {
      ...month,
      bookings: monthTrials.length,
      signups: monthSignups.length,
      converted,
      eligible: completed.length,
      conversionRate: completed.length ? Math.round((converted / completed.length) * 100) : 0,
      feeValue: monthSignups.reduce((sum, row) => sum + (row.monthlyFee || 0), 0),
    }
  })

  const current = monthly[2]
  const previous = monthly[1]
  const latestTrials = allTrials.slice(0, 6)
  const maxClicks = Math.max(...monthly.map(m => m.seo.clicks))
  const maxBookings = Math.max(1, ...monthly.map(m => m.bookings))
  const nowLabel = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())

  return <main className="min-h-screen bg-[#F4F7FA] text-[#102A43]">
    <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-7 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#102A43] text-lg font-black text-white shadow-lg shadow-slate-300">10<span className="text-[#00AEEF]">.</span></div>
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#008FC4]">TENROUNDS / OWNER VIEW</p><p className="text-sm font-semibold text-slate-500">Growth Cockpit</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">Updated {nowLabel}</span>
          <Link href="/operations" className="rounded-xl bg-[#102A43] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#17496B]">Operations ↗</Link>
        </div>
      </header>

      <section className="relative mt-7 overflow-hidden rounded-[30px] bg-[#102A43] p-7 text-white shadow-xl shadow-slate-300/50 sm:p-10">
        <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[48px] border-white/[.045]" />
        <div className="absolute -bottom-44 right-44 h-80 w-80 rounded-full border-[36px] border-[#00AEEF]/10" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#FFE36E]"><span className="h-1.5 w-1.5 rounded-full bg-[#FFE36E]" /> The business at a glance</span>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">Turn attention<br/><span className="text-[#00AEEF]">into trials.</span><br/>Turn trials into members.</h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">One clear view of website demand, trial bookings and the people who go on to become members. No vanity metrics. No mystery maths.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">November trial bookings</p><p className="mt-3 text-4xl font-black">{current.bookings}</p><p className="mt-1 text-xs text-slate-300">From existing booking records</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Matched conversions</p><p className="mt-3 text-4xl font-black text-[#FFE36E]">{current.converted}</p><p className="mt-1 text-xs text-slate-300">After the booked trial date</p></div>
            <div className="col-span-2 rounded-2xl bg-[#00AEEF] p-4 text-[#062B42]"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider">November conversion rate</p><p className="mt-2 text-4xl font-black">{current.conversionRate}%</p></div><p className="max-w-[180px] text-right text-xs font-semibold leading-5">Of trial bookings with a date that has passed</p></div></div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#008FC4]">01 / Month-on-month performance</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Are we actually improving?</h2><p className="mt-1 text-sm text-slate-500">Three-month view. November is month-to-date through 23 November.</p></div><span className="rounded-full bg-white px-3 py-2 text-[10px] font-bold text-slate-500 shadow-sm">September → October → November</span></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {monthly.map((m, i) => <article key={m.key} className={`rounded-[24px] border p-5 shadow-sm ${i === 2 ? 'border-[#00AEEF]/40 bg-[#EAF8FD]' : 'border-white bg-white'}`}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-black">{m.label}</h3>{i === 2 ? <span className="rounded-full bg-[#102A43] px-2.5 py-1 text-[10px] font-bold text-white">MONTH TO DATE</span> : <span className="text-[10px] font-semibold text-slate-400">FULL MONTH</span>}</div>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search clicks</p><p className="mt-1 text-3xl font-black">{m.seo.clicks}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Impressions</p><p className="mt-1 text-3xl font-black">{m.seo.impressions.toLocaleString('en-ZA')}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Click-through rate</p><p className="mt-1 text-2xl font-extrabold">{m.seo.ctr.toFixed(2)}%</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg. Google position</p><p className="mt-1 text-2xl font-extrabold">{m.seo.position.toFixed(1)}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trial bookings</p><p className="mt-1 text-2xl font-extrabold">{m.bookings}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Matched conversions</p><p className="mt-1 text-2xl font-extrabold text-[#008FC4]">{m.converted}</p></div>
            </div>
            <div className="mt-5 border-t border-slate-200/80 pt-4"><div className="flex justify-between text-xs"><span className="font-semibold text-slate-500">Trial conversion</span><span className="font-black">{m.conversionRate}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#00AEEF]" style={{ width: `${m.conversionRate}%` }} /></div></div>
          </article>)}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold">Google organic clicks</h3><p className="text-xs text-slate-500">Same 1st–23rd day window for each month, so the comparison is fair.</p></div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search Console</span></div>
          <div className="mt-5 space-y-4">{monthly.map(m => <Bar key={m.key} label={m.label} value={m.seo.clicks} max={maxClicks} />)}</div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Clicks rose from 165 in September to 176 in October and 202 in November. Average position improved from 12.75 to 10.39 to 9.06. Impressions eased, while CTR improved. This is a positive organic-search trend, not proof that website sessions or memberships rose.</p>
        </div>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[24px] bg-white p-6 shadow-sm sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#008FC4]">02 / Trial-to-member journey</p><h2 className="mt-2 text-2xl font-black">The people behind the numbers</h2><p className="mt-2 text-sm leading-6 text-slate-500">A booking is treated as attended. A conversion is counted when the same email has a membership signup or qualifying paid session purchase after the booked trial appointment.</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#102A43] p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Booked</p><p className="mt-2 text-3xl font-black">{allTrials.length}</p><p className="mt-1 text-[10px] text-slate-300">All-time</p></div>
            <div className="rounded-2xl bg-[#EAF8FD] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Converted</p><p className="mt-2 text-3xl font-black">{cohort.filter(x => x.conversion.status === 'converted').length}</p><p className="mt-1 text-[10px] text-slate-500">Matched after trial</p></div>
            <div className="rounded-2xl bg-[#FFF7D6] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Not converted</p><p className="mt-2 text-3xl font-black">{cohort.filter(x => x.conversion.status === 'not_converted').length}</p><p className="mt-1 text-[10px] text-slate-500">Trial date passed</p></div>
          </div>
          <div className="mt-6"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold">Latest trial bookings</h3><Link href="/operations" className="text-xs font-bold text-[#008FC4] hover:underline">Open Operations ↗</Link></div>
            <div className="divide-y divide-slate-100">{latestTrials.map(b => {
              const result = cohort.find(x => x.booking.id === b.id)?.conversion
              return <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{b.fullName}</p><p className="text-xs text-slate-400">{b.email} · {b.appointmentDate}</p></div><span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${result?.status === 'converted' ? 'bg-emerald-50 text-emerald-700' : result?.status === 'upcoming' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>{result?.status === 'converted' ? 'Converted' : result?.status === 'upcoming' ? 'Upcoming' : 'Not converted yet'}</span></div>
            })}</div>
          </div>
        </div>
        <div className="rounded-[24px] bg-[#102A43] p-6 text-white shadow-sm sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#FFE36E]">03 / Website analytics health</p><h2 className="mt-2 text-2xl font-black">We need to fix the measuring tape.</h2>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.07] p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-300">GA4 sessions · September</span><span className="text-sm font-black">No data</span></div><div className="mt-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-300">GA4 sessions · October</span><span className="text-sm font-black">No data</span></div><div className="mt-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-300">GA4 sessions · November 1–23</span><span className="text-sm font-black text-[#FFE36E]">6</span></div><p className="mt-3 text-xs text-slate-400">November also shows 4 users and 12 page views in the connected GA4 property.</p></div>
          <p className="mt-4 text-sm leading-6 text-slate-300">The GA4 connection works, but the data does not look like real website traffic. Only standard events appear. We have not seen trial CTA or completed-booking events in the September–November report.</p>
          <div className="mt-5 rounded-xl bg-[#FFE36E] p-4 text-[#102A43]"><p className="text-xs font-black uppercase tracking-wider">Action required</p><p className="mt-1 text-sm font-semibold leading-5">Test the live site with Tag Assistant and GA4 Realtime after accepting analytics preferences. Confirm that page_view, trial_cta_click and trial_success arrive in property 338885680.</p></div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-[22px] border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#008FC4]">SEO</p><h3 className="mt-2 text-lg font-black">More searchers are choosing us</h3><p className="mt-2 text-sm leading-6 text-slate-500">Clicks and average ranking position improved across the three comparable 23-day windows. Next, focus on the queries and pages that bring qualified local prospects.</p></article>
        <article className="rounded-[22px] border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#008FC4]">Conversion</p><h3 className="mt-2 text-lg font-black">Follow the booking email</h3><p className="mt-2 text-sm leading-6 text-slate-500">Use the booking email to identify the subsequent membership signup or qualifying paid pack. No attendance admin and no duplicate records.</p></article>
        <article className="rounded-[22px] border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#008FC4]">Paid marketing</p><h3 className="mt-2 text-lg font-black">Connect cost to outcomes</h3><p className="mt-2 text-sm leading-6 text-slate-500">Google Ads currently returns no campaign rows. Meta history currently stops in June. We'll show cost per trial and member only once the correct active accounts are confirmed.</p></article>
      </section>

      <footer className="flex flex-wrap justify-between gap-3 py-8 text-[11px] text-slate-400"><span>TENROUNDS Growth Cockpit · Owner-led reporting · Manual refresh</span><span>SEO data: Search Console · 1st–23rd of each month · Checked 24 Nov 2026</span></footer>
    </div>
  </main>
}
