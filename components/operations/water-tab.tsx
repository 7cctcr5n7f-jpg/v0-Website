'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, Droplets, ChevronDown, ChevronRight } from 'lucide-react'
import { adjustWaterCredit, addWaterMember, deleteWaterMember } from '@/app/actions/operations'
import type { WaterCredit, WaterAuditLog } from '@/lib/db/schema'

interface Props {
  credits: WaterCredit[]
  auditLog: WaterAuditLog[]
}

export function WaterTab({ credits, auditLog }: Props) {
  const [newName, setNewName] = useState('')
  const [addPending, setAddPending] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  async function handleAddMember() {
    if (!newName.trim()) return
    setAddPending(true)
    const fd = new FormData()
    fd.set('memberName', newName.trim())
    await addWaterMember(fd)
    setNewName('')
    setAddPending(false)
    setShowAdd(false)
  }

  if (credits.length === 0 && !showAdd) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-xs text-light-grey">No members yet.</p>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg border border-neon-green px-3 py-1.5 text-xs font-semibold text-neon-green hover:bg-neon-green/10"
        >
          <Plus className="size-3.5" /> Add member
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Add new member row */}
      {showAdd ? (
        <div className="flex gap-1.5 rounded-lg border border-neon-green/40 bg-background p-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddMember()
              if (e.key === 'Escape') setShowAdd(false)
            }}
            placeholder="Member name…"
            autoFocus
            className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-light-grey"
          />
          <button
            type="button"
            onClick={handleAddMember}
            disabled={addPending || !newName.trim()}
            className="rounded px-2 py-1 text-[10px] font-bold text-neon-green transition-colors hover:bg-neon-green/10 disabled:opacity-50"
          >
            {addPending ? '…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => { setShowAdd(false); setNewName('') }}
            className="rounded px-2 py-1 text-[10px] text-light-grey hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 self-end rounded-md border border-dashed border-steel px-2 py-1 text-[10px] text-light-grey transition-colors hover:border-neon-green hover:text-neon-green"
        >
          <Plus className="size-3" /> Add
        </button>
      )}

      {/* Member rows */}
      <div className="space-y-1">
        {credits.map((c) => {
          const log = auditLog.filter((l) => l.creditId === c.id)
          return <WaterRow key={c.id} credit={c} log={log} />
        })}
      </div>
    </div>
  )
}

function WaterRow({ credit: c, log }: { credit: WaterCredit; log: WaterAuditLog[] }) {
  const [expanded, setExpanded] = useState(false)
  const [showCreditForm, setShowCreditForm] = useState(false)
  const [amount, setAmount] = useState('1')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)

  const balanceColor =
    c.balance > 0 ? 'text-neon-green' : c.balance < 0 ? 'text-red-400' : 'text-light-grey'

  async function deductOne() {
    setPending(true)
    const fd = new FormData()
    fd.set('memberName', c.memberName)
    fd.set('delta', '-1')
    fd.set('note', '')
    await adjustWaterCredit(fd)
    setPending(false)
  }

  async function addCredits() {
    const amt = parseFloat(amount) || 1
    setPending(true)
    const fd = new FormData()
    fd.set('memberName', c.memberName)
    fd.set('delta', String(amt))
    fd.set('note', note.trim())
    await adjustWaterCredit(fd)
    setAmount('1')
    setNote('')
    setShowCreditForm(false)
    setPending(false)
  }

  return (
    <div className="rounded-xl border border-steel/60 bg-background">
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mr-0.5 text-light-grey"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>

        <Droplets className={`size-3.5 shrink-0 ${balanceColor}`} />

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 text-left text-xs font-semibold text-foreground hover:text-neon-blue"
        >
          {c.memberName}
        </button>

        <span className={`tabular-nums text-sm font-black ${balanceColor}`}>
          {c.balance > 0 ? '+' : ''}{c.balance}
        </span>

        {/* Use button — 1-click deduct */}
        <button
          type="button"
          onClick={deductOne}
          disabled={pending}
          className="rounded-md bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
          aria-label={`Use 1 credit for ${c.memberName}`}
        >
          Use
        </button>

        {/* + Credit toggle */}
        <button
          type="button"
          onClick={() => { setShowCreditForm((v) => !v); setExpanded(true) }}
          className="rounded-md bg-neon-green/15 px-2 py-1 text-[10px] font-bold text-neon-green transition-colors hover:bg-neon-green/25"
          aria-label={`Add credit for ${c.memberName}`}
        >
          + Credit
        </button>

        {/* Delete */}
        <form action={deleteWaterMember}>
          <input type="hidden" name="id" value={c.id} />
          <button
            type="submit"
            onClick={(e) => { if (!confirm(`Remove ${c.memberName}?`)) e.preventDefault() }}
            className="rounded p-1 text-light-grey transition-colors hover:text-red-400"
            aria-label="Remove member"
          >
            <Trash2 className="size-3" />
          </button>
        </form>
      </div>

      {/* Add credit form (shown when + Credit clicked) */}
      {showCreditForm && (
        <div className="flex gap-1.5 border-t border-steel/40 px-3 py-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            className="w-14 rounded border border-steel bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-neon-green"
            aria-label="Amount to credit"
            autoFocus
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addCredits() }}
            placeholder="Note (optional)"
            className="flex-1 rounded border border-steel bg-card px-2 py-1 text-xs text-foreground outline-none placeholder:text-light-grey focus:border-neon-green"
          />
          <button
            type="button"
            onClick={addCredits}
            disabled={pending}
            className="rounded bg-neon-green/20 px-2.5 py-1 text-[10px] font-bold text-neon-green disabled:opacity-50"
          >
            {pending ? '…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => setShowCreditForm(false)}
            className="rounded px-2 py-1 text-[10px] text-light-grey hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* History */}
      {expanded && log.length > 0 && (
        <div className="border-t border-steel/40 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-light-grey">History</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${entry.delta > 0 ? 'text-neon-green' : 'text-red-400'}`}>
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                  </span>
                  {entry.note && <span className="text-light-grey">{entry.note}</span>}
                </div>
                <span className="shrink-0 text-[10px] text-mid-grey">
                  {new Date(entry.createdAt).toLocaleDateString('en-ZA', {
                    day: '2-digit',
                    month: 'short',
                    timeZone: 'Africa/Johannesburg',
                  })}{' '}
                  {new Date(entry.createdAt).toLocaleTimeString('en-ZA', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Africa/Johannesburg',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {expanded && log.length === 0 && (
        <div className="border-t border-steel/40 px-3 py-2 text-xs text-light-grey">No history yet.</div>
      )}
    </div>
  )
}
