'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, UserRound } from 'lucide-react'
import { saveStaffMember, deleteStaffMember, saveShiftSettings } from '@/app/actions/operations'
import type { Staff, ShiftSetting } from '@/lib/db/schema'

interface Props {
  staff: Staff[]
  shiftSettings: ShiftSetting[]
}

export function SettingsTab({ staff, shiftSettings }: Props) {
  return (
    <div className="space-y-10">
      <StaffSection staff={staff} />
      <ShiftSettingsSection settings={shiftSettings} />
    </div>
  )
}

function StaffSection({ staff }: { staff: Staff[] }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setPending(true)
    const fd = new FormData()
    fd.set('id', '0')
    fd.set('name', name.trim())
    fd.set('phone', phone.trim())
    await saveStaffMember(fd)
    setName('')
    setPhone('')
    setAdding(false)
    setPending(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-black uppercase tracking-tight">Staff / Trainers</h3>
          <p className="mt-0.5 text-sm text-light-grey">Manage the trainers that appear on the roster.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg border border-neon-green px-3 py-2 text-sm font-semibold text-neon-green transition-colors hover:bg-neon-green/10"
        >
          <Plus className="size-4" /> Add Trainer
        </button>
      </div>

      {staff.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-steel p-8 text-center text-sm text-light-grey">
          No trainers yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <StaffRow key={s.id} member={s} />
          ))}
        </div>
      )}

      {adding && (
        <div className="mt-3 rounded-2xl border border-steel bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">New Trainer</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-light-grey">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-steel bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-neon-green"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-light-grey">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-steel bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-neon-green"
                placeholder="+27 00 000 0000"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={pending || !name.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-neon-green px-4 py-2 text-sm font-bold text-black transition-opacity disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save Trainer'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setName(''); setPhone('') }}
              className="rounded-lg border border-steel px-4 py-2 text-sm text-light-grey transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StaffRow({ member }: { member: Staff }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(member.name)
  const [phone, setPhone] = useState(member.phone)
  const [pending, setPending] = useState(false)

  async function handleSave() {
    setPending(true)
    const fd = new FormData()
    fd.set('id', String(member.id))
    fd.set('name', name.trim())
    fd.set('phone', phone.trim())
    await saveStaffMember(fd)
    setEditing(false)
    setPending(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove ${member.name} from staff?`)) return
    const fd = new FormData()
    fd.set('id', String(member.id))
    await deleteStaffMember(fd)
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-neon-green/50 bg-card p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-neon-green"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-neon-green"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-neon-green px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
          >
            <Save className="size-3" /> Save
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setName(member.name); setPhone(member.phone) }}
            className="rounded-lg border border-steel px-3 py-1.5 text-xs text-light-grey hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-steel bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-full border border-steel bg-background">
          <UserRound className="size-4 text-neon-blue" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{member.name}</p>
          {member.phone && <p className="text-xs text-light-grey">{member.phone}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-steel px-3 py-1.5 text-xs font-semibold text-light-grey transition-colors hover:border-neon-blue hover:text-neon-blue"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-md p-1.5 text-light-grey transition-colors hover:text-red-400"
          aria-label={`Delete ${member.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

function ShiftSettingsSection({ settings }: { settings: ShiftSetting[] }) {
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const m: Record<string, Record<string, string>> = {}
    for (const s of settings) {
      m[s.shiftType] = {
        label: s.label,
        startTime: s.startTime,
        endTime: s.endTime,
        defaultHours: s.defaultHours,
      }
    }
    return m
  })

  function update(shiftType: string, field: string, value: string) {
    setValues((v) => ({ ...v, [shiftType]: { ...v[shiftType], [field]: value } }))
  }

  async function handleSave() {
    setPending(true)
    const fd = new FormData()
    for (const [type, fields] of Object.entries(values)) {
      for (const [field, val] of Object.entries(fields)) {
        fd.set(`${type}_${field}`, val)
      }
    }
    await saveShiftSettings(fd)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setPending(false)
  }

  const shiftOrder = ['morning', 'afternoon', 'saturday']
  const orderedSettings = shiftOrder
    .map((t) => settings.find((s) => s.shiftType === t))
    .filter(Boolean) as ShiftSetting[]

  return (
    <div className="border-t border-steel pt-8">
      <div className="mb-4">
        <h3 className="font-display text-lg font-black uppercase tracking-tight">Shift Settings</h3>
        <p className="mt-0.5 text-sm text-light-grey">Configure default hours and times for each shift type.</p>
      </div>

      <div className="space-y-4">
        {orderedSettings.map((s) => (
          <div key={s.shiftType} className="rounded-2xl border border-steel bg-card p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-neon-blue capitalize">{s.shiftType}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-light-grey">Label</label>
                <input
                  type="text"
                  value={values[s.shiftType]?.label ?? s.label}
                  onChange={(e) => update(s.shiftType, 'label', e.target.value)}
                  className="w-full rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-neon-green"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-light-grey">Start</label>
                <input
                  type="time"
                  value={values[s.shiftType]?.startTime ?? s.startTime}
                  onChange={(e) => update(s.shiftType, 'startTime', e.target.value)}
                  className="w-full rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-neon-green"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-light-grey">End</label>
                <input
                  type="time"
                  value={values[s.shiftType]?.endTime ?? s.endTime}
                  onChange={(e) => update(s.shiftType, 'endTime', e.target.value)}
                  className="w-full rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-neon-green"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-light-grey">Default hrs</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={values[s.shiftType]?.defaultHours ?? s.defaultHours}
                  onChange={(e) => update(s.shiftType, 'defaultHours', e.target.value)}
                  className="w-full rounded-lg border border-steel bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-neon-green"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="mt-5 flex items-center gap-2 rounded-lg bg-neon-green px-5 py-2.5 text-sm font-bold text-black transition-opacity disabled:opacity-50"
      >
        <Save className="size-4" />
        {saved ? 'Saved!' : pending ? 'Saving…' : 'Save Shift Settings'}
      </button>
    </div>
  )
}
