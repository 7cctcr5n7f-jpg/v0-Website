'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, Database, Plus, Save, ShieldCheck } from 'lucide-react'

type Category = 'decision' | 'integration' | 'campaign' | 'learning' | 'task' | 'business'
type RecordItem = { id: string; category: Category; title: string; content: string; status: string; updatedAt: string }

const categories: { value: Category; label: string }[] = [
  { value: 'decision', label: 'Decision' }, { value: 'integration', label: 'Integration' },
  { value: 'campaign', label: 'Campaign' }, { value: 'learning', label: 'Learning' },
  { value: 'task', label: 'Next action' }, { value: 'business', label: 'Business context' }
]

export function ProjectMemoryPanel() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [category, setCategory] = useState<Category>('decision')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    fetch('/api/growth-studio/memory', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Could not load Project Memory')))
      .then(data => setRecords(Array.isArray(data.records) ? data.records : []))
      .catch(() => setNotice('Could not load Project Memory. Check the workspace connection.'))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => categories.map(c => ({ ...c, items: records.filter(r => r.category === c.value) })).filter(g => g.items.length), [records])

  const save = async (next: RecordItem[]) => {
    setSaving(true); setNotice('')
    try {
      const response = await fetch('/api/growth-studio/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Save failed')
      setRecords(next); setNotice('Saved to Neon Project Memory')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Save failed') }
    finally { setSaving(false) }
  }

  const add = async () => {
    if (!title.trim() || !content.trim()) { setNotice('Add both a title and the information to save.'); return }
    const item: RecordItem = { id: crypto.randomUUID(), category, title: title.trim(), content: content.trim(), status: 'recorded', updatedAt: new Date().toISOString() }
    await save([item, ...records]); setTitle(''); setContent('')
  }

  const update = (id: string, patch: Partial<RecordItem>) => setRecords(current => current.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r))

  return <section className="project-memory-shell">
    <div className="project-memory-heading">
      <div><span className="project-memory-eyebrow"><Database size={14}/> NEON · PERSISTENT PROJECT RECORD</span><h2><BookOpen size={23}/> TENROUNDS Project Memory</h2><p>The shared record for decisions, integrations, campaigns, learnings and next actions. This is separate from chat history.</p></div>
      <span className="project-memory-count">{records.length} records</span>
    </div>
    <div className="project-memory-callout"><ShieldCheck size={18}/><span><strong>Governance rule:</strong> GA4 property 338885680 is authoritative. Property 361324067 is excluded. Never save passwords, tokens, private keys or other credentials here.</span></div>
    <div className="project-memory-create">
      <h3><Plus size={17}/> Add to Project Memory</h3>
      <div className="project-memory-form">
        <select value={category} onChange={e => setCategory(e.target.value as Category)} aria-label="Memory category">{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="Record title" aria-label="Record title"/>
        <textarea value={content} onChange={e => setContent(e.target.value)} maxLength={12000} placeholder="Record the decision, context, integration status, campaign detail or next action..." aria-label="Record content"/>
        <button onClick={add} disabled={saving}><Plus size={15}/> Save record</button>
      </div>
    </div>
    <div className="project-memory-records">
      {loading ? <p className="project-memory-empty">Loading saved project records…</p> : grouped.map(group => <div className="project-memory-group" key={group.value}>
        <h3>{group.label}<span>{group.items.length}</span></h3>
        {group.items.map(item => <article className="project-memory-record" key={item.id}>
          <div className="project-memory-record-head"><input value={item.title} onChange={e => update(item.id, { title: e.target.value })} aria-label="Edit record title"/><span>{item.status}</span></div>
          <textarea value={item.content} onChange={e => update(item.id, { content: e.target.value })} aria-label="Edit record content"/>
          <div className="project-memory-record-foot"><small>Updated {new Date(item.updatedAt).toLocaleString('en-ZA')}</small><button onClick={() => void save(records)} disabled={saving}><Save size={13}/> Save changes</button></div>
        </article>)}
      </div>)}
      {!loading && records.length === 0 && <p className="project-memory-empty">No project records yet. Add the first decision or integration above.</p>}
    </div>
    <div className="project-memory-footer"><span>{saving ? 'Saving…' : notice || 'Owner-only workspace · approval-first'}</span><span><Check size={13}/> Stored in existing Neon settings table</span></div>
  </section>
}
