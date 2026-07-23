'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { membershipSignups } from '@/lib/db/schema'
import { getMembership, formatRand, type ContractLength } from '@/lib/memberships'
import { generateMembershipPdf } from '@/lib/membership-pdf'
import { sendEmail } from '@/lib/email'
import { business } from '@/lib/business'

export type SignupState = { ok: boolean; error?: string }

const UPTIVO_LINK = 'https://uptivo.page.link/XX5n'

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}
function bool(fd: FormData, key: string) {
  const v = fd.get(key)
  return v === 'true' || v === 'on'
}

// Spam: URLs, emoji, or non-name characters in name fields.
const SPAM_NAME_RE = /https?:\/\/|bit\.ly|www\.|\.com|\.net|[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u

export async function submitMembershipSignup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  // Honeypot — bots fill hidden fields, real users never see this input.
  const honeypot = String(formData.get('website') ?? '')
  if (honeypot) return { ok: true } // Silently succeed so bots don't know they were blocked.

  // ── Selected membership ──
  const membershipId = str(formData, 'membershipId')
  const contractLength = Number(str(formData, 'contractLength')) || 12
  const { tier, membership } = getMembership(
    membershipId.startsWith('anytime') ? 'anytime' : membershipId.startsWith('pairup') ? 'pair-up' : 'off-peak',
    membershipId,
  )
  // Recompute price server-side from the canonical data (never trust the client),
  // but fall back to the posted fee if a special discount applied.
  const postedFee = Number(str(formData, 'monthlyFee')) || 0
  const monthlyFee = postedFee > 0 ? postedFee : membership ? membership.prices[contractLength as ContractLength] : 0
  const totalContractValue = monthlyFee * contractLength
  const membershipType = tier?.name ?? str(formData, 'membershipType')
  const accessType = membership?.name ?? str(formData, 'accessType')

  // ── Member details ──
  const firstName = str(formData, 'firstName')
  const surname = str(formData, 'surname')
  const email = str(formData, 'email')
  const contactNumber = str(formData, 'contactNumber')
  const idNumber = str(formData, 'idNumber')
  const emergencyContactName = str(formData, 'emergencyContactName')
  const emergencyContactNumber = str(formData, 'emergencyContactNumber')

  // ── Payment ──
  const payerType = str(formData, 'payerType') || 'member'
  const accountHolderName = str(formData, 'accountHolderName')
  const accountHolderId = str(formData, 'accountHolderId')
  const accountHolderContact = str(formData, 'accountHolderContact')
  const paymentMethod = str(formData, 'paymentMethod') || 'debit'
  const debitOrderDate = str(formData, 'debitOrderDate')
  const bankAccountType = str(formData, 'bankAccountType')
  const bankName = str(formData, 'bankName')
  const branchName = str(formData, 'branchName')
  const branchCode = str(formData, 'branchCode')
  const accountNumber = str(formData, 'accountNumber')
  const bankAccountHolder = str(formData, 'bankAccountHolder')

  // ── Agreements + signature ──
  const mandateAccepted = bool(formData, 'mandateAccepted')
  const agreeTerms = bool(formData, 'agreeTerms')
  const agreeCancellation = bool(formData, 'agreeCancellation')
  const agreeHealth = bool(formData, 'agreeHealth')
  const agreePrivacy = bool(formData, 'agreePrivacy')
  const signature = str(formData, 'signature')

  // ── Server-side validation ──
  if (!firstName || !surname || !email || !contactNumber || !idNumber || !emergencyContactName || !emergencyContactNumber) {
    return { ok: false, error: 'Please complete all member detail fields.' }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }
  // Reject spam names containing URLs, emoji or other non-name content.
  if (SPAM_NAME_RE.test(firstName) || SPAM_NAME_RE.test(surname)) {
    return { ok: false, error: 'Please enter your real full name.' }
  }
  // Rate limit: max 3 signups per email address per calendar day.
  const { and, gte } = await import('drizzle-orm')
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const recentSignups = await db
    .select({ id: membershipSignups.id })
    .from(membershipSignups)
    .where(and(eq(membershipSignups.email, email.toLowerCase()), gte(membershipSignups.createdAt, todayStart)))
  if (recentSignups.length >= 3) {
    return { ok: false, error: 'Too many signup attempts today. Please try again tomorrow or contact us directly.' }
  }
  if (payerType === 'other' && (!accountHolderName || !accountHolderId || !accountHolderContact)) {
    return { ok: false, error: 'Please complete the account holder details.' }
  }
  if (paymentMethod === 'debit') {
    // Branch name & code are optional (often inferred from the account number).
    if (!debitOrderDate || !bankAccountType || !bankName || !accountNumber || !bankAccountHolder) {
      return { ok: false, error: 'Please complete all banking details.' }
    }
    if (!mandateAccepted) {
      return { ok: false, error: 'You must accept the Debit Order Authority and Mandate.' }
    }
  }
  if (!agreeTerms || !agreeCancellation || !agreeHealth || !agreePrivacy) {
    return { ok: false, error: 'All membership agreements must be accepted.' }
  }
  if (!signature) {
    return { ok: false, error: 'Please add your digital signature.' }
  }

  const record = {
    membershipId,
    membershipType,
    accessType,
    contractLength,
    monthlyFee,
    totalContractValue,
    firstName,
    surname,
    email,
    contactNumber,
    idNumber,
    emergencyContactName,
    emergencyContactNumber,
    payerType,
    accountHolderName,
    accountHolderId,
    accountHolderContact,
    paymentMethod,
    debitOrderDate,
    bankAccountType,
    bankName,
    branchName,
    branchCode,
    accountNumber,
    bankAccountHolder,
    mandateAccepted,
    agreeTerms,
    agreeCancellation,
    agreeHealth,
    agreePrivacy,
    signature,
    status: 'New',
  }

  let insertedId: number
  try {
    const [row] = await db.insert(membershipSignups).values(record).returning({ id: membershipSignups.id })
    insertedId = row.id
  } catch (err) {
    console.error('[v0] Failed to save membership signup:', err)
    return { ok: false, error: 'Something went wrong saving your membership. Please try again.' }
  }

  const fullName = `${firstName} ${surname}`

  // Generate the branded agreement PDF (best-effort — signup already saved).
  let pdfBase64: string | null = null
  try {
    const bytes = await generateMembershipPdf({ id: insertedId, ...record, createdAt: new Date() })
    pdfBase64 = Buffer.from(bytes).toString('base64')
  } catch (err) {
    console.error('[v0] Failed to generate membership PDF:', err)
  }

  const attachments = pdfBase64
    ? [{ filename: `TENROUNDS-Membership-${fullName.replace(/\s+/g, '-')}.pdf`, content: pdfBase64 }]
    : undefined

  // Email to the member.
  await sendEmail({
    to: email,
    subject: 'Welcome To TENROUNDS',
    replyTo: business.email,
    attachments,
    text: `Hi ${fullName},

We hereby confirm your sign up at TENROUNDS.

Rock up in your active gear, a bottle of water and leave the rest to us!

Save time and click on the link below, download the TENROUNDS app, so that we can assign a heart rate monitor to your profile before arrival.
${UPTIVO_LINK}

Looking forward to seeing you!!!

Kind regards,
TENROUNDS Team`,
  })

  // Email to TENROUNDS.
  await sendEmail({
    to: business.email,
    subject: 'New TENROUNDS Membership Signup',
    replyTo: email,
    attachments,
    text: `A new membership signup has been submitted.

MEMBERSHIP
${membershipType} — ${accessType}
Contract: ${contractLength} months
Monthly Fee: ${formatRand(monthlyFee)}
Total Contract Value: ${formatRand(totalContractValue)}

MEMBER
Name: ${fullName}
Email: ${email}
Contact: ${contactNumber}
ID Number: ${idNumber}
Emergency Contact: ${emergencyContactName} (${emergencyContactNumber})

PAYMENT
Responsible: ${payerType === 'other' ? `Different account holder — ${accountHolderName} (${accountHolderId}, ${accountHolderContact})` : 'Member'}
Method: ${paymentMethod === 'cash' ? 'Cash (paid in full, in advance)' : 'Debit Order'}${
      paymentMethod === 'debit'
        ? `
Debit Order Date: ${debitOrderDate === 'last' ? 'Last day of month' : '1st of month'}
Account Type: ${bankAccountType}
Bank: ${bankName} (${branchName}, branch code ${branchCode})
Account Number: ${accountNumber}
Account Holder: ${bankAccountHolder}`
        : ''
    }

The signed membership agreement PDF is attached.`,
  })

  revalidatePath('/admin')
  return { ok: true }
}
