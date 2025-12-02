import { Ajv as AjvCtor, type ErrorObject } from 'ajv';

import manifestSchema from '../../../schemas/manifest.json' with { type: 'json' };
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
