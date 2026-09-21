'use client'

import { useState, useTransition, useMemo } from 'react'
import { Droplets, X, Plus, Minus, Trash2, ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react'
import { adjustWaterCredit, addWaterMember, deleteWaterMember, setWaterBalance } from '@/app/actions/operations'
import type { WaterCredit, WaterAuditLog } from '@/lib/db/schema'

interface Props {
  credits: WaterCredit[]
  auditLog: WaterAuditLog[]
}

type FilterType = 'all' | 'positive' | 'zero' | 'negative'

export function WaterTab({ credits, auditLog }: Props) {
  const [showManage, setShowManage] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [pending, startTransition] = useTransition()

  function handleAdjust(credit: WaterCredit, delta: number) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('memberName', credit.memberName)
      fd.set('delta', String(delta))
      fd.set('note', '')
      await adjustWaterCredit(fd)
    })
  }

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const filteredCredits = useMemo(() => {
    return credits.filter((c) => {
      const matchesSearch = c.memberName.toLowerCase().includes(search.toLowerCase().trim())
      if (!matchesSearch) return false
      if (filter === 'positive') return c.balance > 0
      if (filter === 'zero') return c.balance === 0
      if (filter === 'negative') return c.balance < 0
      return true
    })
  }, [credits, search, filter])

  const stats = useMemo(() => {
    const positive = credits.filter((c) => c.balance > 0).length
    const zero = credits.filter((c) => c.balance === 0).length
    const negative = credits.filter((c) => c.balance < 0).length
    return { positive, zero, negative }
  }, [credits])

  return (
    <div className="flex flex-col h-full">
      {/* Header with Manage button */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Droplets className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-900">
              Water Tracker
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowManage(true)}
          className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          <SlidersHorizontal className="size-3 text-zinc-500" />
          <span>Manage</span>
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member name..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-8 pr-3 py-1.5 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              filter === 'all'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All ({credits.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('positive')}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              filter === 'positive'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100'
            }`}
          >
            In Credit ({stats.positive})
          </button>
          <button
            type="button"
            onClick={() => setFilter('negative')}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              filter === 'negative'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 border border-rose-100 hover:bg-rose-100'
            }`}
          >
            Below Zero ({stats.negative})
          </button>
          <button
            type="button"
            onClick={() => setFilter('zero')}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              filter === 'zero'
                ? 'bg-zinc-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Zero ({stats.zero})
          </button>
        </div>
      </div>

      {/* Member list */}
      {filteredCredits.length === 0 ? (
        <p className="py-6 text-center text-xs font-medium text-zinc-400">
          {search ? 'No members matching search.' : 'No members yet — click Manage to add.'}
        </p>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
          {filteredCredits.map((c) => {
            const memberLog = auditLog.filter((l) => l.creditId === c.id)
            const isExpanded = expandedId === c.id
            const isNegative = c.balance < 0

            return (
              <div key={c.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
                {/* Main row */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  {/* Name & remaining */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.id)}
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="text-sm font-bold text-zinc-900 truncate">{c.memberName}</span>
                    <span className={`text-[11px] font-medium ${isNegative ? 'text-rose-600' : 'text-zinc-500'}`}>
                      {c.balance} {c.balance === 1 ? 'bottle' : 'bottles'} remaining
                    </span>
                  </button>

                  {/* Balance badge */}
                  <div
                    className={`flex min-w-[2.5rem] items-center justify-center rounded-lg px-2 py-1 text-xs font-black tabular-nums border ${
                      isNegative
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : c.balance === 0
                        ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {c.balance}
                  </div>

                  {/* Quick controls: Minus & Plus */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAdjust(c, -1)}
                      disabled={pending}
                      className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 transition-colors active:scale-95"
                      aria-label={`Use 1 bottle for ${c.memberName}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjust(c, 1)}
                      disabled={pending}
                      className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 transition-colors active:scale-95"
                      aria-label={`Add 1 bottle for ${c.memberName}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expandable history */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50/80 px-3.5 py-2.5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Activity History</p>
                    {memberLog.length === 0 ? (
                      <p className="text-xs text-zinc-400">No activity logged yet.</p>
                    ) : (
                      <div className="max-h-36 space-y-1.5 overflow-y-auto">
                        {memberLog.map((entry) => {
                          const d = new Date(entry.createdAt)
                          return (
                            <div key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-7 font-black tabular-nums ${entry.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                >
                                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                                </span>
                                {entry.note && entry.note !== 'manual adjust' && (
                                  <span className="text-zinc-600 truncate">{entry.note}</span>
                                )}
                              </div>
                              <span className="shrink-0 text-[11px] font-medium text-zinc-400">
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500 text-white font-bold">
              <Droplets className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-black uppercase tracking-tight text-zinc-900">
                Manage Water Accounts
              </h2>
              <p className="text-xs text-zinc-500">Add members, adjust bottle balances or remove</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5">
          {/* Add new member */}
          <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">Add New Member</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd() }}
                placeholder="Member full name"
                autoFocus
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500"
              />
              {/* Qty spinner */}
              <div className="flex items-center rounded-xl border border-zinc-300 bg-white overflow-hidden">
                <span className="w-9 text-center text-xs font-bold tabular-nums text-zinc-800">{newQty}</span>
                <div className="flex flex-col border-l border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setNewQty((v) => v + 1)}
                    className="flex h-4 w-6 items-center justify-center border-b border-zinc-200 text-zinc-500 hover:text-zinc-900"
                    aria-label="Increase qty"
                  >
                    <ChevronUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewQty((v) => Math.max(0, v - 1))}
                    className="flex h-4 w-6 items-center justify-center text-zinc-500 hover:text-zinc-900"
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
                className="flex items-center justify-center rounded-xl bg-emerald-600 px-3 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                aria-label="Add member"
              >
                <Plus className="size-4" />
                <span className="ml-1 hidden sm:inline">Add</span>
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">All Members ({credits.length})</p>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {credits.length === 0 ? (
              <p className="text-xs text-zinc-400 py-3 text-center">No members yet.</p>
            ) : (
              credits.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900 truncate">{c.memberName}</p>
                    <p className="text-[11px] font-medium text-zinc-500">{c.balance} {c.balance === 1 ? 'bottle' : 'bottles'}</p>
                  </div>
                  {/* Inline balance spinner */}
                  <div className="flex items-center rounded-xl border border-zinc-300 bg-zinc-50 overflow-hidden">
                    <span className="w-10 px-2 text-center text-xs font-bold tabular-nums text-zinc-900">{c.balance}</span>
                    <div className="flex flex-col border-l border-zinc-200">
                      <button
                        type="button"
                        onClick={() => handleSetBalance(c, c.balance + 1)}
                        disabled={setPending}
                        className="flex h-4 w-6 items-center justify-center border-b border-zinc-200 text-zinc-500 hover:text-zinc-900 disabled:opacity-40"
                        aria-label="Increase"
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetBalance(c, c.balance - 1)}
                        disabled={setPending}
                        className="flex h-4 w-6 items-center justify-center text-zinc-500 hover:text-zinc-900 disabled:opacity-40"
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
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 transition-colors"
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

