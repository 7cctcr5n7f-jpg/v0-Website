import type { Metadata } from 'next'
import { and, gte, lt, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { trialBookings, membershipSignups } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { OperationsLogin } from '@/components/operations/operations-login'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'TENROUNDS | Growth & Website Intelligence',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

function money(value: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value)
}
function monthStartJhb() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const year = parts.find(p => p.type === 'year')?.value ?? '2026'
  const month = parts.find(p => p.type === 'month')?.value ?? '01'
  return new Date(`${year}-${month}-01T00:00:00+02:00`)
}

function Metric({ label, value, detail, accent = 'blue' }: { label: string; value: string; detail: string; accent?: 'blue' | 'yellow' | 'white' }) {
  const color = accent === 'yellow' ? 'text-yellow-300' : accent === 'white' ? 'text-white' : 'text-sky-300'
  return <div className="border-l border-white/15 pl-4"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">{label}</p><p className={`mt-2 text-3xl font-black tracking-tight ${color}`}>{value}</p><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div>
}

function Opportunity({ number, title, evidence, action, impact, tag }: { number: string; title: string; evidence: string; action: string; impact: string; tag: string }) {
  return <article className="group grid gap-4 border-t border-slate-200 py-5 md:grid-cols-[52px_1fr_150px]">
    <div className="text-2xl font-black text-slate-300">{number}</div>
    <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-extrabold text-slate-900">{title}</h3><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-800">{tag}</span></div>
      <p className="mt-2 text-sm leading-6 text-slate-600"><strong className="text-slate-800">What the data says:</strong> {evidence}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600"><strong className="text-slate-800">Recommended move:</strong> {action}</p></div>
    <div className="self-center rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Why it matters</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{impact}</p></div>
  </article>
}

export default async function KpiPage() {
  if (!(await isOperationsAuthed())) return <OperationsLogin />
  const start = monthStartJhb()
  const next = new Date(start); next.setMonth(next.getMonth() + 1)
  const [bookings, signups, allTrials, allSignups] = await Promise.all([
    db.select().from(trialBookings).where(and(gte(trialBookings.createdAt, start), lt(trialBookings.createdAt, next))).orderBy(desc(trialBookings.createdAt)),
    db.select().from(membershipSignups).where(and(gte(membershipSignups.createdAt, start), lt(membershipSignups.createdAt, next))).orderBy(desc(membershipSignups.createdAt)),
    db.select().from(trialBookings),
    db.select().from(membershipSignups),
  ])
  const converted = allTrials.filter(t => t.manuallyConverted).length
  const signupEmails = new Set(allSignups.map(s => s.email.trim().toLowerCase()).filter(Boolean))
  const emailMatchedTrials = allTrials.filter(t => signupEmails.has(t.email.trim().toLowerCase())).length
  const uniqueTrialEmails = new Set(allTrials.map(t => t.email.trim().toLowerCase()).filter(Boolean)).size
  const matchedTrialRate = uniqueTrialEmails ? Math.round((emailMatchedTrials / uniqueTrialEmails) * 100) : 0
  const monthlyContractValue = signups.reduce((sum, s) => sum + (s.monthlyFee || 0), 0)
  const monthLabel = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric', timeZone: 'Africa/Johannesburg' }).format(start)
  const conversionRate = bookings.length ? Math.round((signups.length / bookings.length) * 100) : 0

  return <main className="min-h-screen bg-[#f4f6f8] text-[#102a43]">
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#102a43] text-sm font-black tracking-tight text-white">10</div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-sky-700">TENROUNDS / OWNER INTELLIGENCE</p><p className="text-sm font-bold text-slate-500">Growth & website performance</p></div></div>
        <div className="flex items-center gap-3"><span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">Updated on page load · {monthLabel}</span><Link href="/operations" className="rounded-full bg-[#102a43] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-sky-800">Operations ↗</Link></div>
      </header>

      <section className="relative mt-7 overflow-hidden rounded-[28px] bg-[#102a43] px-6 py-8 text-white sm:px-10 sm:py-11">
        <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full border-[52px] border-white/[.04]" />
        <div className="pointer-events-none absolute -bottom-36 right-24 h-72 w-72 rounded-full border-[36px] border-sky-300/[.08]" />
        <div className="relative grid gap-9 lg:grid-cols-[1.15fr_1fr] lg:items-end">
          <div><p className="text-[11px] font-black uppercase tracking-[.25em] text-yellow-300">The growth mission · 2027</p><h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">More trials.<br/><span className="text-sky-300">More members.</span><br/>More momentum.</h1><p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">The one job of this dashboard: turn local attention into free-trial bookings, then turn great first workouts into long-term members.</p></div>
          <div className="grid grid-cols-2 gap-6 border-t border-white/15 pt-6 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <Metric label="Monthly revenue ambition" value="R150K" detail="2027 target" accent="yellow"/>
            <Metric label="Trial-to-member aim" value="30–40%" detail="Your working conversion goal"/>
            <Metric label="This month's trial bookings" value={String(bookings.length)} detail="Website booking records" accent="white"/>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_35px_rgba(16,42,67,.05)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-700">01 / The conversion engine</p><h2 className="mt-2 text-2xl font-black tracking-tight">The journey we need to win</h2></div><span className="text-xs font-semibold text-slate-400">Website records · {monthLabel}</span></div>
          <div className="mt-7 grid gap-2 sm:grid-cols-4">
            {[{n:String(bookings.length),t:'Trial bookings',d:'People who submitted a booking'},{n:'—',t:'Attended',d:'Attendance is not yet captured here'},{n:String(signups.length),t:'Signup forms',d:'Membership submissions'},{n:money(monthlyContractValue),t:'Signup value',d:'Monthly fees submitted, not cash collected'}].map((x,i)=><div key={x.t} className={`relative min-h-[132px] rounded-2xl p-4 ${i===0?'bg-[#102a43] text-white':i===3?'bg-[#fff7d6] text-[#102a43]':'bg-slate-100 text-[#102a43]'}`}><p className="text-[10px] font-bold uppercase tracking-wider opacity-65">{x.t}</p><p className="mt-4 text-3xl font-black">{x.n}</p><p className="mt-1 text-[11px] leading-4 opacity-65">{x.d}</p></div>)}</div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3"><p className="text-xs leading-5 text-slate-500">Current booking-to-signup ratio is a directional comparison only. These records are not yet joined person-by-person, and signup forms do not confirm payment.</p><span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800">{conversionRate}% raw ratio</span></div>
        </div>
        <div className="rounded-[24px] bg-[#e8f5fb] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-800">02 / Measurement confidence</p><h2 className="mt-2 text-2xl font-black tracking-tight">Fix the instruments first.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">The connected GA4 property recorded only 4 sessions and 3 users in 28 days. A hostname breakdown shows 2 sessions on tenrounds.co.za and 2 on localhost test URLs. Only 7 page views and standard events were recorded, with no trial funnel events visible. This strongly suggests the reporting property or live tracking is not representing real site activity.</p>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/80 p-3"><span className="h-2.5 w-2.5 rounded-full bg-amber-500"/><div><p className="text-xs font-extrabold">Analytics tracking needs investigation</p><p className="text-[11px] text-slate-500">GA4 property, consent gating and page_view events</p></div></div>
          <p className="mt-4 text-xs leading-5 text-slate-600">Search Console clicks measure Google search visits to results, not confirmed website sessions. The gap is a warning to investigate, not proof of one specific fault.</p>
        </div>
      </section>

      <section className="mt-8 rounded-[24px] bg-[#102a43] p-6 text-white shadow-[0_8px_35px_rgba(16,42,67,.08)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">03 / Direction of travel · week on week</p><h2 className="mt-2 text-2xl font-black tracking-tight">Are we moving forward?</h2><p className="mt-2 text-sm text-slate-300">Google organic search · 16–22 Nov vs 9–15 Nov 2026</p></div><span className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-bold text-slate-200">Search Console · verified snapshot</span></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-4">
          {[{v:'67',p:'52',d:'+28.8%',l:'Organic clicks',good:true},{v:'1,222',p:'1,505',d:'−18.8%',l:'Impressions',good:false},{v:'5.48%',p:'3.46%',d:'+58.4%',l:'Organic CTR',good:true},{v:'9.68',p:'8.53',d:'Position worsened',l:'Average position',good:false}].map(x=><div key={x.l} className="rounded-2xl bg-white/[.07] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{x.l}</p><p className="mt-3 text-3xl font-black">{x.v}</p><p className="mt-2 text-xs text-slate-300">Previous week: {x.p}</p><p className={`mt-2 text-xs font-black ${x.good?'text-emerald-300':'text-amber-300'}`}>{x.d}</p></div>)}
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-300">More people clicked from Google this week and CTR improved, but search impressions fell and average ranking position slipped. The trend is mixed, not an across-the-board win. This is organic search data, not website visitor sessions.</p>
      </section>

      <section className="mt-8 rounded-[24px] bg-white p-6 shadow-[0_8px_35px_rgba(16,42,67,.05)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-700">04 / The golden conversion rate</p><h2 className="mt-2 text-2xl font-black tracking-tight">From visitor to member</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">The north-star metric is unique website visitors who become paying members. Target starting point: 0.5%. We will only calculate it once GA4 visitor counts and member outcomes are trustworthy.</p></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[{n:'Visitors',v:'Not reliable',d:'GA4 needs repair'},{n:'Trial bookings',v:String(allTrials.length),d:'All-time booking records'},{n:'Email-matched trials',v:String(emailMatchedTrials),d:'Booking email also appears on a membership signup'},{n:'Trial match rate',v:matchedTrialRate+'%',d:'All-time email match, not a timed cohort conversion'}].map((x,i)=><div key={x.n} className={`rounded-2xl p-4 ${i===3?'bg-[#fff7d6]':'bg-slate-100'}`}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{x.n}</p><p className="mt-3 text-2xl font-black text-[#102a43]">{x.v}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{x.d}</p></div>)}
        </div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950"><strong>Important:</strong> We can match booking emails to signup emails using existing records. This is a useful first conversion indicator, but it is not yet a precise trial-to-member rate because it does not enforce that the signup happened after the trial, and it cannot prove attendance. The booking table has a manual converted flag but no dedicated attendance field.</div>
      </section>

      <section className="mt-8 rounded-[24px] bg-white p-6 shadow-[0_8px_35px_rgba(16,42,67,.05)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-700">05 / Search demand & landing pages</p><h2 className="mt-2 text-2xl font-black tracking-tight">Earn the click. Then earn the trial.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">28-day Google Search Console snapshot checked 23 November 2026. Organic search only. These are prioritised tests, not automatic instructions to delete pages.</p></div><span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">SEO snapshot · 28 days</span></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[{v:'226',l:'Organic clicks',d:'+7.6% vs previous 28d'},{v:'5,621',l:'Impressions',d:'-4.3% vs previous 28d'},{v:'4.02%',l:'Organic CTR',d:'+12.4% vs previous 28d'},{v:'9.43',l:'Average position',d:'Google Search Console'}].map((x)=><div key={x.l} className="border-l-2 border-sky-400 pl-4"><p className="text-2xl font-black">{x.v}</p><p className="mt-1 text-xs font-bold text-slate-600">{x.l}</p><p className="mt-1 text-[10px] text-slate-400">{x.d}</p></div>)}
        </div>
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#f4f6f8] p-5"><p className="text-xs font-black uppercase tracking-wider text-slate-500">Biggest search opportunity</p><h3 className="mt-2 text-xl font-black">Make the 30-minute workout the hero.</h3><p className="mt-2 text-sm leading-6 text-slate-600">The homepage is the main brand destination. The strongest message should quickly explain coach-led 30-minute HIIT, boxing-inspired stations, no fixed class times, and the free first session. Don't let a generic “boxing gym” promise define the brand.</p></div>
          <div className="rounded-2xl bg-[#fff7d6] p-5"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Page strategy</p><h3 className="mt-2 text-xl font-black">Fewer, stronger landing pages.</h3><p className="mt-2 text-sm leading-6 text-slate-700">Keep a suburb or audience page only when it answers a distinct need with genuinely useful content. Consolidate thin near-duplicates into the best matching page and redirect retired URLs. Protect rankings and links before removing anything.</p></div>
        </div>
      </section>

      <section className="mt-8 rounded-[24px] bg-white p-6 shadow-[0_8px_35px_rgba(16,42,67,.05)] sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-700">06 / Owner's action list</p><h2 className="mt-2 text-2xl font-black tracking-tight">The moves most likely to unlock more trials</h2>
        <p className="mt-2 text-sm text-slate-500">Prioritised by measurement risk, search opportunity and proximity to the free-trial decision.</p>
        <div className="mt-5">
          <Opportunity number="01" title="Repair GA4 and trial conversion tracking" tag="Do first" evidence="Search Console reported 226 clicks while the connected GA4 property reported only 4 sessions over the same 28-day window." action="Verify the live measurement ID and property, consent behaviour, page_view events and a dedicated free_trial_booking conversion event. Test the complete journey." impact="Without reliable measurement we cannot tell which campaign, keyword or page creates trials."/>
          <Opportunity number="02" title="Make the free trial impossible to miss" tag="High impact" evidence="The goal is trial bookings, but the current analytics baseline cannot yet show CTA click-through or booking completion." action="Use one consistent, high-contrast “Book Your Free Trial” action above the fold, repeat it after the workout explanation and testimonials, and shorten the booking path." impact="Removes friction at the exact moment a visitor is ready to act."/>
          <Opportunity number="03" title="Rework the homepage around the real product" tag="Core message" evidence="TENROUNDS is a 30-minute coach-led HIIT gym with boxing-inspired stations, not a conventional boxing or sparring gym." action="Lead with the outcome and convenience. Show the 10-round experience, real members, what happens on a first visit, location, and the free trial." impact="Attracts the right people and filters out visitors expecting traditional boxing."/>
          <Opportunity number="04" title="Audit and consolidate SEO landing pages" tag="Protect rankings" evidence="Search Console shows several pages targeting overlapping gym/boxing/local terms. Search visibility alone does not prove those pages bring qualified prospects." action="Review each page's unique intent, clicks, impressions, backlinks, content quality and trial contribution. Keep, improve, merge or redirect based on evidence." impact="A smaller set of useful pages can focus authority and make the next step clearer."/>
          <Opportunity number="05" title="Turn proof into confidence" tag="Conversion lift" evidence="A first-time visitor needs to understand the atmosphere, coaching, workout and whether beginners are welcome." action="Add genuine member stories, short workout footage, coach introductions, FAQs, location/parking details and a clear “what to expect” section near the CTA." impact="Reduces uncertainty and gives hesitant visitors a reason to book now."/>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] bg-[#102a43] p-6 text-white sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">07 / Paid acquisition</p><h2 className="mt-2 text-2xl font-black">Buy attention only when it converts.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Paid CPC, spend, leads and cost per trial must come from Google Ads and Meta Ads reporting. They are deliberately not mixed with organic SEO metrics. No verified paid campaign figures are connected to this view yet.</p><div className="mt-5 rounded-xl border border-white/15 p-4"><p className="text-xs font-bold">Next measurement milestone</p><p className="mt-1 text-xs leading-5 text-slate-400">Connect ad spend and clicks, then calculate cost per booked trial and cost per new member. Scale only campaigns with a credible path to membership revenue.</p></div></div>
        <div className="rounded-[24px] bg-[#e8f5fb] p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-800">08 / Data still to connect</p><h2 className="mt-2 text-2xl font-black">A clear view, not made-up numbers.</h2><ul className="mt-4 space-y-3 text-sm leading-5 text-slate-700"><li>• GA4: visitors, sessions, channels, devices, locations and landing-page behaviour.</li><li>• Search Console: queries, clicks, impressions, CTR, positions and page metadata.</li><li>• Google Ads / Meta: spend, CPC, clicks, leads and campaign performance.</li><li>• Booking journey: CTA clicks, completed bookings and attendance.</li><li>• Membership outcomes: matched trial-to-member conversion and verified collected revenue.</li></ul><p className="mt-4 text-xs font-semibold text-sky-900">Refresh is manual/on-demand. No autonomous agents, cron jobs or background polling.</p></div>
      </section>

      <section className="mt-8 rounded-[24px] border border-slate-200 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-700">Live website records</p><h2 className="mt-2 text-xl font-black">This month's activity · {monthLabel}</h2></div><Link href="/operations" className="text-xs font-bold text-sky-800 hover:underline">Manage records in Operations ↗</Link></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Trial bookings</p><p className="mt-2 text-3xl font-black">{bookings.length}</p><p className="mt-1 text-[10px] text-slate-400">Created this month</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Membership submissions</p><p className="mt-2 text-3xl font-black">{signups.length}</p><p className="mt-1 text-[10px] text-slate-400">Not verified active memberships</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Submitted monthly fees</p><p className="mt-2 text-3xl font-black">{money(monthlyContractValue)}</p><p className="mt-1 text-[10px] text-slate-400">Not confirmed cash collected</p></div></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2"><div><h3 className="text-sm font-extrabold">Latest trial bookings</h3>{bookings.length ? <div className="mt-2 divide-y divide-slate-100">{bookings.slice(0,5).map(b=><div key={b.id} className="flex justify-between gap-3 py-2.5 text-xs"><div><p className="font-bold">{b.fullName}</p><p className="text-slate-400">{b.email}</p></div><span className="text-right text-slate-500">{b.appointmentDate}<br/>{b.appointmentTime}</span></div>)}</div> : <p className="mt-3 text-xs text-slate-400">No bookings recorded this month.</p>}</div><div><h3 className="text-sm font-extrabold">Latest membership submissions</h3>{signups.length ? <div className="mt-2 divide-y divide-slate-100">{signups.slice(0,5).map(s=><div key={s.id} className="flex justify-between gap-3 py-2.5 text-xs"><div><p className="font-bold">{s.firstName} {s.surname}</p><p className="text-slate-400">{s.accessType || s.membershipType} · {s.contractLength} months</p></div><span className="text-right text-slate-500">{money(s.monthlyFee || 0)}<br/>{s.status}</span></div>)}</div> : <p className="mt-3 text-xs text-slate-400">No signup submissions recorded this month.</p>}</div></div>
        <p className="mt-5 border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-400">Data note: trial bookings are not proof of attendance; signup submissions are not proof of payment or active membership. The displayed raw booking-to-signup ratio is not a person-matched conversion rate.</p>
      </section>
      <footer className="flex flex-wrap justify-between gap-3 py-8 text-[11px] text-slate-400"><span>TENROUNDS Growth Intelligence · Manual, owner-led reporting</span><span>Existing Operations and its records remain unchanged.</span></footer>
    </div>
  </main>
}
