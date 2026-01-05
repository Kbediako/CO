import type { JsonlEvent, RunSummaryEvent, RunMetricSummary } from '../../../shared/events/types.js';

export interface OtelExporterOptions {
  endpoint?: string | null;
  enabled?: boolean;
  headers?: Record<string, string>;
  maxFailures?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  maxQueueSize?: number;
  fetch?: typeof fetch;
  logger?: { warn(message: string): void };
}

export interface ExecTelemetrySink {
  record(event: JsonlEvent): Promise<void> | void;
  recordSummary(summary: RunSummaryEvent): Promise<void> | void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

const DEFAULT_BACKOFF_MS = 500;
const DEFAULT_MAX_BACKOFF_MS = 5_000;
const DEFAULT_MAX_FAILURES = 3;

export function createTelemetrySink(options: OtelExporterOptions = {}): ExecTelemetrySink {
  const endpoint = options.endpoint ?? null;
  const explicitlyDisabled = options.enabled === false;
  if (!endpoint || explicitlyDisabled) {
    return new NoopTelemetrySink();
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    return new NoopTelemetrySink();
  }
  return new OtelTelemetrySink({
    endpoint,
    headers: options.headers ?? {},
    maxFailures: options.maxFailures ?? DEFAULT_MAX_FAILURES,
    backoffMs: options.backoffMs ?? DEFAULT_BACKOFF_MS,
    maxBackoffMs: options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
    maxQueueSize: options.maxQueueSize,
    fetch: fetchImpl,
    logger: options.logger ?? console
  });
}

class NoopTelemetrySink implements ExecTelemetrySink {
  async record(): Promise<void> {
    // no-op
  }

  async recordSummary(): Promise<void> {
    // no-op
  }

  async flush(): Promise<void> {
    // no-op
  }

  async shutdown(): Promise<void> {
    // no-op
  }
}

interface OtelTelemetryConfig {
  endpoint: string;
  headers: Record<string, string>;
  maxFailures: number;
  backoffMs: number;
  maxBackoffMs: number;
  maxQueueSize?: number;
  fetch: typeof fetch;
  logger: { warn(message: string): void };
}

class OtelTelemetrySink implements ExecTelemetrySink {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: { warn(message: string): void };
  private readonly maxFailures: number;
  private readonly backoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly maxQueueSize: number | null;

  private queue: JsonlEvent[] = [];
  private disabled = false;
  private consecutiveFailures = 0;

  constructor(config: OtelTelemetryConfig) {
    this.endpoint = config.endpoint;
    this.headers = { 'content-type': 'application/json', ...config.headers };
    this.fetchImpl = config.fetch;
    this.logger = config.logger;
    this.maxFailures = config.maxFailures;
    this.backoffMs = config.backoffMs;
    this.maxBackoffMs = config.maxBackoffMs;
    this.maxQueueSize = normalizeQueueSize(config.maxQueueSize);
  }

  async record(event: JsonlEvent): Promise<void> {
    if (this.disabled) {
      return;
    }
    this.queue.push(event);
    this.trimQueue();
  }

  async recordSummary(summary: RunSummaryEvent): Promise<void> {
    if (this.disabled) {
      return;
    }
    await this.flush();
    try {
      const dimensions = buildSummaryDimensions(summary.payload.metrics);
      const payload = dimensions ? { kind: 'summary', summary, dimensions } : { kind: 'summary', summary };
      await this.sendPayload(payload);
    } catch (error) {
      this.handleFailure(error);
    }
  }

  async flush(): Promise<void> {
    if (this.disabled || this.queue.length === 0) {
      return;
    }
    const batch = this.queue.splice(0, this.queue.length);
    try {
      await this.sendPayload({ kind: 'events', events: batch });
      this.consecutiveFailures = 0;
    } catch (error) {
      this.queue.unshift(...batch);
      this.trimQueue();
      this.handleFailure(error);
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }

  private async sendPayload(payload: unknown): Promise<void> {
    if (this.consecutiveFailures > 0) {
      const delay = Math.min(this.backoffMs * 2 ** (this.consecutiveFailures - 1), this.maxBackoffMs);
      await wait(delay);
    }
    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Telemetry request failed with status ${response.status}`);
    }
  }

  private handleFailure(error: unknown): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.maxFailures) {
      this.disabled = true;
      this.logger.warn(`Telemetry disabled after ${this.consecutiveFailures} consecutive failures: ${String(error)}`);
    }
  }

  private trimQueue(): void {
    if (this.maxQueueSize === null || this.queue.length <= this.maxQueueSize) {
      return;
    }
    this.queue.splice(0, this.queue.length - this.maxQueueSize);
  }
}

function buildSummaryDimensions(metrics: RunMetricSummary | undefined): Record<string, unknown> | undefined {
  if (!metrics) {
    return undefined;
  }
  const dimensions: Record<string, unknown> = {
    tool_cost_usd: metrics.costUsd,
    latency_ms: metrics.latencyMs
  };
  if (metrics.tfgrpo) {
    dimensions.tfgrpo_epoch = metrics.tfgrpo.epoch;
    dimensions.tfgrpo_group_size = metrics.tfgrpo.groupSize;
    dimensions.tfgrpo_group_id = metrics.tfgrpo.groupId;
  }
  if (metrics.perTool.length > 0) {
    dimensions.tool_costs = Object.fromEntries(
      metrics.perTool.map((entry) => [entry.tool, entry.costUsd])
    );
  }
  return dimensions;
}

async function wait(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeQueueSize(value?: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.floor(value);
  if (normalized <= 0) {
    return null;
  }
  return normalized;
}
