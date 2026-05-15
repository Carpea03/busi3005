import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveRedisUrl } from '../lib/redis.js';

test('resolveRedisUrl prefers REDIS_URL when present', () => {
  assert.equal(
    resolveRedisUrl({
      REDIS_URL: 'redis://primary.example:6379',
      busi3005_REDIS_URL: 'redis://fallback.example:6379',
    }),
    'redis://primary.example:6379',
  );
});

test('resolveRedisUrl falls back to provider-scoped *_REDIS_URL values', () => {
  assert.equal(
    resolveRedisUrl({
      budi3005_REDIS_URL: 'redis://scoped.example:6379',
    }),
    'redis://scoped.example:6379',
  );
});

test('resolveRedisUrl ignores blank values', () => {
  assert.equal(
    resolveRedisUrl({
      REDIS_URL: '   ',
      budi3005_REDIS_URL: '',
    }),
    '',
  );
});