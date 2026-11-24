import { createHash, timingSafeEqual } from 'node:crypto'

export type AgentScope = 'site:read' | 'metrics:read'
type AgentKey = { id: string; sha256: string; scopes: AgentScope[]; expiresAt?: string }

const responseHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  Vary: 'Authorization',
}

export function agentJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: responseHeaders })
}

function isAgentKey(value: unknown): value is AgentKey {
  if (!value || typeof value !== 'object') return false
  const key = value as Record<string, unknown>
  return (
    typeof key.id === 'string' && /^[a-z0-9-]{1,64}$/.test(key.id) &&
    typeof key.sha256 === 'string' && /^[a-f0-9]{64}$/.test(key.sha256) &&
    Array.isArray(key.scopes) && key.scopes.length > 0 &&
    key.scopes.every((scope) => scope === 'site:read' || scope === 'metrics:read') &&
    (key.expiresAt === undefined ||
      (typeof key.expiresAt === 'string' &&
        /^\d{4}-\d{2}-\d{2}T/.test(key.expiresAt) &&
        Number.isFinite(Date.parse(key.expiresAt))))
  )
}

export function authorizeAgentRequest(
  request: Request,
  scope: AgentScope,
  config = process.env.AGENT_API_KEYS,
): Response | null {
  let keys: AgentKey[]
  try {
    const parsed: unknown = JSON.parse(config ?? '')
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50 || !parsed.every(isAgentKey)) {
      return agentJson({ error: 'Agent API is not configured.' }, 503)
    }
    keys = parsed
  } catch {
    return agentJson({ error: 'Agent API is not configured.' }, 503)
  }

  const match = /^Bearer ([A-Za-z0-9_-]{43,128})$/i.exec(request.headers.get('authorization') ?? '')
  if (!match) {
    const response = agentJson({ error: 'A valid Bearer API key is required.' }, 401)
    response.headers.set('WWW-Authenticate', 'Bearer realm="TENROUNDS agents"')
    return response
  }

  const hash = createHash('sha256').update(match[1]).digest()
  const key = keys.find((candidate) => timingSafeEqual(hash, Buffer.from(candidate.sha256, 'hex')))
  if (!key || (key.expiresAt && Date.parse(key.expiresAt) <= Date.now())) {
    const response = agentJson({ error: 'Invalid or expired API key.' }, 401)
    response.headers.set('WWW-Authenticate', 'Bearer realm="TENROUNDS agents"')
    return response
  }
  if (!key.scopes.includes(scope)) return agentJson({ error: 'API key does not have the required scope.' }, 403)
  return null
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
}

export function agentReportWindow(url: URL, now = new Date()) {
  const today = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const defaultStart = new Date(`${today}T00:00:00+02:00`)
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29)
  const start = url.searchParams.get('start') ??
    new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const end = url.searchParams.get('end') ?? today
  if (
    [...url.searchParams.keys()].some((key) => key !== 'start' && key !== 'end') ||
    url.searchParams.getAll('start').length > 1 || url.searchParams.getAll('end').length > 1 ||
    !validDate(start) || !validDate(end) || start > end ||
    (Date.parse(end) - Date.parse(start)) / 86400000 >= 93
  ) {
    throw new Error('Use start/end as YYYY-MM-DD, ordered, with no more than 93 inclusive days.')
  }
  return {
    start,
    end,
    from: new Date(`${start}T00:00:00+02:00`),
    until: new Date(new Date(`${end}T00:00:00+02:00`).getTime() + 86400000),
  }
}
