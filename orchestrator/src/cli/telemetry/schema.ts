import type { CliManifest } from '../../../../packages/shared/manifest/types.js';
import {
  getManifestSchema,
  validateManifest,
  type JsonSchema,
  type ManifestValidationResult
} from '../../../../packages/shared/manifest/validator.js';

export interface TelemetrySchemas {
  manifest: JsonSchema;
}

export type ValidationResult<T> = ManifestValidationResult<T>;

export const CLI_MANIFEST_SCHEMA: JsonSchema = getManifestSchema();

export function getTelemetrySchemas(): TelemetrySchemas {
  return { manifest: CLI_MANIFEST_SCHEMA };
}

export function validateCliManifest(candidate: unknown): ValidationResult<CliManifest> {
  return validateManifest(candidate);
}
