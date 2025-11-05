import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  CONTROL_PLANE_RUN_REQUEST_SCHEMA,
  CONTROL_PLANE_RUN_REQUEST_VERSION,
  type ValidationError
} from '../../../packages/control-plane-schemas/src/index.js';
import type { ControlPlaneValidationMode, DriftSummary } from './types.js';

interface DriftReporterFs {
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  mkdir?: typeof mkdir;
}

interface DriftReportEntry {
  request_id: string;
  timestamp: string;
  status: 'passed' | 'failed';
  mode: ControlPlaneValidationMode;
  errors?: ValidationError[];
}

interface DriftReportState {
  schema_id: string;
  schema_version: string;
  total_samples: number;
  invalid_samples: number;
  invalid_rate: number;
  last_sampled_at: string | null;
  mode: ControlPlaneValidationMode;
  entries: DriftReportEntry[];
}

export interface ControlPlaneDriftReporterOptions {
  repoRoot: string;
  taskId: string;
  outputPath?: string;
  fs?: DriftReporterFs;
  maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 50;

export class ControlPlaneDriftReporter {
  private readonly reportPath: string;
  private readonly read: typeof readFile;
  private readonly write: typeof writeFile;
  private readonly ensureDir: typeof mkdir;
  private readonly maxEntries: number;

  constructor(private readonly options: ControlPlaneDriftReporterOptions) {
    this.reportPath =
      options.outputPath ??
      join(
        options.repoRoot,
        'out',
        options.taskId,
        'control-plane',
        'drift.json'
      );
    this.read = options.fs?.readFile ?? readFile;
    this.write = options.fs?.writeFile ?? writeFile;
    this.ensureDir = options.fs?.mkdir ?? mkdir;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  get path(): string {
    return this.reportPath;
  }

  async record(entry: {
    requestId: string;
    timestamp: string;
    mode: ControlPlaneValidationMode;
    valid: boolean;
    errors: ValidationError[];
  }): Promise<DriftSummary> {
    const state = await this.load();

    state.total_samples += 1;
    if (!entry.valid) {
      state.invalid_samples += 1;
    }
    state.invalid_rate =
      state.total_samples === 0 ? 0 : state.invalid_samples / state.total_samples;
    state.last_sampled_at = entry.timestamp;
    state.mode = entry.mode;

    if (!entry.valid) {
      state.entries.push({
        request_id: entry.requestId,
        timestamp: entry.timestamp,
        status: 'failed',
        mode: entry.mode,
        errors: entry.errors.map((error) => ({ ...error }))
      });
    } else if (state.entries.length === 0) {
      // Keep at least one success sample for context when no failures are present.
      state.entries.push({
        request_id: entry.requestId,
        timestamp: entry.timestamp,
        status: 'passed',
        mode: entry.mode
      });
    }

    if (state.entries.length > this.maxEntries) {
      state.entries.splice(0, state.entries.length - this.maxEntries);
    }

    await this.persist(state);

    return {
      mode: state.mode,
      absoluteReportPath: this.reportPath,
      totalSamples: state.total_samples,
      invalidSamples: state.invalid_samples,
      invalidRate: state.invalid_rate,
      lastSampledAt: state.last_sampled_at
    };
  }

  private async load(): Promise<DriftReportState> {
    try {
      const raw = await this.read(this.reportPath, 'utf8');
      const parsed = JSON.parse(raw) as DriftReportState;
      if (!parsed || typeof parsed !== 'object') {
        return this.createInitialState();
      }
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      return {
        schema_id: parsed.schema_id ?? CONTROL_PLANE_RUN_REQUEST_SCHEMA,
        schema_version: parsed.schema_version ?? CONTROL_PLANE_RUN_REQUEST_VERSION,
        total_samples: typeof parsed.total_samples === 'number' ? parsed.total_samples : 0,
        invalid_samples:
          typeof parsed.invalid_samples === 'number' ? parsed.invalid_samples : 0,
        invalid_rate: typeof parsed.invalid_rate === 'number' ? parsed.invalid_rate : 0,
        last_sampled_at:
          typeof parsed.last_sampled_at === 'string' ? parsed.last_sampled_at : null,
        mode: (parsed.mode as ControlPlaneValidationMode) ?? 'shadow',
        entries
      };
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return this.createInitialState();
      }
      throw error;
    }
  }

  private async persist(state: DriftReportState): Promise<void> {
    await this.ensureDir(dirname(this.reportPath), { recursive: true });
    const serialized = JSON.stringify(state, null, 2);
    await this.write(this.reportPath, `${serialized}\n`, 'utf8');
  }

  private createInitialState(): DriftReportState {
    return {
      schema_id: CONTROL_PLANE_RUN_REQUEST_SCHEMA,
      schema_version: CONTROL_PLANE_RUN_REQUEST_VERSION,
      total_samples: 0,
      invalid_samples: 0,
      invalid_rate: 0,
      last_sampled_at: null,
      mode: 'shadow',
      entries: []
    };
  }
}
