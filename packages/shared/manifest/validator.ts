import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Ajv as AjvCtor, type ErrorObject } from 'ajv';
import type { CliManifest } from './types.js';

export type JsonSchema = Record<string, unknown>;

export interface ManifestValidationResult<T = CliManifest> {
  valid: boolean;
  errors: string[];
  value: T | null;
}

const ajv = new AjvCtor({
  allErrors: true,
  strict: false
});

const manifestSchema = loadManifestSchema();
const validate = ajv.compile<CliManifest>(manifestSchema);

export const manifestValidator = validate;

export function getManifestSchema(): JsonSchema {
  return manifestSchema as JsonSchema;
}

export function validateManifest(candidate: unknown): ManifestValidationResult<CliManifest> {
  const valid = validate(candidate);
  if (valid) {
    return { valid: true, errors: [], value: candidate as CliManifest };
  }

  return {
    valid: false,
    errors: formatErrors(validate.errors),
    value: null
  };
}

function formatErrors(errors: ErrorObject<string, Record<string, unknown>, unknown>[] | null | undefined): string[] {
  if (!errors || errors.length === 0) {
    return ['Unknown validation error'];
  }
  return errors.map((error) => {
    if (error.instancePath) {
      return `${error.instancePath}: ${error.message ?? 'invalid value'}`;
    }
    if (error.schemaPath) {
      return `${error.schemaPath}: ${error.message ?? 'invalid value'}`;
    }
    return error.message ?? 'invalid value';
  });
}

export function resolveManifestSchemaPath(options: { skipImports?: boolean; fromUrl?: string } = {}): string {
  if (!options.skipImports) {
    const require = createRequire(import.meta.url);
    try {
      return require.resolve('#co/schema/manifest');
    } catch {
      // fall through to fallback
    }
  }
  return resolveManifestSchemaPathFallback(options.fromUrl ?? import.meta.url);
}

function resolveManifestSchemaPathFallback(fromUrl: string): string {
  let current: string | null = dirname(fileURLToPath(fromUrl));
  while (current) {
    const candidate = join(current, 'package.json');
    if (existsSync(candidate)) {
      return join(current, 'schemas', 'manifest.json');
    }
    const parent = dirname(current);
    if (parent === current) {
      current = null;
      continue;
    }
    current = parent;
  }
  throw new Error('Unable to locate schemas/manifest.json');
}

function loadManifestSchema(): JsonSchema {
  const schemaPath = resolveManifestSchemaPath();
  const raw = readFileSync(schemaPath, 'utf8');
  return JSON.parse(raw) as JsonSchema;
}
