#!/usr/bin/env node
/**
 * Generates a new API key and its SHA-256 hash for insertion into api_keys.
 *
 * Usage:
 *   node scripts/generate-api-key.js
 *
 * Output:
 *   KEY  — the raw key to put in n8n (or any API client) as the X-API-Key header
 *   HASH — the value to store in the api_keys table (key_hash column)
 *
 * Example insert:
 *   INSERT INTO api_keys (tenant_id, key_hash, name)
 *   VALUES ('<tenant-uuid>', '<HASH>', 'n8n-production');
 *
 * Never store the raw KEY in the database or commit it anywhere.
 */

const { randomBytes, createHash } = require('crypto');

const key  = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(key).digest('hex');

console.log('\n--- New API Key ---');
console.log(`KEY  (X-API-Key header): ${key}`);
console.log(`HASH (store in DB)     : ${hash}`);
console.log('-------------------\n');
