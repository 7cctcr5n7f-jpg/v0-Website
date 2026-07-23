'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, Minus, Trash2, Droplets } from 'lucide-react'
import { adjustWaterCredit, addWaterMember, deleteWaterMember } from '@/app/actions/operations'
import type { WaterCredit } from '@/lib/db/schema'

export function WaterTab({ credits }: { credits: WaterCredit[] }) {
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [addPending, setAddPending] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return credits.filter((c) => !q || c.memberName.toLowerCase().includes(q))
  }, [credits, query])

  async function handleAddMember() {
    if (!newName.trim()) return
    setAddPending(true)
    const fd = new FormData()
    fd.set('memberName', newName.trim())
    await addWaterMember(fd)
    setNewName('')
    setAddPending(false)
  }

  return (
    <div>
      {/* Search + add */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-light-grey" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search member…"
            className="w-full rounded-lg border border-steel bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-light-grey focus:border-neon-blue"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddMember()
            }}
            placeholder="New member name…"
            className="w-44 rounded-lg border border-steel bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-light-grey focus:border-neon-green"
          />
          <button
            type="button"
            onClick={handleAddMember}
            disabled={addPending || !newName.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-neon-green px-4 py-2.5 text-sm font-semibold text-neon-green transition-colors hover:bg-neon-green/10 disabled:opacity-50"
          >
            <Plus className="size-4" /> Add
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs uppercase tracking-wide text-light-grey">
        {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-steel p-10 text-center text-sm text-light-grey">
          No members yet. Add a member above to start tracking water credits.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <WaterCard key={c.id} credit={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function WaterCard({ credit }: { credit: WaterCredit }) {
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)

  async function adjust(sign: 1 | -1) {
    const amount = parseFloat(delta) || 1
    setPending(true)
    const fd = new FormData()
    fd.set('memberName', credit.memberName)
    fd.set('delta', String(sign * amount))
    fd.set('note', note.trim())
    await adjustWaterCredit(fd)
    setDelta('')
    setNote('')
    setPending(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove ${credit.memberName} from water credits?`)) return
    const fd = new FormData()
    fd.set('id', String(credit.id))
    await deleteWaterMember(fd)
  }

  const balanceColor =
    credit.balance > 0 ? 'text-neon-green' : credit.balance < 0 ? 'text-red-400' : 'text-light-grey'

  return (
    <div className="rounded-2xl border border-steel bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-steel bg-background">
            <Droplets className={`size-5 ${balanceColor}`} />
          </div>
          <div>
            <p className="font-semibold text-foreground">{credit.memberName}</p>
            <p className={`text-xl font-black tabular-nums ${balanceColor}`}>
              {credit.balance > 0 ? '+' : ''}{credit.balance}
              <span className="ml-1 text-xs font-normal text-light-grey">credits</span>
            </p>
          </div>
        </div>
        <form action={deleteWaterMember}>
          <input type="hidden" name="id" value={credit.id} />
          <button
            type="submit"
            onClick={(e) => { if (!confirm(`Remove ${credit.memberName}?`)) e.preventDefault() }}
            className="rounded p-1.5 text-light-grey transition-colors hover:text-red-400"
            aria-label="Remove member"
          >
            <Trash2 className="size-4" />
          </button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="Amount"
          min="1"
          className="w-24 rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-neon-blue"
          aria-label="Credit amount"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="flex-1 rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-light-grey focus:border-neon-blue"
        />
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-neon-green/15 px-3 py-2 text-sm font-bold text-neon-green transition-colors hover:bg-neon-green/25 disabled:opacity-50"
          aria-label="Add credit"
        >
          <Plus className="size-4" /> Credit
        </button>
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-2 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
          aria-label="Deduct credit"
        >
          <Minus className="size-4" /> Use
        </button>
      </div>
    </div>
  )
}
