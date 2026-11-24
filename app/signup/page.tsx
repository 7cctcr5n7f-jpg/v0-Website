import type { Metadata } from 'next'
import { PageHero } from '@/components/page-hero'
import { MembershipSignupForm, type Selection } from '@/components/forms/membership-signup-form'
import {
  applyMembershipPriceOverrides,
  getMembership,
  type ContractLength,
} from '@/lib/memberships'
import { getMembershipDiscounts, getMembershipPriceOverrides } from '@/lib/content-queries'
import { computePricing } from '@/lib/memberships'

export const metadata: Metadata = {
  title: 'Join TENROUNDS — Membership Signup',
  description:
    "You're one step away from joining Pretoria East's most effective 30-minute fitness experience. Complete your TENROUNDS membership signup.",
  alternates: { canonical: '/signup' },
  robots: { index: false, follow: false },
}

function tierIdFor(membershipId: string): string {
  if (membershipId.startsWith('anytime')) return 'anytime'
  if (membershipId.startsWith('pairup')) return 'pair-up'
  return 'off-peak'
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; len?: string }>
}) {
  const params = await searchParams
  const [discounts, priceOverrides] = await Promise.all([
    getMembershipDiscounts(),
    getMembershipPriceOverrides(),
  ])
  const tiers = applyMembershipPriceOverrides(priceOverrides)

  // Default to a sensible plan when the visitor arrives without a selection.
  const membershipId =
    params.m && getMembership(tierIdFor(params.m), params.m, tiers).membership
      ? params.m
      : 'anytime-twice'
  const lengthRaw = Number(params.len)
  const contractLength: ContractLength = [3, 6, 12].includes(lengthRaw) ? (lengthRaw as ContractLength) : 12

  const { tier, membership } = getMembership(tierIdFor(membershipId), membershipId, tiers)
  const resolvedTier = tier ?? tiers[0]
  const resolvedMembership = membership ?? resolvedTier.memberships[0]

  const discountPercent = discounts[resolvedMembership.id] ?? 0
  const pricing = computePricing(resolvedMembership, contractLength, discountPercent)
  const monthlyFee = pricing.monthly
  const totalContractValue = monthlyFee * contractLength

  // Savings, all measured against the entry-level 3-month rate.
  const baselineMonthly = pricing.base // 3-month rate
  const commitmentSaving = Math.max(0, baselineMonthly - pricing.listMonthly)
  const discountSaving = Math.max(0, pricing.listMonthly - monthlyFee)
  const monthlySaving = Math.max(0, baselineMonthly - monthlyFee)
  const totalSaving = monthlySaving * contractLength

  const selection: Selection = {
    membershipId: resolvedMembership.id,
    membershipType: resolvedTier.name,
    accessType: resolvedMembership.name,
    contractLength,
    monthlyFee,
    totalContractValue,
    perMember: !!resolvedTier.perMember,
    baselineMonthly,
    commitmentSaving,
    discountSaving,
    monthlySaving,
    totalSaving,
    discountPercent: pricing.discountPercent,
  }

  return (
    <main>
      <PageHero
        eyebrow="Membership Signup"
        title="Welcome To TENROUNDS"
        description="You're one step away from joining Pretoria East's most effective 30-minute fitness experience."
        image="/strength-training.png"
        imageAlt="Athlete training at TENROUNDS"
      />

      <section className="bg-background pb-20 pt-12 lg:pb-28 lg:pt-16">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <MembershipSignupForm selection={selection} />
        </div>
      </section>
    </main>
  )
}
