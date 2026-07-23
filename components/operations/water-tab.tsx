'use client'

import { useState, useTransition } from 'react'
import { Droplets, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { adjustWaterCredit, addWaterMember, deleteWaterMember, setWaterBalance } from '@/app/actions/operations'
import type { WaterCredit, WaterAuditLog } from '@/lib/db/schema'

interface Props {
  credits: WaterCredit[]
  auditLog: WaterAuditLog[]
}

export function WaterTab({ credits, auditLog }: Props) {
  const [showManage, setShowManage] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  function deductOne(credit: WaterCredit) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('memberName', credit.memberName)
      fd.set('delta', '-1')
      fd.set('note', '')
      await adjustWaterCredit(fd)
    })
  }

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div>
      {/* Header with Manage link */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-neon-blue/15">
            <Droplets className="size-3.5 text-neon-blue" />
          </div>
          <span className="text-xs font-bold text-foreground">Water Tracker</span>
        </div>
        <button
          type="button"
          onClick={() => setShowManage(true)}
          className="text-xs font-semibold text-neon-blue transition-colors hover:text-neon-blue/70"
        >
          Manage
        </button>
      </div>

      {/* Member list */}
      {credits.length === 0 ? (
        <p className="py-3 text-center text-xs text-light-grey">No members yet — tap Manage to add.</p>
      ) : (
        <div className="space-y-2">
          {credits.map((c) => {
            const memberLog = auditLog.filter((l) => l.creditId === c.id)
            const isExpanded = expandedId === c.id
            const isNegative = c.balance < 0

            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-steel/60 bg-card">
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Name — click to expand history */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.id)}
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="text-sm font-semibold text-foreground">{c.memberName}</span>
                    <span className={`text-[11px] ${isNegative ? 'text-red-400' : 'text-light-grey'}`}>
                      {c.balance} {c.balance === 1 ? 'bottle' : 'bottles'} remaining
                    </span>
                  </button>

                  {/* Balance badge */}
                  <div
                    className={`flex min-w-[2.75rem] items-center justify-center rounded-xl px-2.5 py-2 text-sm font-black tabular-nums ${
                      isNegative
                        ? 'bg-red-500/15 text-red-400'
                        : c.balance === 0
                        ? 'bg-steel/50 text-light-grey'
                        : 'bg-neon-green/15 text-neon-green'
                    }`}
                  >
                    {c.balance}
                  </div>

                  {/* Minus button */}
                  <button
                    type="button"
                    onClick={() => deductOne(c)}
                    disabled={pending}
                    className="flex size-9 items-center justify-center rounded-xl border border-steel/80 bg-background text-lg font-bold text-light-grey transition-colors hover:border-red-400/60 hover:text-red-400 disabled:opacity-40"
                    aria-label={`Use 1 bottle for ${c.memberName}`}
                  >
                    &minus;
                  </button>
                </div>

                {/* Expandable history */}
                {isExpanded && (
                  <div className="border-t border-steel/40 bg-background/50 px-4 py-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-mid-grey">History</p>
                    {memberLog.length === 0 ? (
                      <p className="text-xs text-light-grey">No history yet.</p>
                    ) : (
                      <div className="max-h-44 space-y-1.5 overflow-y-auto">
                        {memberLog.map((entry) => {
                          const d = new Date(entry.createdAt)
                          return (
                            <div key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-8 font-bold tabular-nums ${entry.delta > 0 ? 'text-neon-green' : 'text-red-400'}`}
                                >
                                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                                </span>
                                {entry.note && entry.note !== 'manual adjust' && (
                                  <span className="text-light-grey">{entry.note}</span>
                                )}
                              </div>
                              <span className="shrink-0 text-[11px] text-mid-grey">
                                {d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', timeZone: 'Africa/Johannesburg' })}{' '}
                                {d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' })}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Manage Modal */}
      {showManage && (
        <ManageModal
          credits={credits}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  )
}

function ManageModal({ credits, onClose }: { credits: WaterCredit[]; onClose: () => void }) {
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState(0)
  const [addPending, startAdd] = useTransition()
  const [setPending, startSet] = useTransition()

  function handleAdd() {
    if (!newName.trim()) return
    startAdd(async () => {
      const fd = new FormData()
      fd.set('memberName', newName.trim())
      await addWaterMember(fd)
      // If qty > 0, also credit that amount
      if (newQty > 0) {
        const fd2 = new FormData()
        fd2.set('memberName', newName.trim())
        fd2.set('delta', String(newQty))
        fd2.set('note', 'initial credit')
        await adjustWaterCredit(fd2)
      }
      setNewName('')
      setNewQty(0)
    })
  }

  function handleSetBalance(credit: WaterCredit, val: number) {
    startSet(async () => {
      const fd = new FormData()
      fd.set('id', String(credit.id))
      fd.set('balance', String(val))
      await setWaterBalance(fd)
    })
  }

  function handleDelete(credit: WaterCredit) {
    if (!confirm(`Remove ${credit.memberName}?`)) return
    startSet(async () => {
      const fd = new FormData()
      fd.set('id', String(credit.id))
      await deleteWaterMember(fd)
    })
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-steel bg-card shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-steel px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-neon-blue/15">
              <Droplets className="size-4 text-neon-blue" />
            </div>
            <h2 className="font-display text-base font-black uppercase tracking-tight text-foreground">
              Manage Water Tracker
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-light-grey transition-colors hover:bg-steel/40 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-4">
          {/* Add new member */}
          <p className="mb-2.5 text-xs font-bold text-foreground">Add New Member</p>
          <div className="mb-5 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd() }}
              placeholder="Member name"
              autoFocus
              className="flex-1 rounded-xl border border-steel bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-mid-grey focus:border-neon-blue"
            />
            {/* Qty spinner */}
            <div className="flex items-center rounded-xl border border-steel bg-background">
              <span className="px-2.5 text-sm text-foreground tabular-nums w-10 text-center">{newQty}</span>
              <div className="flex flex-col border-l border-steel">
                <button
                  type="button"
                  onClick={() => setNewQty((v) => v + 1)}
                  className="flex h-5 w-7 items-center justify-center border-b border-steel text-light-grey hover:text-foreground"
                  aria-label="Increase qty"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setNewQty((v) => Math.max(0, v - 1))}
                  className="flex h-5 w-7 items-center justify-center text-light-grey hover:text-foreground"
                  aria-label="Decrease qty"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={addPending || !newName.trim()}
              className="flex size-11 items-center justify-center rounded-xl bg-neon-blue text-white transition-opacity hover:opacity-80 disabled:opacity-40"
              aria-label="Add member"
            >
              <Plus className="size-5" />
            </button>
          </div>

          {/* Members list */}
          <p className="mb-2.5 text-xs font-bold text-foreground">Members</p>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {credits.length === 0 ? (
              <p className="text-xs text-light-grey">No members yet.</p>
            ) : (
              credits.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-steel/60 bg-background px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{c.memberName}</p>
                    <p className="text-[11px] text-light-grey">{c.balance} {c.balance === 1 ? 'bottle' : 'bottles'}</p>
                  </div>
                  {/* Inline balance spinner */}
                  <div className="flex items-center rounded-xl border border-steel bg-card">
                    <span className="w-10 px-2 text-center text-sm font-bold tabular-nums text-foreground">{c.balance}</span>
                    <div className="flex flex-col border-l border-steel">
                      <button
                        type="button"
                        onClick={() => handleSetBalance(c, c.balance + 1)}
                        disabled={setPending}
                        className="flex h-5 w-7 items-center justify-center border-b border-steel text-light-grey hover:text-foreground disabled:opacity-40"
                        aria-label="Increase"
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetBalance(c, c.balance - 1)}
                        disabled={setPending}
                        className="flex h-5 w-7 items-center justify-center text-light-grey hover:text-foreground disabled:opacity-40"
                        aria-label="Decrease"
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </div>
                  </div>
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    disabled={setPending}
                    className="rounded-lg p-1.5 text-light-grey transition-colors hover:text-red-400 disabled:opacity-40"
                    aria-label={`Remove ${c.memberName}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
