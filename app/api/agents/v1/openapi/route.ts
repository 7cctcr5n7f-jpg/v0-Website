import { business } from '@/lib/business'
import { agentJson } from '@/lib/agent-api'

function jsonResponse(description: string, schemaName: string) {
  return {
    description,
    content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } },
  }
}

export function GET() {
  return agentJson({
    openapi: '3.1.0',
    info: {
      title: 'TENROUNDS read-only agent API',
      version: '1.0.0',
      description: 'Public site inventory and aggregate business counts. No member records or write operations. Use a separate scoped Bearer key per agent.',
    },
    servers: [{ url: business.url }],
    components: {
      securitySchemes: {
        agentKey: { type: 'http', scheme: 'bearer', description: 'Agent API key; never put it in a query string.' },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: { error: { type: 'string' } },
        },
        Counts: {
          type: 'object',
          required: ['trialBookings', 'membershipSignups'],
          properties: {
            trialBookings: { type: 'integer', minimum: 0 },
            membershipSignups: { type: 'integer', minimum: 0 },
          },
        },
        SiteInventory: {
          type: 'object',
          required: ['version', 'generatedAt', 'business', 'pages', 'memberships', 'access'],
          properties: {
            version: { type: 'string' },
            generatedAt: { type: 'string', format: 'date-time' },
            business: { type: 'object', additionalProperties: true },
            sitemap: { type: 'string', format: 'uri' },
            robots: { type: 'string', format: 'uri' },
            pages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['path', 'url'],
                properties: {
                  path: { type: 'string' },
                  url: { type: 'string', format: 'uri' },
                  inspect: { type: 'string' },
                },
              },
            },
            memberships: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'tier', 'name', 'perMember', 'currency', 'prices'],
                properties: {
                  id: { type: 'string' },
                  tier: { type: 'string' },
                  name: { type: 'string' },
                  perMember: { type: 'boolean' },
                  currency: { type: 'string', enum: ['ZAR'] },
                  prices: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['contractMonths', 'regularMonthly', 'monthly', 'discountPercent'],
                      properties: {
                        contractMonths: { type: 'integer', enum: [3, 6, 12] },
                        regularMonthly: { type: 'number' },
                        monthly: { type: 'number' },
                        discountPercent: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
            access: { type: 'object', additionalProperties: true },
          },
        },
        ConversionReport: {
          type: 'object',
          required: ['version', 'generatedAt', 'period', 'totals', 'daily', 'definitions', 'funnel'],
          properties: {
            version: { type: 'string' },
            generatedAt: { type: 'string', format: 'date-time' },
            period: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date' },
                end: { type: 'string', format: 'date' },
                timeZone: { type: 'string' },
                inclusive: { type: 'boolean' },
              },
            },
            totals: { $ref: '#/components/schemas/Counts' },
            daily: {
              type: 'array',
              items: {
                allOf: [
                  { $ref: '#/components/schemas/Counts' },
                  { type: 'object', required: ['date'], properties: { date: { type: 'string', format: 'date' } } },
                ],
              },
            },
            definitions: { type: 'object', additionalProperties: { type: 'string' } },
            funnel: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
    security: [{ agentKey: [] }],
    paths: {
      '/api/agents/v1/site': {
        get: {
          operationId: 'getSiteInventory',
          description: 'Requires site:read. Lists crawlable public pages, business information and live membership prices.',
          responses: {
            '200': jsonResponse('Public website inventory and pricing.', 'SiteInventory'),
            '401': jsonResponse('Invalid, missing or expired Bearer key.', 'Error'),
            '403': jsonResponse('Key does not have site:read scope.', 'Error'),
            '503': jsonResponse('API not configured, or database unavailable.', 'Error'),
          },
        },
      },
      '/api/agents/v1/reports': {
        get: {
          operationId: 'getConversionCounts',
          description: 'Requires metrics:read. Saved booking/application counts only, not visitors or drop-off rates.',
          parameters: ['start', 'end'].map((name) => ({
            name,
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date' },
            description: `${name === 'start' ? 'First' : 'Last'} inclusive South African calendar date. Defaults to the last 30 days; maximum 93 days.`,
          })),
          responses: {
            '200': jsonResponse('Daily saved submission counts and definitions.', 'ConversionReport'),
            '400': jsonResponse('Invalid or excessive date range or unsupported parameters.', 'Error'),
            '401': jsonResponse('Invalid, missing or expired Bearer key.', 'Error'),
            '403': jsonResponse('Key does not have metrics:read scope.', 'Error'),
            '503': jsonResponse('API not configured, or database unavailable.', 'Error'),
          },
        },
      },
    },
  })
}
