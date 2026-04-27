import { describe, expect, it } from 'vitest';

import { getManifestSchema, resolveManifestSchemaPath } from '../manifest/validator.js';

const SCHEMA_SUFFIX = ['schemas', 'manifest.json'].join('/');

describe('resolveManifestSchemaPath', () => {
  it('resolves the manifest schema via imports alias', () => {
    const resolved = resolveManifestSchemaPath();
    expect(resolved.replace(/\\/g, '/')).toContain(SCHEMA_SUFFIX);
  });

  it('resolves the manifest schema via fallback when imports are skipped', () => {
    const resolved = resolveManifestSchemaPath({ skipImports: true, fromUrl: import.meta.url });
    expect(resolved.replace(/\\/g, '/')).toContain(SCHEMA_SUFFIX);
  });

  it('keeps newly emitted fallback evidence optional for old v1 manifests', () => {
    const schema = getManifestSchema() as {
      properties?: {
        runtime_fallback?: { required?: string[]; properties?: { expiry?: unknown } };
        cloud_fallback?: { required?: string[] };
      };
    };

    expect(schema.properties?.runtime_fallback?.required).toEqual([
      'occurred',
      'code',
      'reason',
      'from_mode',
      'to_mode',
      'checked_at'
    ]);
    expect(schema.properties?.runtime_fallback?.properties?.expiry).toMatchObject({
      type: ['object', 'null'],
      required: [
        'owner',
        'trigger',
        'introduced_date',
        'review_date',
        'maximum_lifetime',
        'removal_condition',
        'validation'
      ]
    });
    expect(schema.properties?.cloud_fallback?.required).toEqual([
      'mode_requested',
      'mode_used',
      'reason',
      'issues',
      'checked_at'
    ]);
  });
});
