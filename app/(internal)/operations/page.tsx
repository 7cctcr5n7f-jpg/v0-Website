import type { Metadata } from 'next'
import { asc, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  sessionPurchases,
  shiftAssignments,
  shiftSettings,
  staff,
  stockConfirmations,
  stockItems,
  trialBookingNotes,
  trialBookings,
  waterAuditLog,
  waterCredits,
} from '@/lib/db/schema'
import { getOperationsActionToken, isOperationsAuthed } from '@/lib/operations-auth'
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

  const [
    allStaff,
    allShiftSettings,
    allAssignments,
    allBookings,
    allNotes,
    allSignups,
    allSessionPurchases,
    allWaterCredits,
    allAuditLog,
    allStockItems,
    lastStockConfirmations,
  ] = await Promise.all([
    db.select().from(staff).orderBy(asc(staff.name)),
    db.select().from(shiftSettings).orderBy(asc(shiftSettings.id)),
    db.select().from(shiftAssignments).orderBy(desc(shiftAssignments.shiftDate), asc(shiftAssignments.shiftType)),
    db.select().from(trialBookings).orderBy(desc(trialBookings.createdAt)),
    db.select().from(trialBookingNotes).orderBy(asc(trialBookingNotes.createdAt)),
    getMembershipSignups(),
    db.select().from(sessionPurchases).orderBy(desc(sessionPurchases.paidAt), desc(sessionPurchases.createdAt)),
    db.select().from(waterCredits).orderBy(asc(waterCredits.memberName)),
    db.select().from(waterAuditLog).orderBy(desc(waterAuditLog.createdAt)),
    db.select().from(stockItems).orderBy(asc(stockItems.sortOrder), asc(stockItems.id)),
    db.select().from(stockConfirmations).orderBy(desc(stockConfirmations.confirmedAt)).limit(1),
  ])

  return (
    <OperationsDashboard
      actionAuthToken={getOperationsActionToken()}
      staff={allStaff}
      shiftSettings={allShiftSettings}
      assignments={allAssignments}
      bookings={allBookings}
      notes={allNotes}
      signups={allSignups}
      sessionPurchases={allSessionPurchases}
      waterCredits={allWaterCredits}
      waterAuditLog={allAuditLog}
      stockItems={allStockItems}
      lastStockConfirmation={lastStockConfirmations[0] ?? null}
    />
  )
}
