import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildContextObject, ContextStore } from '../src/cli/rlm/context.js';

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('ContextStore search offsets', () => {
  it('returns UTF-8 byte offsets for non-ASCII matches', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-context-'));
    const text = 'prefix tést αβγ 😀 suffix';
    const contextObject = await buildContextObject({
      source: { type: 'text', value: text },
      targetDir: join(tempDir, 'context'),
      chunking: { targetBytes: 256, overlapBytes: 0, strategy: 'byte' }
    });

    const store = new ContextStore(contextObject);
    const query = 'tést';
    const queryBytes = Buffer.from(query, 'utf8');
    const expectedStart = Buffer.from(text, 'utf8').indexOf(queryBytes);

    const results = await store.search(query, 5, 32);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].start_byte).toBe(expectedStart);
    expect(results[0].end_byte).toBe(expectedStart + queryBytes.length);

    const span = await store.readSpan(results[0].start_byte, queryBytes.length);
    expect(span.text).toBe(query);

    const asciiResults = await store.search('PREFIX', 5, 16);
    expect(asciiResults[0].start_byte).toBe(0);
  });

  it('throws when chunk targetBytes is non-positive', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-context-'));
    await expect(
      buildContextObject({
        source: { type: 'text', value: 'alpha beta' },
        targetDir: join(tempDir, 'context'),
        chunking: { targetBytes: 0, overlapBytes: 0, strategy: 'byte' }
      })
    ).rejects.toThrow('target_bytes');
  });
});
