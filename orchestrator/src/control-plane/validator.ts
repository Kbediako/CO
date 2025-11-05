import {
  validateRunRequestV2,
  type RunRequestV2
} from '../../../packages/control-plane-schemas/src/index.js';
import { ControlPlaneDriftReporter } from './drift-reporter.js';
import type {
  ControlPlaneValidationMode,
  ControlPlaneValidationOutcome,
  ControlPlaneValidationResult
} from './types.js';

export interface ControlPlaneValidatorOptions {
  mode?: ControlPlaneValidationMode;
  driftReporter?: ControlPlaneDriftReporter;
  now?: () => Date;
}

const DEFAULT_MODE: ControlPlaneValidationMode = 'shadow';

export class ControlPlaneValidationError extends Error {
  constructor(
    message: string,
    public readonly result: ControlPlaneValidationResult
  ) {
    super(message);
    this.name = 'ControlPlaneValidationError';
  }
}

export class ControlPlaneValidator {
  private readonly mode: ControlPlaneValidationMode;
  private readonly driftReporter?: ControlPlaneDriftReporter;
  private readonly now: () => Date;

  constructor(options: ControlPlaneValidatorOptions = {}) {
    this.mode = options.mode ?? DEFAULT_MODE;
    this.driftReporter = options.driftReporter;
    this.now = options.now ?? (() => new Date());
  }

  async validate(request: RunRequestV2): Promise<ControlPlaneValidationResult> {
    const timestamp = this.now().toISOString();
    const evaluation = validateRunRequestV2(request as unknown);
    const canonicalRequest = evaluation.valid ? evaluation.value! : request;
    const errors = evaluation.valid ? [] : evaluation.errors.map((error) => ({ ...error }));

    const drift = this.driftReporter
      ? await this.driftReporter.record({
          requestId: canonicalRequest.requestId,
          timestamp,
          mode: this.mode,
          valid: evaluation.valid,
          errors
        })
      : undefined;

    const outcome: ControlPlaneValidationOutcome = {
      mode: this.mode,
      status: evaluation.valid ? 'passed' : 'failed',
      timestamp,
      errors,
      drift
    };

    const result: ControlPlaneValidationResult = {
      request: canonicalRequest,
      outcome
    };

    if (!evaluation.valid && this.mode === 'enforce') {
      throw new ControlPlaneValidationError(
        `Control plane validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}).`,
        result
      );
    }

    return result;
  }
}
