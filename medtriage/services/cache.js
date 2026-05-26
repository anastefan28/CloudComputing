const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const TERMINAL_TTL = 3600;
const POLLING_TTL  = 2;
const PDF_TTL      = 7 * 24 * 3600;
const HASH_TTL     = 30 * 24 * 3600;

const TERMINAL = new Set(['complete', 'reviewed', 'signed_off', 'awaiting_radiologist', 'error']);

let _client = null;

function client() {
  if (!_client) {
    _client = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
    _client.on('error', err => console.warn('[cache] Redis degraded:', err.message));
  }
  return _client;
}

async function getCase(caseId) {
  try {
    const raw = await client().get(`case:${caseId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function setCase(caseId, data) {
  const ttl = TERMINAL.has(data.status) ? TERMINAL_TTL : POLLING_TTL;
  try {
    await client().setex(`case:${caseId}`, ttl, JSON.stringify(data));
  } catch { /* degraded */ }
}

async function hasPdf(caseId) {
  try {
    return (await client().exists(`pdf:${caseId}`)) === 1;
  } catch { return false; }
}

async function markPdf(caseId) {
  try {
    await client().setex(`pdf:${caseId}`, PDF_TTL, '1');
  } catch { /* degraded */ }
}

async function invalidate(caseId) {
  try {
    await client().del(`case:${caseId}`, `pdf:${caseId}`);
  } catch { /* best-effort */ }
}

async function getHash(sha256) {
  try {
    return await client().get(`hash:${sha256}`);
  } catch { return null; }
}

async function setHash(sha256, caseId) {
  try {
    await client().setex(`hash:${sha256}`, HASH_TTL, caseId);
  } catch { /* degraded */ }
}

module.exports = { getCase, setCase, hasPdf, markPdf, invalidate, getHash, setHash };
