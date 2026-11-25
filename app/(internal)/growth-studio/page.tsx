import type { Metadata } from 'next'
import './growth-studio.css'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { OperationsLogin } from '@/components/operations/operations-login'
import { GrowthStudio } from '@/components/growth-studio/growth-studio'
import { ProjectMemoryPanel } from '@/components/growth-studio/project-memory-panel'

export const metadata: Metadata = { title: 'TENROUNDS | Growth Studio', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function GrowthStudioPage() {
  if (!(await isOperationsAuthed())) return <OperationsLogin />
  return <><GrowthStudio /><ProjectMemoryPanel /></>
}
