import type { Metadata } from 'next'
import { and, gte, lt, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { trialBookings, membershipSignups } from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { OperationsLogin } from '@/components/operations/operations-login'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'TENROUNDS KPI | Growth Cockpit',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

function money(value: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value)
}

function monthStartJhb() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find(p => p.type === 'year')?.value ?? '2026'
  const month = parts.find(p => p.type === 'month')?.value ?? '01'
  return new Date(`${year}-${month}-01T00:00:00+02:00`)
}

export default async function KpiPage() {
  if (!(await isOperationsAuthed())) return <OperationsLogin />

  const start = monthStartJhb()
  const next = new Date(start)
  next.setMonth(next.getMonth() + 1)

  const [bookings, signups, allTrials] = await Promise.all([
    db.select().from(trialBookings)
      .where(and(gte(trialBookings.createdAt, start), lt(trialBookings.createdAt, next)))
      .orderBy(desc(trialBookings.createdAt)),
    db.select().from(membershipSignups)
      .where(and(gte(membershipSignups.createdAt, start), lt(membershipSignups.createdAt, next)))
      .orderBy(desc(membershipSignups.createdAt)),
    db.select().from(trialBookings),
  ])

  const converted = allTrials.filter(t => t.manuallyConverted).length
  const monthlyContractValue = signups.reduce((sum, s) => sum + (s.monthlyFee || 0), 0)
  const monthLabel = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric', timeZone: 'Africa/Johannesburg' }).format(start)

  const cards = [
    { label: 'Trial bookings', value: String(bookings.length), note: 'Bookings created this month', source: 'Website trial_bookings' },
    { label: 'New signups', value: String(signups.length), note: 'Signup submissions this month, not verified active memberships', source: 'Website membership_signups' },
    { label: 'Manually marked converted', value: String(converted), note: 'All-time trials flagged as converted in Operations', source: 'trial_bookings.manually_converted' },
    { label: 'New signup monthly fees', value: money(monthlyContractValue), note: 'Sum of monthly fees on this month’s signup submissions. Not cash collected or recognised revenue.', source: 'membership_signups.monthly_fee' },
  ]

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">TENROUNDS · GROWTH COCKPIT</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Business performance</h1>
            <p className="mt-2 text-sm text-slate-500">Owner-led KPI dashboard · {monthLabel}</p>
          </div>
          <Link href="/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-slate-50">Open Operations →</Link>
        </header>

        <section className="mb-6 rounded-3xl bg-[#101c2c] p-6 text-white sm:flex sm:items-center sm:justify-between sm:p-9">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">2027 growth target</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">R150,000 monthly revenue</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">The dashboard reads the existing website records. It does not create duplicate customer records or run autonomous agents.</p>
          </div>
          <div className="mt-6 text-5xl font-black tracking-tight text-yellow-300 sm:mt-0">R150K<span className="block text-right text-xs font-bold tracking-[.2em] text-slate-300">PER MONTH</span></div>
        </section>

        <div className="mb-4">
          <h2 className="text-lg font-extrabold">Verified source metrics</h2>
          <p className="mt-1 text-sm text-slate-500">Each metric explains exactly what the underlying records do and do not prove.</p>
        </div>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(card => (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">{card.label}</p>
              <p className="mt-4 text-3xl font-black tracking-tight">{card.value}</p>
              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{card.note}</p>
              <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] font-bold uppercase tracking-wider text-blue-700">Source: {card.source}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Recent trial bookings</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">Latest booking records created during {monthLabel}.</p>
            {bookings.length ? <div className="divide-y divide-slate-100">{bookings.slice(0, 8).map(b => <div key={b.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{b.fullName}</p><p className="text-xs text-slate-500">{b.email}</p></div><div className="text-right text-xs text-slate-500">{b.appointmentDate}<p>{b.appointmentTime}</p></div></div>)}</div> : <p className="py-6 text-sm text-slate-500">No trial bookings recorded this month.</p>}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Recent membership signups</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">Signup submissions, not proof of successful debit orders or active memberships.</p>
            {signups.length ? <div className="divide-y divide-slate-100">{signups.slice(0, 8).map(s => <div key={s.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{s.firstName} {s.surname}</p><p className="text-xs text-slate-500">{s.accessType || s.membershipType} · {s.contractLength} months</p></div><div className="text-right text-xs text-slate-500">{money(s.monthlyFee || 0)}<p>{s.status}</p></div></div>)}</div> : <p className="py-6 text-sm text-slate-500">No signup submissions recorded this month.</p>}
          </article>
        </section>

        <aside className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <strong>Data limitations to resolve before treating this as a full revenue dashboard.</strong>
          The website currently records trial bookings and a manual conversion flag, but the trial schema does not contain a verified attendance field. Signup records are not payment receipts. Active-member counts, cancellations, collected revenue, website analytics and attendance need their proper source integrations before those KPIs can be reported accurately.
        </aside>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400"><span>Manual, on-demand reporting. No background agent loops or scheduled workers.</span><Link href="/operations" className="font-bold text-blue-700">Back to Operations</Link></footer>
      </div>
    </main>
  )
}
