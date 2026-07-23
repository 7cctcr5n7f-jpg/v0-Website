'use client'

import { useMemo, useState } from 'react'
import { Search, Phone, Mail } from 'lucide-react'
import type { MembershipSignup } from '@/lib/db/schema'

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-neon-blue/15 text-neon-blue',
  Processed: 'bg-amber-400/15 text-amber-400',
  Active: 'bg-neon-green/15 text-neon-green',
  Cancelled: 'bg-red-500/15 text-red-400',
}

export function MembersTab({ signups }: { signups: MembershipSignup[] }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Active')

  const statuses = ['All', 'Active', 'New', 'Processed', 'Cancelled']

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return signups.filter((s) => {
      const name = `${s.firstName} ${s.surname}`.toLowerCase()
      const matchQ = !q || name.includes(q) || s.email.toLowerCase().includes(q) || s.contactNumber.includes(q)
      const matchS = statusFilter === 'All' || s.status === statusFilter
      return matchQ && matchS
    })
  }, [signups, query, statusFilter])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-light-grey" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or phone"
            className="w-full rounded-lg border border-steel bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-light-grey focus:border-neon-blue"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-steel bg-card p-1 text-xs font-semibold uppercase tracking-wide">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={
                'rounded-md px-3 py-1.5 transition-colors ' +
                (statusFilter === s ? 'bg-neon-blue text-white' : 'text-light-grey hover:text-foreground')
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs uppercase tracking-wide text-light-grey">
        {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-steel p-10 text-center text-sm text-light-grey">
          No members found.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-steel">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-card text-xs uppercase tracking-wide text-light-grey">
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">Membership</th>
                <th className="hidden px-4 py-3 text-left font-semibold md:table-cell">Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="hidden px-4 py-3 text-left font-semibold lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-steel/60 align-middle">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{s.firstName} {s.surname}</p>
                    <p className="mt-0.5 text-xs text-light-grey sm:hidden">{s.accessType}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-light-grey sm:table-cell">
                    <p>{s.accessType}</p>
                    <p className="text-xs">R{s.monthlyFee}/mo</p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-light-grey hover:text-neon-blue">
                      <Mail className="size-3.5" /> {s.email}
                    </a>
                    <a href={`tel:${s.contactNumber}`} className="mt-0.5 flex items-center gap-1.5 text-light-grey hover:text-neon-blue">
                      <Phone className="size-3.5" /> {s.contactNumber}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[s.status] ?? 'bg-steel text-light-grey'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-light-grey lg:table-cell">
                    {new Date(s.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Johannesburg' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
