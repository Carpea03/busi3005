#!/usr/bin/env node
// Flush the Redis database backing this app. One-shot script — use before
// rolling out the S1 2027 deployment to wipe S1 2026 trial data.
//
// Usage:
//   REDIS_URL=rediss://... node scripts/flush-redis.js
//   REDIS_URL=rediss://... node scripts/flush-redis.js --yes    # skip prompt
//
// Refuses to run if REDIS_URL is missing. Asks for explicit "yes" confirmation
// unless --yes is passed. Vercel Redis is the assumed target; run locally
// against the same URL Vercel injects.

import { createClient } from 'redis';
import readline from 'node:readline';

async function confirm(prompt) {
  if (process.argv.includes('--yes')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function main() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error('Missing REDIS_URL. Set it before running:');
    console.error('  vercel env pull .env.local   # then source it');
    process.exit(1);
  }

  // Mask the URL so we don't print credentials.
  const safeUrl = url.replace(/:[^:@/]+@/, ':***@');
  console.log(`About to FLUSHDB on: ${safeUrl}`);
  console.log('This deletes ALL keys: submissions, quiz responses, aggregates, status overrides, student identities.');

  const ok = await confirm('Type "yes" to continue: ');
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  const client = createClient({ url });
  client.on('error', (error) => console.error('Redis error:', error));
  await client.connect();

  const before = await client.dbSize();
  console.log(`Keys before: ${before}`);

  await client.flushDb();

  const after = await client.dbSize();
  console.log(`Keys after: ${after}`);

  await client.quit();
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
