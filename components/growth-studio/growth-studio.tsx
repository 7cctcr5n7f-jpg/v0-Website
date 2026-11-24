'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, ExternalLink, FileImage, FolderOpen, Instagram, Layers3, Megaphone, Plus, Target, Users, Video, WandSparkles } from 'lucide-react'

type Campaign = { id: string; title: string; objective: string; status: string; startDate: string; endDate: string; image: string }
type Post = { id: string; campaignId: string; title: string; caption: string; date: string; time: string; platforms: string[]; status: 'draft' | 'approved' | 'scheduled' | 'published'; format: 'Reel' | 'Carousel' | 'Post' | 'Story'; image: string }
type State = { campaigns: Campaign[]; posts: Post[]; activeCampaignId: string }

const starter: State = {
  campaigns: [
    { id: 'dec-finish-strong', title: 'December: Finish Strong', objective: 'Generate free-trial bookings before the holiday slowdown.', status: 'planning', startDate: '2026-12-01', endDate: '2026-12-14', image: '/hero-athlete.png' },
    { id: 'jan-new-strength', title: 'January: New Year, New Strength', objective: 'Convert New Year motivation into consistent trial bookings and memberships.', status: 'idea', startDate: '2027-01-01', endDate: '2027-01-31', image: '/community-members.png' },
    { id: 'feb-bring-person', title: 'February: Bring Your Person', objective: 'Turn member advocacy into qualified referrals.', status: 'idea', startDate: '2027-02-01', endDate: '2027-02-28', image: '/community.png' }
  ],
  posts: [
    { id: 'p1', campaignId: 'dec-finish-strong', title: 'Finish the year strong', caption: 'December starts now. Your first TENROUNDS session is FREE. No payment. No obligation. Book your free trial.', date: '2026-12-01', time: '17:30', platforms: ['Instagram', 'Facebook'], status: 'draft', format: 'Reel', image: '/hero-athlete.png' },
    { id: 'p2', campaignId: 'dec-finish-strong', title: 'Why 30 minutes works', caption: 'Ten rounds. Thirty minutes. A workout that fits real life.', date: '2026-12-03', time: '12:30', platforms: ['Instagram', 'Facebook'], status: 'draft', format: 'Carousel', image: '/gym-stations.png' },
    { id: 'p3', campaignId: 'dec-finish-strong', title: 'Real members. Real results.', caption: 'The best part of TENROUNDS is the people who show up for themselves and each other.', date: '2026-12-05', time: '09:00', platforms: ['Instagram', 'Facebook'], status: 'draft', format: 'Reel', image: '/community-members.png' },
    { id: 'p4', campaignId: 'dec-finish-strong', title: 'Your first session is free', caption: 'Curious about TENROUNDS? Try a session on us. No payment. No obligation.', date: '2026-12-08', time: '18:00', platforms: ['Instagram', 'Facebook'], status: 'draft', format: 'Post', image: '/boxing-gloves-perk.png' },
    { id: 'p5', campaignId: 'dec-finish-strong', title: 'Member story', caption: 'Small steps. Strong habits. Meet a member who made 30 minutes part of her week.', date: '2026-12-10', time: '17:30', platforms: ['Instagram', 'Facebook'], status: 'draft', format: 'Reel', image: '/member-portrait.png' },
    { id: 'p6', campaignId: 'dec-finish-strong', title: 'The 10-round challenge', caption: 'Can you complete all ten rounds? Save this challenge and tag your training partner.', date: '2026-12-12', time: '10:00', platforms: ['Instagram', 'Facebook'], status: 'draft', format: 'Story', image: '/gym-stations.png' }
  ],
  activeCampaignId: 'dec-finish-strong'
}
const seasonal = [
  { month: 'JAN', title: 'New Year, New Strength', image: '/community-members.png' },
  { month: 'FEB', title: 'Bring Your Person', image: '/community.png' },
  { month: 'MAY – JUN', title: 'Winter Warrior', image: '/hero-athlete.png' },
  { month: 'AUG – SEP', title: 'Spring Starts Here', image: '/member-portrait.png' }
]
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const iso = (y: number, m: number, d: number) => [y, String(m + 1).padStart(2, '0'), String(d).padStart(2, '0')].join('-')

export function GrowthStudio() {
  const [hub, setHub] = useState<State>(starter)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [month, setMonth] = useState({ year: 2026, month: 11 })
  const [selectedId, setSelectedId] = useState<string | null>('p1')

  useEffect(() => {
    fetch('/api/growth-studio/state', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.state) setHub({ campaigns: data.state.campaigns ?? starter.campaigns, posts: data.state.posts ?? starter.posts, activeCampaignId: data.state.activeCampaignId ?? starter.activeCampaignId })
    }).catch(() => undefined)
  }, [])

  const save = async (next: State) => {
    setHub(next); setSaving(true)
    try {
      const response = await fetch('/api/growth-studio/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      if (!response.ok) throw new Error('Save failed')
      setNotice('Saved')
    } catch { setNotice('Save failed') }
    finally { setSaving(false); window.setTimeout(() => setNotice(''), 2500) }
  }

  const campaign = hub.campaigns.find(c => c.id === hub.activeCampaignId) ?? hub.campaigns[0]
  const selectedPost = hub.posts.find(p => p.id === selectedId) ?? null
  const days = useMemo(() => {
    const first = new Date(month.year, month.month, 1)
    const offset = (first.getDay() + 6) % 7
    const total = new Date(month.year, month.month + 1, 0).getDate()
    return [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  }, [month])
  const monthName = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(new Date(month.year, month.month, 1))
  const changeMonth = (by: number) => setMonth(s => { const d = new Date(s.year, s.month + by, 1); return { year: d.getFullYear(), month: d.getMonth() } })

  const toggleApproval = async (post: Post) => save({ ...hub, posts: hub.posts.map(p => p.id === post.id ? { ...p, status: p.status === 'approved' ? 'draft' : 'approved' } : p) })
  const addPost = async () => {
    const title = window.prompt('What should this post be about?')
    if (!title?.trim()) return
    const post: Post = { id: crypto.randomUUID(), campaignId: campaign?.id ?? '', title: title.trim(), caption: '', date: iso(month.year, month.month, 1), time: '17:30', platforms: ['Instagram', 'Facebook'], status: 'draft', format: 'Post', image: '/hero-athlete.png' }
    await save({ ...hub, posts: [...hub.posts, post] }); setSelectedId(post.id)
  }
  const addCampaign = async () => {
    const title = window.prompt('Campaign name')
    if (!title?.trim()) return
    const item: Campaign = { id: crypto.randomUUID(), title: title.trim(), objective: 'Define the campaign objective together.', status: 'idea', startDate: iso(month.year, month.month, 1), endDate: iso(month.year, month.month, 28), image: '/hero-athlete.png' }
    await save({ ...hub, campaigns: [item, ...hub.campaigns], activeCampaignId: item.id })
  }

  return <div className="growth-hub-shell">
    <aside className="growth-sidebar">
      <Link href="/growth-studio" className="growth-brand"><Image src="/logo-white.png" alt="TENROUNDS" width={205} height={54} priority/><span>30 MINUTES. 10 ROUNDS. ALL HEART.</span></Link>
      <div className="growth-side-title"><BarChart3 size={23}/><div><strong>Growth Hub</strong><small>Plan. Analyse. Create. Grow.</small></div></div>
      <nav className="growth-nav">
        <Link href="/growth-studio" className="growth-nav-link"><Activity size={18}/>Overview</Link>
        <Link href="/KPI" className="growth-nav-link"><BarChart3 size={18}/>Analysis Cockpit</Link>
        <Link href="/growth-studio" className="growth-nav-link active"><Megaphone size={18}/>Growth Studio</Link>
        <div className="growth-nav-label">GROWTH STUDIO</div>
        <a href="#strategy" className="growth-nav-link"><ExternalLink size={18}/>ChatGPT Strategy</a>
        <a href="#campaigns" className="growth-nav-link"><Layers3 size={18}/>Campaigns</a>
        <a href="#calendar" className="growth-nav-link"><CalendarDays size={18}/>Content Calendar</a>
        <a href="#creative" className="growth-nav-link"><FileImage size={18}/>Creative Studio</a>
        <a href="#performance" className="growth-nav-link"><BarChart3 size={18}/>Performance</a>
        <a href="#assets" className="growth-nav-link"><FolderOpen size={18}/>Assets &amp; Templates</a>
      </nav>
      <div className="growth-sidebar-foot"><span>OWNER WORKSPACE</span><strong>Private · Approval-first</strong></div>
    </aside>
    <main className="growth-main">
      <header className="growth-topbar"><div><h1>TENROUNDS Growth Hub</h1><p>Your central business growth workspace for members, marketing and performance.</p></div><div className="growth-topbar-meta"><span><i className="live-dot"/>Connected workspace</span><span className="growth-avatar">RR</span></div></header>
      <div className="growth-content">
        <div className="growth-page-head"><div className="growth-page-title"><Megaphone size={29}/><div><h2>Growth Studio</h2><p>Collaborate, plan and execute campaigns that grow TENROUNDS.</p></div></div><nav className="growth-tabs"><Link href="/growth-studio" className="selected"><Activity size={15}/>Overview</Link><a href="#strategy"><ExternalLink size={15}/>ChatGPT Strategy</a><a href="#campaigns"><Layers3 size={15}/>Campaigns</a><a href="#calendar"><CalendarDays size={15}/>Calendar</a><a href="#creative"><FileImage size={15}/>Creative Studio</a><a href="#performance"><BarChart3 size={15}/>Performance</a></nav></div>
        <section className="growth-hero"><div className="growth-hero-copy"><span>GROWTH STUDIO</span><h2>PLAN. CREATE. PUBLISH. <em>GROW.</em></h2><p>Turn insights into campaigns, content and more members for TENROUNDS.</p></div><Image src="/hero-athlete.png" alt="TENROUNDS training" fill priority className="growth-hero-image"/><ul><li><Check size={16}/>More trial bookings</li><li><Check size={16}/>Higher conversions</li><li><Check size={16}/>Stronger member retention</li></ul></section>
        <section className="growth-metrics" id="performance">
          <div><Users/><span>Trial Bookings</span><strong>—</strong><small>Connect verified booking data</small></div><div><Users/><span>New Members</span><strong>—</strong><small>Connect membership conversions</small></div><div><Activity/><span>Retention Rate</span><strong>—</strong><small>Requires reliable member history</small></div><div><Megaphone/><span>Campaign ROI</span><strong>—</strong><small>Awaiting attributed spend and revenue</small></div>
        </section>
        <section className="growth-workspace">
          <div className="growth-panel growth-chat-panel growth-chatgpt-panel" id="strategy">
            <div className="growth-panel-head"><h3><ExternalLink/>Marketing Intelligence</h3><span className="setup-status">ChatGPT-led</span></div>
            <div className="growth-chatgpt-content">
              <div className="growth-chatgpt-mark">✳</div>
              <span className="growth-eyebrow">YOUR MARKETING BRAIN</span>
              <h3>Strategy lives in ChatGPT.</h3>
              <p>Use this ChatGPT conversation as the central intelligence for TENROUNDS. Bring campaign ideas, performance results, creative reviews and business questions here. I’ll help decide what to do next, using the context and data you share.</p>
              <a className="growth-chatgpt-button" href="https://chatgpt.com/" target="_blank" rel="noreferrer">Open ChatGPT <ExternalLink size={15}/></a>
              <small>Continue the existing TENROUNDS Growth Studio conversation in ChatGPT. The website does not run a separate AI model or background agent.</small>
              <div className="growth-chatgpt-principles"><span><Check size={13}/>One strategic brain</span><span><Check size={13}/>No extra API usage</span><span><Check size={13}/>Human approval before publishing</span></div>
            </div>
            <div className="growth-chat-foot"><span>ChatGPT is the strategy workspace</span><span>{saving ? 'Saving…' : notice || 'Private'}</span></div>
          </div>
          <div className="growth-panel growth-campaign-panel" id="campaigns">
            <div className="growth-panel-head"><h3><Target/>Active Campaigns</h3><button className="text-action" onClick={addCampaign}>+ New</button></div>
            {campaign ? <div className="growth-feature-campaign"><div className="campaign-art"><Image src={campaign.image} alt="" fill/><span>{campaign.status.toUpperCase()}</span><strong>{campaign.title}</strong></div><h4>{campaign.title}</h4><p>{campaign.objective}</p><div className="campaign-meta"><span><CalendarDays size={14}/>{campaign.startDate} – {campaign.endDate}</span><span><Target size={14}/>Membership growth</span></div><div className="campaign-stats"><div><strong>{hub.posts.filter(p => p.campaignId === campaign.id).length}</strong><small>Content pieces</small></div><div><strong>{hub.posts.filter(p => p.campaignId === campaign.id && p.status === 'approved').length}</strong><small>Approved</small></div><div><strong>{hub.posts.filter(p => p.campaignId === campaign.id && p.status === 'scheduled').length}</strong><small>Scheduled</small></div></div></div> : <p className="empty-state">Create your first campaign to get started.</p>}
            <button className="campaign-switch" onClick={() => { const next = hub.campaigns.find(c => c.id !== campaign?.id); if (next) setHub({ ...hub, activeCampaignId: next.id }) }}>View next campaign <ArrowRight size={14}/></button>
          </div>
          <div className="growth-panel growth-calendar-panel" id="calendar">
            <div className="growth-panel-head"><h3><CalendarDays/>Content Calendar</h3><button className="primary-small" onClick={addPost}><Plus size={14}/>Create Post</button></div>
            <div className="calendar-toolbar"><div><button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={17}/></button><strong>{monthName}</strong><button className="icon-button" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={17}/></button></div><span>Month view</span></div>
            <div className="calendar-grid">{weekdays.map(d => <div className="calendar-weekday" key={d}>{d}</div>)}{days.map((day, index) => { const date = day ? iso(month.year, month.month, day) : ''; const posts = hub.posts.filter(p => p.date === date); return <div className={'calendar-day ' + (!day ? 'blank' : '')} key={index}><span>{day}</span>{posts.slice(0, 2).map(post => <button key={post.id} className={'calendar-post ' + post.status} onClick={() => setSelectedId(post.id)}><Image src={post.image} alt="" fill/><i>{post.format === 'Reel' ? <Video size={11}/> : post.format === 'Carousel' ? <Layers3 size={11}/> : <Instagram size={11}/>}</i><b>{post.title}</b></button>)}</div> })}</div>
            <div className="calendar-legend"><span><i className="draft-dot"/>Draft</span><span><i className="approved-dot"/>Approved</span><span><i className="scheduled-dot"/>Scheduled</span></div>
          </div>
        </section>
        <section className="growth-lower">
          <div className="growth-panel growth-pipeline"><div className="growth-panel-head"><h3><Target/>Campaign Pipeline</h3><span>Approval-first workflow</span></div><div className="pipeline-steps"><div className="current"><WandSparkles/><strong>Strategy</strong><small>Plan &amp; collaborate</small></div><div><FileImage/><strong>Creative</strong><small>Design &amp; create</small></div><div><Check/><strong>Approval</strong><small>Your review</small></div><div><CalendarDays/><strong>Scheduled</strong><small>Publish &amp; run</small></div><div><BarChart3/><strong>Results</strong><small>Measure &amp; optimise</small></div></div>
            {selectedPost && <div className="post-detail"><div className="post-detail-copy"><span>SELECTED CONTENT · {selectedPost.date} · {selectedPost.time}</span><strong>{selectedPost.title}</strong><p>{selectedPost.caption || 'Caption to be developed together.'}</p><small>{selectedPost.platforms.join(' + ')} · {selectedPost.format} · {selectedPost.status}</small></div><button className={selectedPost.status === 'approved' ? 'approve-button approved' : 'approve-button'} onClick={() => void toggleApproval(selectedPost)}><Check size={15}/>{selectedPost.status === 'approved' ? 'Approved' : 'Approve post'}</button></div>}
          </div>
          <div className="growth-panel growth-seasonal"><div className="growth-panel-head"><h3><CalendarDays/>Seasonal Growth Plan</h3><span>Annual campaign themes</span></div><div className="seasonal-grid">{seasonal.map(item => <div className="seasonal-tile" key={item.month}><Image src={item.image} alt="" fill/><span>{item.month}</span><strong>{item.title}</strong></div>)}</div></div>
        </section>
        <section className="growth-footer-links"><div id="creative"><WandSparkles/><strong>Creative Studio</strong><span>Canva designs, video and reusable templates</span><button onClick={() => setNotice('Canva API connection is required to create and edit designs from this website.')}>Connect Canva <ArrowRight size={13}/></button></div><div id="assets"><FolderOpen/><strong>Brand Assets</strong><span>Use TENROUNDS photography, logos and existing Canva designs</span><a href="https://www.canva.com/" target="_blank" rel="noreferrer">Open Canva <ArrowRight size={13}/></a></div><div><Instagram/><strong>Publishing setup</strong><span>Instagram scheduling is available through the connected publishing service. Facebook Page publishing needs its own verified route.</span><span className="setup-status">Approval required before every post</span></div></section>
      </div>
    </main>
  </div>
}
