import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'tr_ops'
// The Operations Dashboard passcode is stored in OPERATIONS_PASSWORD env var.
// Falls back to '3011' for local dev if not set.
function getPasscode(): string {
  return process.env.OPERATIONS_PASSWORD || '3011'
}

function expectedToken(passcode: string): string {
  return createHmac('sha256', passcode).update('tenrounds-ops-v1').digest('hex')
}

export function verifyOpsPasscode(input: string): boolean {
  const passcode = getPasscode()
  const a = Buffer.from(input)
  const b = Buffer.from(passcode)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function isOperationsAuthed(): Promise<boolean> {
  const passcode = getPasscode()
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return false
  const expected = expectedToken(passcode)
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function setOperationsCookie() {
  const passcode = getPasscode()
  ;(await cookies()).set(COOKIE_NAME, expectedToken(passcode), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearOperationsCookie() {
  ;(await cookies()).delete(COOKIE_NAME)
}
