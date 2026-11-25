import type { Metadata } from 'next'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { OperationsLogin } from '@/components/operations/operations-login'
import { GrowthStudioSection } from '@/components/growth-studio/growth-studio-section'

export const metadata: Metadata = { title: 'TENROUNDS | Growth Studio', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const allowed = new Set(['strategy', 'campaigns', 'calendar', 'creative', 'performance', 'assets', 'reviews'])

export default async function GrowthStudioSectionPage({ params }: { params: Promise<{ section: string }> }) {
  if (!(await isOperationsAuthed())) return <OperationsLogin />
  const { section } = await params
  return <GrowthStudioSection section={allowed.has(section) ? section : 'strategy'} />
}
