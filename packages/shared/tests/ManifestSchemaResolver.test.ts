import { describe, expect, it } from 'vitest';

import { resolveManifestSchemaPath } from '../manifest/validator.js';

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
});
