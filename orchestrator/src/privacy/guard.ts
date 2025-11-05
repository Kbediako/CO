import type {
  ExecStreamFrame,
  StreamFrameGuard,
  StreamFrameGuardDecision,
  StreamFrameGuardResult,
  StreamFrameGuardContext
} from '../../packages/orchestrator/src/exec/handle-service.js';

export type PrivacyGuardMode = 'shadow' | 'enforce';

export interface PrivacyDecisionRecord {
  handleId: string;
  sequence: number;
  action: StreamFrameGuardDecision['action'];
  rule?: string;
  reason?: string;
  timestamp: string;
}

export interface PrivacyGuardMetrics {
  mode: PrivacyGuardMode;
  totalFrames: number;
  redactedFrames: number;
  blockedFrames: number;
  allowedFrames: number;
  decisions: PrivacyDecisionRecord[];
}

export interface PrivacyGuardOptions {
  mode?: PrivacyGuardMode;
  now?: () => Date;
}

const REDACTION_TOKEN = '[REDACTED]';

export class PrivacyGuard implements StreamFrameGuard {
  private readonly now: () => Date;
  private readonly mode: PrivacyGuardMode;
  private readonly decisions: PrivacyDecisionRecord[] = [];
  private totals = {
    total: 0,
    redacted: 0,
    blocked: 0,
    allowed: 0
  };

  constructor(options: PrivacyGuardOptions = {}) {
    this.mode = options.mode ?? 'shadow';
    this.now = options.now ?? (() => new Date());
  }

  getMode(): PrivacyGuardMode {
    return this.mode;
  }

  async process(frame: ExecStreamFrame, context: StreamFrameGuardContext): Promise<StreamFrameGuardResult> {
    this.totals.total += 1;

    const decision = this.evaluateFrame(frame);
    const finalDecision = this.mode === 'shadow' && decision.action !== 'allow'
      ? { action: 'allow' as const, rule: decision.rule, reason: 'shadow-mode' }
      : decision;

    const timestamp = this.now().toISOString();
    this.decisions.push({
      handleId: context.handleId,
      sequence: frame.sequence,
      action: finalDecision.action,
      rule: finalDecision.rule,
      reason: finalDecision.reason,
      timestamp
    });

    if (finalDecision.action === 'allow') {
      this.totals.allowed += 1;
      return { frame, decision: finalDecision };
    }

    if (finalDecision.action === 'redact') {
      this.totals.redacted += 1;
      const redactedFrame = this.redactFrame(frame);
      return { frame: redactedFrame, decision: finalDecision };
    }

    this.totals.blocked += 1;
    return { frame: null, decision: finalDecision };
  }

  getMetrics(): PrivacyGuardMetrics {
    return {
      mode: this.mode,
      totalFrames: this.totals.total,
      redactedFrames: this.totals.redacted,
      blockedFrames: this.totals.blocked,
      allowedFrames: this.totals.allowed,
      decisions: [...this.decisions]
    };
  }

  reset(): void {
    this.decisions.length = 0;
    this.totals = {
      total: 0,
      redacted: 0,
      blocked: 0,
      allowed: 0
    };
  }

  private evaluateFrame(frame: ExecStreamFrame): StreamFrameGuardDecision {
    if (frame.event.type !== 'exec:chunk') {
      return { action: 'allow' };
    }

    const data = frame.event.payload.data;
    if (!data) {
      return { action: 'allow' };
    }

    if (PRIVATE_KEY_PATTERN.test(data)) {
      return {
        action: 'block',
        rule: 'private-key',
        reason: 'detected private key material'
      };
    }

    if (SENSITIVE_TOKEN_PATTERN.test(data) || AWS_KEY_PATTERN.test(data)) {
      return {
        action: 'redact',
        rule: 'sensitive-token',
        reason: 'detected high-risk token'
      };
    }

    return { action: 'allow' };
  }

  private redactFrame(frame: ExecStreamFrame): ExecStreamFrame {
    if (frame.event.type !== 'exec:chunk') {
      return frame;
    }
    const cloned = structuredClone(frame);
    cloned.event.payload.data = REDACTION_TOKEN;
    cloned.event.payload.bytes = Buffer.byteLength(REDACTION_TOKEN, 'utf8');
    return cloned;
  }
}

const PRIVATE_KEY_PATTERN = /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/i;
const SENSITIVE_TOKEN_PATTERN = /(secret|password|api[_-]?key|token)\s*[:=]\s*[^\s]{6,}/i;
const AWS_KEY_PATTERN = /AKIA[0-9A-Z]{16}/;
