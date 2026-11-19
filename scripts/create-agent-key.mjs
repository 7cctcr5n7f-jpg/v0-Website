import { createHash, randomBytes } from 'node:crypto'

const [id, ...scopes] = process.argv.slice(2)
const allowedScopes = new Set(['site:read', 'metrics:read'])
if (!id || !/^[a-z0-9-]{1,64}$/.test(id) || scopes.length === 0 || !scopes.every((scope) => allowedScopes.has(scope))) {
  console.error('Usage: node scripts/create-agent-key.mjs agent-name site:read [metrics:read]')
  process.exitCode = 1
} else {
  const key = randomBytes(32).toString('base64url')
  const entry = {
    id,
    sha256: createHash('sha256').update(key).digest('hex'),
    scopes: [...new Set(scopes)],
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
  }
  console.log('Private agent key (store in your agent secret manager; never commit or paste into a URL):')
  console.log(key)
  console.log('\nAGENT_API_KEYS server configuration (append this entry when other agents already exist):')
  console.log(JSON.stringify([entry]))
}
