import process from 'node:process';

import { EnvUtils } from '../../../../packages/shared/config/index.js';

export interface InteractiveGateOptions {
  requested: boolean;
  disabled?: boolean;
  format?: 'text' | 'json';
  stdoutIsTTY?: boolean;
  stderrIsTTY?: boolean;
  term?: string | null;
  env?: NodeJS.ProcessEnv;
}

export interface InteractiveGateResult {
  enabled: boolean;
  reason: string | null;
}

export function evaluateInteractiveGate(options: InteractiveGateOptions): InteractiveGateResult {
  const {
    requested,
    disabled = false,
    format,
    stdoutIsTTY = process.stdout.isTTY === true,
    stderrIsTTY = process.stderr.isTTY === true,
    term = process.env.TERM ?? null,
    env = process.env
  } = options;

  if (!requested) {
    return { enabled: false, reason: 'not requested' };
  }
  if (disabled) {
    return { enabled: false, reason: 'flagged off' };
  }
  if (format === 'json') {
    return { enabled: false, reason: 'json format requested' };
  }
  if (!stdoutIsTTY || !stderrIsTTY) {
    return { enabled: false, reason: 'non-tty output streams' };
  }
  if ((term ?? '').toLowerCase() === 'dumb') {
    return { enabled: false, reason: 'TERM=dumb' };
  }
  const ci = env.CI ?? '';
  if (ci && EnvUtils.isTrue(ci)) {
    return { enabled: false, reason: 'CI detected' };
  }
  return { enabled: true, reason: null };
}
