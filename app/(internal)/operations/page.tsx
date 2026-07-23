import type { Metadata } from 'next'
import { asc, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  shiftAssignments,
  shiftSettings,
  staff,
  trialBookingNotes,
  trialBookings,
  waterAuditLog,
  waterCredits,
} from '@/lib/db/schema'
import { isOperationsAuthed } from '@/lib/operations-auth'
import { getMembershipSignups } from '@/lib/content-queries'
import { OperationsLogin } from '@/components/operations/operations-login'
import { OperationsDashboard } from '@/components/operations/operations-dashboard'

export const metadata: Metadata = {
  title: 'Operations',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function OperationsPage() {
  if (!(await isOperationsAuthed())) {
    return <OperationsLogin />
  }

  const [allStaff, allShiftSettings, allAssignments, allBookings, allNotes, allSignups, allWaterCredits, allAuditLog] =
    await Promise.all([
      db.select().from(staff).orderBy(asc(staff.name)),
      db.select().from(shiftSettings).orderBy(asc(shiftSettings.id)),
      db.select().from(shiftAssignments).orderBy(desc(shiftAssignments.shiftDate), asc(shiftAssignments.shiftType)),
      db.select().from(trialBookings).orderBy(desc(trialBookings.createdAt)),
      db.select().from(trialBookingNotes).orderBy(asc(trialBookingNotes.createdAt)),
      getMembershipSignups(),
      db.select().from(waterCredits).orderBy(asc(waterCredits.memberName)),
      db.select().from(waterAuditLog).orderBy(desc(waterAuditLog.createdAt)),
    ])

  return (
    <OperationsDashboard
      staff={allStaff}
      shiftSettings={allShiftSettings}
      assignments={allAssignments}
      bookings={allBookings}
      notes={allNotes}
      signups={allSignups}
      waterCredits={allWaterCredits}
      waterAuditLog={allAuditLog}
    />
  )
}
