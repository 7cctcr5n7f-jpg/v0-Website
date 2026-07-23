'use client'

import { useState, useTransition } from 'react'
import {
  Package,
  Plus,
  Minus,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import {
  adjustStockQty,
  saveStockItem,
  deleteStockItem,
  confirmStockTake,
} from '@/app/actions/operations'
import type { StockItem, StockConfirmation, Staff } from '@/lib/db/schema'

// Below this fraction of the target level an item is flagged as low (red).
const LOW_RATIO = 0.2

interface Props {
  items: StockItem[]
  lastConfirmation: StockConfirmation | null
  staff: Staff[]
}

function jhbYmd(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function fillPercent(item: StockItem) {
  if (item.maxQty <= 0) return item.currentQty > 0 ? 100 : 0
  return Math.max(0, Math.min(100, Math.round((item.currentQty / item.maxQty) * 100)))
}

function isLow(item: StockItem) {
  if (item.maxQty <= 0) return item.currentQty <= 0
  return item.currentQty / item.maxQty < LOW_RATIO
}

export function StockTab({ items, lastConfirmation, staff }: Props) {
  const [showManage, setShowManage] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [pending, startTransition] = useTransition()
  const [confirmPending, startConfirm] = useTransition()

  const todayYmd = jhbYmd(new Date())
  const lastDate = lastConfirmation ? new Date(lastConfirmation.confirmedAt) : null
  const confirmedToday = lastDate ? jhbYmd(lastDate) === todayYmd : false

  const lowCount = items.filter(isLow).length

  function adjust(item: StockItem, delta: number) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', String(item.id))
      fd.set('delta', String(delta))
      await adjustStockQty(fd)
    })
  }

  function submitConfirm() {
    const name = confirmName.trim()
    if (!name) return
    startConfirm(async () => {
      const fd = new FormData()
      fd.set('staffName', name)
      await confirmStockTake(fd)
      setConfirming(false)
      setConfirmName('')
    })
  }

  return (
    <div>
      {/* ── Confirmation banner ─────────────────────────────────── */}
      <div
        suppressHydrationWarning
        className={`mb-3 rounded-xl border px-3.5 py-2.5 ${
          confirmedToday
            ? 'border-neon-green/30 bg-neon-green/5'
            : 'border-red-500/40 bg-red-500/10'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {confirmedToday ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-neon-green" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
          )}
          <div className="min-w-0 flex-1">
            {confirmedToday ? (
              <p className="text-xs font-bold text-neon-green">
                Stock confirmed today by {lastConfirmation!.staffName}
              </p>
            ) : (
              <p className="text-xs font-bold text-red-300">
                Stock not confirmed today — please do a stock take
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-light-grey" suppressHydrationWarning>
              {lastDate
                ? `Last confirmed by ${lastConfirmation!.staffName} · ${lastDate.toLocaleDateString('en-ZA', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    timeZone: 'Africa/Johannesburg',
                  })} ${lastDate.toLocaleTimeString('en-ZA', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Africa/Johannesburg',
                  })}`
                : 'No stock take recorded yet.'}
            </p>
          </div>
        </div>

        {/* Confirm control */}
        {confirming ? (
          <div className="mt-2.5 flex items-center gap-2">
            {staff.length > 0 ? (
              <select
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-steel bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-neon-green"
              >
                <option value="">Select trainer…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitConfirm() }}
                placeholder="Trainer name"
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-steel bg-background px-2.5 py-2 text-xs text-foreground outline-none placeholder:text-mid-grey focus:border-neon-green"
              />
            )}
            <button
              type="button"
              onClick={submitConfirm}
              disabled={confirmPending || !confirmName.trim()}
              className="rounded-lg bg-neon-green px-3 py-2 text-xs font-bold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {confirmPending ? '…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setConfirmName('') }}
              className="rounded-lg border border-steel px-2 py-2 text-xs text-mid-grey hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`mt-2.5 w-full rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              confirmedToday
                ? 'border border-steel text-light-grey hover:border-neon-green hover:text-neon-green'
                : 'bg-red-500 text-white hover:bg-red-500/85'
            }`}
          >
            {confirmedToday ? 'Confirm again' : 'Confirm stock take'}
          </button>
        )}
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-neon-green/15">
            <Package className="size-3.5 text-neon-green" />
          </div>
          <span className="text-xs font-bold text-foreground">
            Stock Levels
            {lowCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                {lowCount} low
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowManage(true)}
          className="text-xs font-semibold text-neon-green transition-colors hover:text-neon-green/70"
        >
          Manage
        </button>
      </div>

      {/* ── Item list ───────────────────────────────────────────── */}
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-light-grey">No stock items yet — tap Manage to add.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const low = isLow(item)
            const pct = fillPercent(item)
            return (
              <div key={item.id} className="rounded-2xl border border-steel/60 bg-card px-3.5 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
                      <span className={`shrink-0 text-xs font-black tabular-nums ${low ? 'text-red-400' : 'text-neon-green'}`}>
                        {item.currentQty}
                        <span className="text-mid-grey">/{item.maxQty}</span>
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-steel/40">
                      <div
                        className={`h-full rounded-full transition-all ${low ? 'bg-red-500' : 'bg-neon-green'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {/* Quick adjust */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjust(item, -1)}
                      disabled={pending || item.currentQty <= 0}
                      className="flex size-8 items-center justify-center rounded-lg border border-steel/80 bg-background text-light-grey transition-colors hover:border-red-400/60 hover:text-red-400 disabled:opacity-30"
                      aria-label={`Reduce ${item.name}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjust(item, 1)}
                      disabled={pending}
                      className="flex size-8 items-center justify-center rounded-lg border border-steel/80 bg-background text-light-grey transition-colors hover:border-neon-green/60 hover:text-neon-green disabled:opacity-30"
                      aria-label={`Add ${item.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showManage && <ManageModal items={items} onClose={() => setShowManage(false)} />}
    </div>
  )
}

function ManageModal({ items, onClose }: { items: StockItem[]; onClose: () => void }) {
  const [newName, setNewName] = useState('')
  const [newCur, setNewCur] = useState(0)
  const [newMax, setNewMax] = useState(0)
  const [addPending, startAdd] = useTransition()
  const [savePending, startSave] = useTransition()

  function handleAdd() {
    if (!newName.trim()) return
    startAdd(async () => {
      const fd = new FormData()
      fd.set('name', newName.trim())
      fd.set('currentQty', String(newCur))
      fd.set('maxQty', String(newMax))
      await saveStockItem(fd)
      setNewName('')
      setNewCur(0)
      setNewMax(0)
    })
  }

  function handleSave(item: StockItem, current: number, max: number) {
    startSave(async () => {
      const fd = new FormData()
      fd.set('id', String(item.id))
      fd.set('name', item.name)
      fd.set('currentQty', String(Math.max(0, current)))
      fd.set('maxQty', String(Math.max(0, max)))
      await saveStockItem(fd)
    })
  }

  function handleDelete(item: StockItem) {
    if (!confirm(`Remove ${item.name}?`)) return
    startSave(async () => {
      const fd = new FormData()
      fd.set('id', String(item.id))
      await deleteStockItem(fd)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-steel bg-card shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-steel px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-neon-green/15">
              <Package className="size-4 text-neon-green" />
            </div>
            <h2 className="font-display text-base font-black uppercase tracking-tight text-foreground">
              Manage Stock
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
        <div className="overflow-y-auto px-5 py-4">
          {/* Add new item */}
          <p className="mb-2.5 text-xs font-bold text-foreground">Add New Item</p>
          <div className="mb-2 flex flex-col gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Item name"
              className="w-full rounded-xl border border-steel bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-mid-grey focus:border-neon-green"
            />
            <div className="flex items-center gap-2">
              <NumberField label="In stock" value={newCur} onChange={setNewCur} />
              <NumberField label="Target" value={newMax} onChange={setNewMax} />
              <button
                type="button"
                onClick={handleAdd}
                disabled={addPending || !newName.trim()}
                className="ml-auto flex h-11 items-center gap-1.5 rounded-xl bg-neon-green px-4 text-sm font-bold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                <Plus className="size-4" /> Add
              </button>
            </div>
          </div>

          {/* Existing items */}
          <p className="mb-2.5 mt-5 text-xs font-bold text-foreground">Items</p>
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-xs text-light-grey">No items yet.</p>
            ) : (
              items.map((item) => (
                <ManageRow
                  key={item.id}
                  item={item}
                  disabled={savePending}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ManageRow({
  item,
  disabled,
  onSave,
  onDelete,
}: {
  item: StockItem
  disabled: boolean
  onSave: (item: StockItem, current: number, max: number) => void
  onDelete: (item: StockItem) => void
}) {
  const [cur, setCur] = useState(item.currentQty)
  const [max, setMax] = useState(item.maxQty)
  const dirty = cur !== item.currentQty || max !== item.maxQty

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-steel/60 bg-background px-3 py-2.5">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.name}</p>
      <NumberField label="In" value={cur} onChange={setCur} compact />
      <NumberField label="Target" value={max} onChange={setMax} compact />
      <button
        type="button"
        onClick={() => onSave(item, cur, max)}
        disabled={disabled || !dirty}
        className="rounded-lg bg-neon-green/90 px-2.5 py-1.5 text-[11px] font-bold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        disabled={disabled}
        className="rounded-lg p-1.5 text-light-grey transition-colors hover:text-red-400 disabled:opacity-40"
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  compact?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-wider text-mid-grey">{label}</span>
      <div className="flex items-center rounded-xl border border-steel bg-card">
        <span className={`px-2 text-center text-sm font-bold tabular-nums text-foreground ${compact ? 'w-8' : 'w-10'}`}>
          {value}
        </span>
        <div className="flex flex-col border-l border-steel">
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className="flex h-5 w-7 items-center justify-center border-b border-steel text-light-grey hover:text-foreground"
            aria-label={`Increase ${label}`}
          >
            <ChevronUp className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - 1))}
            className="flex h-5 w-7 items-center justify-center text-light-grey hover:text-foreground"
            aria-label={`Decrease ${label}`}
          >
            <ChevronDown className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
