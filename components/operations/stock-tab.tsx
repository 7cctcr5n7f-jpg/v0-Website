'use client'

import { useMemo, useState, useTransition } from 'react'
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
  SlidersHorizontal,
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
  focusLowStockRequest?: number
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

export function StockTab({ items, lastConfirmation, staff, focusLowStockRequest = 0 }: Props) {
  const [showManage, setShowManage] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [pending, startTransition] = useTransition()
  const [confirmPending, startConfirm] = useTransition()

  const todayYmd = jhbYmd(new Date())
  const lastDate = lastConfirmation ? new Date(lastConfirmation.confirmedAt) : null
  const confirmedToday = lastDate ? jhbYmd(lastDate) === todayYmd : false

  const lowCount = items.filter(isLow).length
  const orderedItems = useMemo(
    () => [...items].sort((a, b) => Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name)),
    [items],
  )

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
        className={`mb-3.5 rounded-xl border p-3.5 shadow-xs transition-colors ${
          confirmedToday
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
            : 'border-amber-200 bg-amber-50/70 text-amber-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${confirmedToday ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
            {confirmedToday ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertTriangle className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {confirmedToday ? (
              <p className="text-xs font-bold text-emerald-900">
                Stock confirmed today by {lastConfirmation!.staffName}
              </p>
            ) : (
              <p className="text-xs font-bold text-amber-900">
                Stock take required today — please verify stock levels
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-zinc-500" suppressHydrationWarning>
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
          <div className="mt-3 flex items-center gap-2">
            {staff.length > 0 ? (
              <select
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                autoFocus
                className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
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
                className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500"
              />
            )}
            <button
              type="button"
              onClick={submitConfirm}
              disabled={confirmPending || !confirmName.trim()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-opacity hover:bg-emerald-700 disabled:opacity-40 shadow-xs"
            >
              {confirmPending ? '…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setConfirmName('') }}
              className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-500 hover:text-zinc-800"
              aria-label="Cancel"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`mt-3 w-full rounded-xl py-2 text-xs font-bold shadow-xs transition-colors ${
              confirmedToday
                ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {confirmedToday ? 'Confirm stock take again' : 'Confirm today\'s stock take'}
          </button>
        )}
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Package className="size-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-black tracking-tight text-zinc-900">
              Stock Inventory
            </h3>
            {lowCount > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
                {lowCount} low
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowManage(true)}
          className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          <SlidersHorizontal className="size-3 text-zinc-500" />
          <span>Manage Stock</span>
        </button>
      </div>

      {/* ── Compact inventory rows ───────────────────────────────── */}
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs font-medium text-zinc-400">No stock items yet — click Manage to add.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {orderedItems.map((item) => {
            const low = isLow(item)
            const pct = fillPercent(item)
            return (
              <div
                key={item.id}
                className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 border-b border-zinc-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_90px_auto] ${
                  low
                    ? focusLowStockRequest > 0
                      ? 'bg-rose-50 ring-1 ring-inset ring-rose-300'
                      : 'bg-rose-50/50'
                    : 'bg-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${low ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <span className="truncate text-sm font-bold text-zinc-900">{item.name}</span>
                  </div>
                  <div className="mt-1 ml-4 h-1 w-full max-w-md overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${low ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className={`text-right text-sm font-black tabular-nums ${low ? 'text-rose-700' : 'text-zinc-700'}`}>
                  {item.currentQty}<span className="font-medium text-zinc-400"> / {item.maxQty}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjust(item, -1)}
                    disabled={pending || item.currentQty <= 0}
                    className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30 transition-colors active:scale-95"
                    aria-label={`Reduce ${item.name}`}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjust(item, 1)}
                    disabled={pending}
                    className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 transition-colors active:scale-95"
                    aria-label={`Add ${item.name}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
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
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
              <Package className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-black uppercase tracking-tight text-zinc-900">
                Manage Stock Inventory
              </h2>
              <p className="text-xs text-zinc-500">Add stock items, update targets or delete items</p>
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
        <div className="overflow-y-auto p-5">
          {/* Add new item */}
          <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">Add New Item</p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Item name (e.g. Energy Bars, Towels)"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500"
              />
              <div className="flex items-center gap-2">
                <NumberField label="Current" value={newCur} onChange={setNewCur} />
                <NumberField label="Target" value={newMax} onChange={setNewMax} />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={addPending || !newName.trim()}
                  className="ml-auto flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-opacity hover:bg-emerald-700 disabled:opacity-40"
                >
                  <Plus className="size-4" /> Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Existing items */}
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">Inventory Items ({items.length})</p>
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-xs text-zinc-400 py-3 text-center">No items in inventory.</p>
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
    <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
      <p className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-900">{item.name}</p>
      <NumberField label="Cur" value={cur} onChange={setCur} compact />
      <NumberField label="Tgt" value={max} onChange={setMax} compact />
      <button
        type="button"
        onClick={() => onSave(item, cur, max)}
        disabled={disabled || !dirty}
        className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white transition-opacity hover:bg-emerald-700 disabled:opacity-30 shadow-xs"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        disabled={disabled}
        className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 transition-colors"
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
      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="flex items-center rounded-xl border border-zinc-300 bg-zinc-50 overflow-hidden">
        <span className={`px-2 text-center text-xs font-bold tabular-nums text-zinc-900 ${compact ? 'w-8' : 'w-10'}`}>
          {value}
        </span>
        <div className="flex flex-col border-l border-zinc-200">
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className="flex h-4 w-6 items-center justify-center border-b border-zinc-200 text-zinc-500 hover:text-zinc-900"
            aria-label={`Increase ${label}`}
          >
            <ChevronUp className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - 1))}
            className="flex h-4 w-6 items-center justify-center text-zinc-500 hover:text-zinc-900"
            aria-label={`Decrease ${label}`}
          >
            <ChevronDown className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
