'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, ArrowUpRight, BarChart3, BookOpen, CalendarDays, CheckCircle2, FileImage, FolderOpen, Megaphone, Plus, Target, UploadCloud, MessageSquareQuote, Save, Star } from 'lucide-react'

type Asset = { url: string; pathname: string; size: number; uploadedAt?: string; contentType?: string }
type Review = { id: string; name: string; comment: string; rating: number; date: string; reply: string; category: string[]; usageStatus: 'unused' | 'planned' | 'created' | 'published'; source: string; sourceNote?: string }
type Metrics = { updatedAt: string; period: string; trials: { total: number; month: number }; members: { month: number; matchedFromTrials: number }; conversion: { rate: number | null }; attendance: { value: number | null; reason: string }; retention: { value: number | null; reason: string }; campaignRoi: { value: number | null; reason: string }; revenue: { paidSessionPurchases: number; currency: string } }
const sections = [
  { id: 'strategy', label: 'ChatGPT Strategy', icon: BookOpen, description: 'Strategy and decisions stay in your ChatGPT workspace.' },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, description: 'Plan campaign objectives, dates, offers and creative.' },
  { id: 'calendar', label: 'Content Calendar', icon: CalendarDays, description: 'Review the content plan and approval status.' },
  { id: 'creative', label: 'Creative Studio', icon: FileImage, description: 'Prepare creative briefs and move into Canva.' },
  { id: 'performance', label: 'Performance', icon: BarChart3, description: 'Use verified booking and membership data.' },
  { id: 'assets', label: 'Assets & Templates', icon: FolderOpen, description: 'Keep the official TENROUNDS CI and brand files together.' },
  { id: 'reviews', label: 'Google Reviews', icon: MessageSquareQuote, description: 'Turn authentic customer reviews into a reusable content library.' },
]
const money = (value: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value)
export function GrowthStudioSection({ section }: { section: string }) {
  const active = sections.find(item => item.id === section) ?? sections[0]
  const [assets, setAssets] = useState<Asset[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(33)
  const [reviewsNotice, setReviewsNotice] = useState('')
  const [savingReviews, setSavingReviews] = useState(false)
  useEffect(() => {
    if (section === 'reviews') fetch('/api/growth-studio/reviews', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(d => { setReviews(d.reviews ?? []); setReviewsTotal(d.totalGoogleReviews ?? 33) }).catch(() => setReviewsNotice('Could not load the review library.'))
    if (section === 'assets') fetch('/api/growth-studio/assets', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(d => setAssets(d.assets ?? [])).catch(() => setNotice('Asset storage is not available yet. Connect a Vercel Blob store to enable uploads.'))
    if (section === 'performance') fetch('/api/growth-studio/metrics', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(setMetrics).catch(() => setNotice('Could not retrieve verified metrics.'))
    if (section === 'campaigns' || section === 'calendar') fetch('/api/growth-studio/state', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(d => { setCampaigns(d.state?.campaigns ?? []); setPosts(d.state?.posts ?? []) }).catch(() => setNotice('Could not load the saved campaign workspace.'))
  }, [section])
  const upload = async () => {
    if (!file) { setNotice('Choose your CI or brand asset first.'); return }
    setBusy(true); setNotice('')
    try {
      const body = new FormData(); body.set('file', file)
      const response = await fetch('/api/growth-studio/assets', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')
      setAssets(current => [data.asset, ...current]); setFile(null); setNotice('Brand asset uploaded successfully.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Upload failed.') }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-[#F3F6F9] px-4 py-5 text-[#102A43] sm:px-7">
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/growth-studio" className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-[#0878EF]"><ArrowLeft size={14}/> Back to Growth Studio</Link><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#008FC4]">TENROUNDS · GROWTH HUB</p><h1 className="mt-1 text-3xl font-black tracking-tight">{active.label}</h1><p className="mt-1 text-sm text-slate-500">{active.description}</p></div>
        <Link href="/KPI" className="rounded-xl bg-[#102A43] px-4 py-3 text-xs font-extrabold text-white">Open Analysis Cockpit ↗</Link>
      </div>
      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">{sections.map(item => <Link key={item.id} href={'/growth-studio/'+item.id} className={'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold '+(section===item.id?'border-[#0878EF] bg-[#0878EF] text-white':'border-slate-200 bg-white text-slate-600')}><item.icon size={15}/>{item.label}</Link>)}</nav>
      {section === 'strategy' && <Panel title="Your marketing brain lives in ChatGPT"><p>Use the TENROUNDS Growth Studio conversation for strategic decisions, campaign briefs, performance interpretation and creative reviews. The website does not run a separate AI model or background agent.</p><a className="mt-4 inline-flex rounded-lg bg-[#0878EF] px-4 py-3 text-xs font-black text-white" href="https://chatgpt.com/" target="_blank" rel="noreferrer">Open ChatGPT <ArrowUpRight size={14}/></a><p className="mt-4 text-xs text-slate-500">Bring the latest Growth Studio metrics and uploaded CI into the conversation when planning a campaign.</p></Panel>}
      {section === 'campaigns' && <Panel title="Campaign workspace"><p className="mb-4 text-sm text-slate-500">Campaigns currently saved in the Growth Studio overview.</p>{campaigns.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{campaigns.map(c=><article key={c.id} className="rounded-xl border border-slate-200 p-4"><span className="text-[10px] font-black uppercase tracking-wider text-[#0878EF]">{c.status}</span><h3 className="mt-2 font-black">{c.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{c.objective}</p><p className="mt-3 text-[10px] font-bold text-slate-400">{c.startDate} → {c.endDate}</p></article>)}</div>:<Empty>No saved campaigns yet. Start by creating a campaign in the Growth Studio overview.</Empty>}<Link className="mt-5 inline-flex rounded-lg border border-[#0878EF] px-4 py-3 text-xs font-black text-[#0878EF]" href="/growth-studio#campaigns">Manage campaigns in overview ↗</Link></Panel>}
      {section === 'calendar' && <Panel title="Content calendar"><p className="mb-4 text-sm text-slate-500">Saved content pieces and their approval states.</p>{posts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b text-[10px] uppercase tracking-wider text-slate-400"><th className="p-3">Date</th><th className="p-3">Content</th><th className="p-3">Format</th><th className="p-3">Channels</th><th className="p-3">Status</th></tr></thead><tbody>{posts.sort((a,b)=>a.date.localeCompare(b.date)).map(p=><tr key={p.id} className="border-b border-slate-100"><td className="p-3">{p.date} · {p.time}</td><td className="p-3 font-bold">{p.title}</td><td className="p-3">{p.format}</td><td className="p-3">{(p.platforms??[]).join(', ')}</td><td className="p-3 capitalize">{p.status}</td></tr>)}</tbody></table></div>:<Empty>No content is scheduled yet.</Empty>}<Link className="mt-5 inline-flex rounded-lg border border-[#0878EF] px-4 py-3 text-xs font-black text-[#0878EF]" href="/growth-studio#calendar">Open visual calendar ↗</Link></Panel>}
      {section === 'creative' && <Panel title="Creative Studio"><p>Use the uploaded brand CI as the source of truth for every design. The Canva connector in ChatGPT can create editable designs using your uploaded CI and brand assets.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-[#F1F7FC] p-4"><h3 className="font-black">Brand design workflow</h3><ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-5 text-slate-600"><li>Upload the latest CI document under Assets & Templates.</li><li>Upload approved logos, photography and existing templates.</li><li>Ask ChatGPT to prepare a creative brief using those assets.</li><li>Create the editable design in Canva.</li><li>Review and approve before anything is published.</li></ol></div><div className="rounded-xl border border-slate-200 p-4"><h3 className="font-black">Canva</h3><p className="mt-2 text-xs leading-5 text-slate-500">Canva is connected in ChatGPT. This page does not claim a direct website-to-Canva API connection or automatic publishing.</p><a className="mt-4 inline-flex rounded-lg bg-[#0878EF] px-4 py-3 text-xs font-black text-white" href="https://www.canva.com/" target="_blank" rel="noreferrer">Open Canva <ArrowUpRight size={14}/></a></div></div></Panel>}
      {section === 'performance' && <Panel title="Verified growth performance"><p className="mb-4 text-xs text-slate-500">Live database records from the same trial and membership tables used by the Analysis Cockpit. Period: {metrics?.period ?? 'Loading…'}</p>{metrics ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Trial bookings this month',metrics.trials.month],['New member sign-ups',metrics.members.month],['Trial-to-member matches',metrics.members.matchedFromTrials],['Trial conversion',metrics.conversion.rate===null?'Not available':metrics.conversion.rate+'%']].map(([label,value])=><div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold text-slate-500">{label}</p><strong className="mt-2 block text-3xl font-black">{value}</strong></div>)}</div><div className="mt-4 grid gap-3 md:grid-cols-3">{[['Attendance',metrics.attendance.reason],['Retention',metrics.retention.reason],['Campaign ROI',metrics.campaignRoi.reason]].map(([label,reason])=><div key={String(label)} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-black">{label} · Data required</h3><p className="mt-2 text-xs leading-5 text-slate-600">{reason}</p></div>)}</div><p className="mt-4 text-[10px] text-slate-400">Updated {new Date(metrics.updatedAt).toLocaleString('en-ZA')}. Lifetime trial records: {metrics.trials.total}. Paid session purchases: {money(metrics.revenue.paidSessionPurchases)}. No background refresh.</p></>:<Empty>{notice || 'Loading verified metrics…'}</Empty>}</Panel>}
      {section === 'reviews' && <Panel title="Google Reviews · Member voice library">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Google lifetime reviews</p><strong className="mt-1 block text-3xl font-black">{reviewsTotal}</strong><p className="mt-1 text-[10px] text-slate-500">Reported by Google Business Profile</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Imported review records</p><strong className="mt-1 block text-3xl font-black">{reviews.length}</strong><p className="mt-1 text-[10px] text-slate-500">Retrieved through Supermetrics</p></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Still to retrieve</p><strong className="mt-1 block text-3xl font-black text-amber-900">{Math.max(0,reviewsTotal-reviews.length)}</strong><p className="mt-1 text-[10px] text-amber-800">Not available in current connector result</p></div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black">Authentic Google feedback</h3><p className="text-xs text-slate-500">Original review wording is preserved. Update usage status as content moves through production.</p></div><button onClick={async()=>{setSavingReviews(true);setReviewsNotice('');try{const r=await fetch('/api/growth-studio/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reviews)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Save failed');setReviewsNotice('Review statuses saved.')}catch(e){setReviewsNotice(e instanceof Error?e.message:'Could not save reviews.')}finally{setSavingReviews(false)}}} disabled={savingReviews} className="inline-flex items-center gap-2 rounded-lg bg-[#0878EF] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save size={14}/>{savingReviews?'Saving…':'Save review statuses'}</button></div>
        <div className="grid gap-3 lg:grid-cols-2">{reviews.map(review=><article key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-1 text-[#0878EF]">{Array.from({length:review.rating}).map((_,i)=><Star key={i} size={13} fill="currentColor"/>)}</div><h4 className="mt-2 font-black">{review.name}</h4><p className="text-[10px] text-slate-400">{new Date(review.date+'T12:00:00').toLocaleDateString('en-ZA')} · Google review</p></div><select aria-label={'Usage status for '+review.name} value={review.usageStatus} onChange={e=>setReviews(current=>current.map(item=>item.id===review.id?{...item,usageStatus:e.target.value as Review['usageStatus']}:item))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-bold"><option value="unused">Not used</option><option value="planned">Planned</option><option value="created">Creative created</option><option value="published">Published</option></select></div>
          {review.comment?<p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">“{review.comment}”</p>:<p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-500">This is a 5-star rating with no written comment. It is not suitable as a written testimonial.</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">{review.category.map(tag=><span key={tag} className="rounded-full bg-[#EAF4FF] px-2.5 py-1 text-[10px] font-bold text-[#1769AA]">{tag}</span>)}</div>
          {review.sourceNote&&<p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">{review.sourceNote}</p>}
          {review.reply&&<details className="mt-3"><summary className="cursor-pointer text-[11px] font-bold text-slate-500">View TENROUNDS reply</summary><p className="mt-2 text-xs leading-5 text-slate-500">{review.reply}</p></details>}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[10px] text-slate-400">Source: Supermetrics · {review.rating}/5</span><button onClick={()=>navigator.clipboard?.writeText(review.comment)} disabled={!review.comment} className="text-[11px] font-bold text-[#0878EF] disabled:text-slate-300">Copy original quote</button></div>
        </article>)}</div>
        <p className="mt-4 text-xs text-slate-500">{reviewsNotice}</p>
        <p className="mt-3 text-[10px] leading-5 text-slate-400">Coverage note: Supermetrics currently returns six individual review records although the lifetime total is 33. The missing 27 have not been invented or substituted. Review dates and exact text reflect the returned source records.</p>
      </Panel>}
      {section === 'assets' && <DriveAssetLibrary />}
      <div className="mt-5 flex items-center gap-2 text-[10px] text-slate-400"><CheckCircle2 size={13}/> Owner-only workspace · approval before publishing · no autonomous agents</div>
    </div>
  </main>
}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-4 text-xl font-black">{title}</h2>{children}</section>}
function Empty({children}:{children:React.ReactNode}){return <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">{children}</p>}


type DriveAsset = { id: string; name: string; mimeType: string; url: string; category: string; addedAt: string; iconUrl?: string; sizeBytes?: number }
const DRIVE_CATEGORIES = ['01 - Brand Identity', '02 - Original Video', '03 - Photography', '04 - Campaign Material', '05 - Approved Creative']
function DriveAssetLibrary() {
  const [assets, setAssets] = useState<DriveAsset[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('All assets')
  useEffect(() => { fetch('/api/growth-studio/drive-assets', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(d => setAssets(d.assets ?? [])).catch(() => setMessage('Could not load your saved Drive library.')) }, [])
  const connect = async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID
    if (!apiKey || !clientId) { setMessage('Google Drive credentials are missing from this Vercel deployment.'); return }
    setBusy(true); setMessage('Opening secure Google Drive connection…')
    try {
      const load = (src: string) => new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[src="' + src + '"]')
        if (existing) { resolve(); return }
        const script = document.createElement('script'); script.src = src; script.async = true; script.defer = true
        script.onload = () => resolve(); script.onerror = () => reject(new Error('Could not load Google sign-in.')); document.head.appendChild(script)
      })
      await load('https://accounts.google.com/gsi/client')
      await load('https://apis.google.com/js/api.js')
      const w = window as any
      await new Promise<void>((resolve, reject) => w.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Google Picker failed to load.')) }))
      const token = await new Promise<string>((resolve, reject) => {
        const tokenClient = w.google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: 'https://www.googleapis.com/auth/drive.file', callback: (response: any) => response.access_token ? resolve(response.access_token) : reject(new Error(response.error_description || 'Google sign-in was not completed.')) })
        tokenClient.requestAccessToken({ prompt: 'consent' })
      })
      await new Promise<void>((resolve, reject) => {
        const picker = new w.google.picker.PickerBuilder()
          .setDeveloperKey(apiKey).setAppId('867819328339').setOAuthToken(token).setOrigin(window.location.origin)
          .addView(new w.google.picker.DocsView(w.google.picker.ViewId.DOCS).setIncludeFolders(false))
          .enableFeature(w.google.picker.Feature.MULTISELECT_ENABLED)
          .setCallback(async (data: any) => {
            if (data.action === w.google.picker.Action.PICKED) {
              const selected = (data.docs || []).map((doc: any) => ({ id: doc.id, name: doc.name, mimeType: doc.mimeType || 'application/octet-stream', iconUrl: doc.iconUrl, sizeBytes: doc.sizeBytes, category: DRIVE_CATEGORIES[0] }))
              try {
                const response = await fetch('/api/growth-studio/drive-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assets: selected }) })
                const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not save selected files.')
                setAssets(result.assets ?? []); setMessage(selected.length + ' file(s) added to your TENROUNDS library.')
              } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save files.') }
              resolve()
            } else if (data.action === w.google.picker.Action.CANCEL) resolve()
          }).build()
        picker.setVisible(true)
      })
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Google Drive connection failed.') }
    finally { setBusy(false) }
  }
  const updateCategory = async (id: string, category: string) => {
    const response = await fetch('/api/growth-studio/drive-assets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, category }) })
    const data = await response.json(); if (response.ok) setAssets(data.assets ?? []); else setMessage(data.error || 'Could not update category.')
  }
  const remove = async (id: string) => {
    const response = await fetch('/api/growth-studio/drive-assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const data = await response.json(); if (response.ok) setAssets(data.assets ?? []); else setMessage(data.error || 'Could not remove asset.')
  }
  const visible = filter === 'All assets' ? assets : assets.filter(asset => asset.category === filter)
  return <Panel title="TENROUNDS · Google Drive asset library">
    <div className="rounded-2xl border border-[#C9DCEB] bg-[#F5FAFE] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-black">Your private Google Drive</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Browse your Drive, open folders and select multiple files. Only the files you select are added here. Your originals stay in Google Drive.</p></div><button onClick={connect} disabled={busy} className="rounded-xl bg-[#0878EF] px-5 py-3 text-xs font-black text-white disabled:opacity-50">{busy ? 'Connecting…' : '＋ Add files from Google Drive'}</button></div>
      <p className="mt-3 text-[11px] text-slate-500">Permission: Google Drive file access only (drive.file). No background sync or access to unselected files.</p>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Selected assets ({assets.length})</h3><p className="text-xs text-slate-500">Organise each selected file into the TENROUNDS library.</p></div><select aria-label="Filter assets by category" value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option>All assets</option>{DRIVE_CATEGORIES.map(category=><option key={category}>{category}</option>)}</select></div>
    {visible.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">{visible.map(asset=><article key={asset.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#EAF4FF] text-[#0878EF]">↗</div><div className="min-w-0 flex-1"><a href={asset.url} target="_blank" rel="noreferrer" className="break-words text-sm font-bold text-[#0878EF] hover:underline">{asset.name}</a><p className="mt-1 truncate text-[10px] text-slate-400">{asset.mimeType}</p></div></div><div className="mt-3 flex items-center gap-2"><select aria-label={'Category for '+asset.name} value={asset.category} onChange={e=>updateCategory(asset.id,e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[10px] font-semibold">{DRIVE_CATEGORIES.map(category=><option key={category}>{category}</option>)}</select><button onClick={()=>remove(asset.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-500">Remove</button></div></article>)}</div> : <Empty>{assets.length ? 'No assets in this category.' : 'No Drive files selected yet. Choose Add files from Google Drive to get started.'}</Empty>}
    <p className="mt-4 text-xs text-slate-500">{message}</p>
    <p className="mt-3 text-[10px] leading-5 text-slate-400">Folder browsing is supported in the Picker. With Google’s restricted file-by-file permission, selecting a folder does not automatically import all its contents or future additions. Select the files you want to use.</p>
  </Panel>
}
