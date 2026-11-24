import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import test from 'node:test'
import { agentReportWindow, authorizeAgentRequest } from '../lib/agent-api.ts'
import { analyticsMode, analyticsPath, FUNNEL_EVENTS, resolveMeasurementId, validMeasurementId } from '../lib/funnel-events.ts'
import { publicSiteRoutes } from '../lib/site-routes.ts'

const token = 'a'.repeat(43)
const key = {
  id: 'test-agent',
  sha256: createHash('sha256').update(token).digest('hex'),
  scopes: ['site:read'],
}
const request = (authorization) => new Request('https://example.test/api/agents/v1/site', {
  headers: authorization ? { authorization } : {},
})
const config = (...keys) => JSON.stringify(keys)

test('agent API fails closed when absent or misconfigured', () => {
  for (const raw of ['', 'not-json', '[]', '{}', config({ ...key, sha256: 'bad' }), config({ ...key, scopes: ['admin:write'] })]) {
    assert.equal(authorizeAgentRequest(request(`Bearer ${token}`), 'site:read', raw)?.status, 503)
  }
})

test('agent API requires a valid Bearer header and enforces scopes', () => {
  for (const header of [undefined, 'Basic abc', 'Bearer short', `Bearer ${'b'.repeat(43)}`]) {
    const response = authorizeAgentRequest(request(header), 'site:read', config(key))
    assert.equal(response?.status, 401)
    assert.match(response.headers.get('www-authenticate'), /^Bearer/)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
  }
  assert.equal(authorizeAgentRequest(request(`Bearer ${token}`), 'site:read', config(key)), null)
  assert.equal(authorizeAgentRequest(request(`Bearer ${token}`), 'metrics:read', config(key))?.status, 403)
})

test('separate metrics keys, expiry and rotation work without exposing their hashes', async () => {
  const second = { ...key, id: 'metrics-agent', scopes: ['metrics:read'] }
  assert.equal(authorizeAgentRequest(request(`Bearer ${token}`), 'metrics:read', config(second)), null)
  const expired = { ...key, expiresAt: '2020-01-01T00:00:00Z' }
  const response = authorizeAgentRequest(request(`Bearer ${token}`), 'site:read', config(expired))
  assert.equal(response.status, 401)
  assert.equal((await response.text()).includes(key.sha256), false)
  assert.equal(authorizeAgentRequest(request(`Bearer ${token}`), 'site:read', config({ ...key, expiresAt: '2099-01-01T00:00:00Z' })), null)
})

test('report defaults use a 30-day inclusive Johannesburg calendar window', () => {
  const window = agentReportWindow(new URL('https://example.test/reports'), new Date('2026-11-18T23:30:00Z'))
  assert.equal(window.start, '2026-10-21')
  assert.equal(window.end, '2026-11-19')
  assert.equal(window.from.toISOString(), '2026-10-20T22:00:00.000Z')
  assert.equal(window.until.toISOString(), '2026-11-19T22:00:00.000Z')
})

test('report ranges validate real dates and the exact 93-day bound', () => {
  const url = (query) => new URL(`https://example.test/reports?${query}`)
  assert.doesNotThrow(() => agentReportWindow(url('start=2026-01-01&end=2026-04-03')))
  assert.doesNotThrow(() => agentReportWindow(url('start=2024-02-29&end=2024-02-29')))
  for (const query of [
    'start=2026-01-01&end=2026-04-04',
    'start=2026-02-30&end=2026-03-01',
    'start=2026-12-01&end=2026-11-01',
    'start=not-a-date',
    'start=2026-01-01&start=2026-01-02',
    'api_key=never-in-the-url',
  ]) {
    assert.throws(() => agentReportWindow(url(query)))
  }
})

test('GA4 defaults to TENROUNDS and supports an override or explicit disabling', () => {
  assert.equal(resolveMeasurementId(), 'G-3R4THL02Y6')
  assert.equal(validMeasurementId(resolveMeasurementId()), true)
  assert.equal(resolveMeasurementId('G-TEST12345'), 'G-TEST12345')
  assert.equal(resolveMeasurementId(''), '')
  assert.equal(validMeasurementId(resolveMeasurementId('')), false)
  assert.equal(validMeasurementId(resolveMeasurementId('GTM-TEST12345')), false)
})

test('new visitors use cookieless mode and full tracking still requires saved permission', () => {
  assert.equal(analyticsMode('unset'), 'cookieless')
  assert.equal(analyticsMode('granted'), 'full')
  for (const consent of ['denied', 'unavailable', 'pending']) {
    assert.equal(analyticsMode(consent), 'disabled')
  }
})

test('legal pages are discoverable in the shared public route inventory', () => {
  const paths = publicSiteRoutes.map(route => route.path)
  assert.equal(new Set(paths).size, paths.length)
  for (const path of ['/privacy-policy', '/terms-and-conditions']) {
    assert.equal(paths.filter(candidate => candidate === path).length, 1)
    assert.equal(analyticsPath(path, paths), path)
    assert.equal(analyticsPath(`${path}?email=private`, paths), null)
    assert.equal(analyticsPath(`${path}#private`, paths), null)
  }
})

test('analytics only permits exact approved pages, never private pages or URL parameters', () => {
  const paths = ['/', '/memberships', '/free-trial', '/signup']
  assert.equal(analyticsPath('/free-trial', paths), '/free-trial')
  for (const path of ['/admin', '/operations', '/members', '/api/agents/v1/reports', '/signup?email=private', '/signup#banking', '/unknown-id']) {
    assert.equal(analyticsPath(path, paths), null)
  }
  assert.equal(validMeasurementId('G-EXAMPLE123'), true)
  for (const value of [undefined, '', '"><script>', 'UA-123']) assert.equal(validMeasurementId(value), false)
  assert.equal(new Set(FUNNEL_EVENTS).size, FUNNEL_EVENTS.length)
  assert.ok(FUNNEL_EVENTS.includes('trial_success'))
  assert.ok(FUNNEL_EVENTS.includes('membership_success'))
})

test('key generator produces a matching hash, expiry and explicit scopes', () => {
  const output = execFileSync(process.execPath, ['scripts/create-agent-key.mjs', 'fixture-agent', 'site:read'], { encoding: 'utf8' })
  const lines = output.trim().split('\n')
  const privateKey = lines[1]
  const [entry] = JSON.parse(lines.at(-1))
  assert.match(privateKey, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(entry.sha256, createHash('sha256').update(privateKey).digest('hex'))
  assert.deepEqual(entry.scopes, ['site:read'])
  assert.ok(Date.parse(entry.expiresAt) > Date.now())
  assert.equal(authorizeAgentRequest(request(`Bearer ${privateKey}`), 'site:read', config(entry)), null)
  const invalid = spawnSync(process.execPath, ['scripts/create-agent-key.mjs', 'fixture-agent', 'admin:write'], { encoding: 'utf8' })
  assert.equal(invalid.status, 1)
  assert.equal(invalid.stdout, '')
})
