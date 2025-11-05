import type {
  RunRequestV2,
  ValidationError
} from '../../../packages/control-plane-schemas/src/index.js';

export type ControlPlaneValidationMode = 'shadow' | 'enforce';

export interface DriftSummary {
  mode: ControlPlaneValidationMode;
  absoluteReportPath: string;
  totalSamples: number;
  invalidSamples: number;
  invalidRate: number;
  lastSampledAt: string | null;
}

export interface ControlPlaneValidationOutcome {
  mode: ControlPlaneValidationMode;
  status: 'passed' | 'failed';
  timestamp: string;
  errors: ValidationError[];
  drift?: DriftSummary;
}

export interface ControlPlaneManifestSection {
  schema_id: string;
  schema_version: string;
  request_id: string;
  validation: {
    mode: ControlPlaneValidationMode;
    status: 'passed' | 'failed';
    timestamp: string;
    errors: ValidationError[];
  };
  drift?: {
    report_path: string | null;
    total_samples: number;
    invalid_samples: number;
    invalid_rate: number;
    last_sampled_at: string | null;
    mode: ControlPlaneValidationMode;
  };
  enforcement?: {
    enabled: boolean;
    activated_at: string | null;
  };
}

export interface ControlPlaneRunSummary {
  schemaId: string;
  schemaVersion: string;
  requestId: string;
  validation: {
    mode: ControlPlaneValidationMode;
    status: 'passed' | 'failed';
    timestamp: string;
    errors: ValidationError[];
  };
  drift?: {
    totalSamples: number;
    invalidSamples: number;
    invalidRate: number;
    lastSampledAt: string | null;
    mode: ControlPlaneValidationMode;
  };
}

export interface ControlPlaneValidationContext {
  request: RunRequestV2;
  outcome: ControlPlaneValidationOutcome;
}

export interface ControlPlaneValidationResult {
  request: RunRequestV2;
  outcome: ControlPlaneValidationOutcome;
}
