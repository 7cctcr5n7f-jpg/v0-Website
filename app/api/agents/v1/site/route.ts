import { agentJson, authorizeAgentRequest } from '@/lib/agent-api'
import { business } from '@/lib/business'
import { getMembershipDiscounts, getMembershipPriceOverrides } from '@/lib/content-queries'
import { applyMembershipPriceOverrides, computePricing, contractLengths } from '@/lib/memberships'
import { publicSiteRoutes } from '@/lib/site-routes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = authorizeAgentRequest(request, 'site:read')
  if (denied) return denied

  try {
    const [discounts, overrides] = await Promise.all([
      getMembershipDiscounts(),
      getMembershipPriceOverrides(),
    ])
    return agentJson({
      version: '1.0',
      generatedAt: new Date().toISOString(),
      business,
      sitemap: `${business.url}/sitemap.xml`,
      robots: `${business.url}/robots.txt`,
      pages: publicSiteRoutes.map(({ path }) => ({
        path,
        url: `${business.url}${path}`,
        inspect: 'Fetch the public HTML for current titles, descriptions, canonical URLs, headings, links and JSON-LD.',
      })),
      memberships: applyMembershipPriceOverrides(overrides).flatMap((tier) =>
        tier.memberships.map((membership) => ({
          id: membership.id,
          tier: tier.name,
          name: membership.name,
          perMember: Boolean(tier.perMember),
          currency: 'ZAR',
          prices: contractLengths.map(({ value }) => {
            const pricing = computePricing(membership, value, discounts[membership.id] ?? 0)
            return {
              contractMonths: value,
              regularMonthly: pricing.listMonthly,
              monthly: pricing.monthly,
              discountPercent: pricing.discountPercent,
            }
          }),
        })),
      ),
      access: {
        readOnly: true,
        personalData: false,
        changes: 'Propose source-code changes in a GitHub pull request. This API has no write endpoints.',
      },
    })
  } catch {
    console.error('[agents/site] Failed to load public site data.')
    return agentJson({ error: 'Site data is temporarily unavailable.' }, 503)
  }
}
