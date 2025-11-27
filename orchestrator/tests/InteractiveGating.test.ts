import { describe, it, expect } from 'vitest';

import { evaluateInteractiveGate } from '../src/cli/utils/interactive.js';

describe('evaluateInteractiveGate', () => {
  it('disables when not requested', () => {
    const result = evaluateInteractiveGate({ requested: false });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe('not requested');
  });

  it('disables when explicitly flagged off', () => {
    const result = evaluateInteractiveGate({ requested: true, disabled: true });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe('flagged off');
  });

  it('disables for json format to preserve output parity', () => {
    const result = evaluateInteractiveGate({ requested: true, format: 'json' });
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain('json');
  });

  it('disables when stdout or stderr are not TTYs', () => {
    const result = evaluateInteractiveGate({
      requested: true,
      stdoutIsTTY: false,
      stderrIsTTY: true
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain('non-tty');
  });

  it('disables when TERM is dumb', () => {
    const result = evaluateInteractiveGate({
      requested: true,
      term: 'dumb',
      stdoutIsTTY: true,
      stderrIsTTY: true
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain('TERM');
  });

  it('disables when CI environment is detected', () => {
    const result = evaluateInteractiveGate({
      requested: true,
      env: { CI: 'true' } as NodeJS.ProcessEnv,
      stdoutIsTTY: true,
      stderrIsTTY: true
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain('CI');
  });

  it('enables when requested and environment is interactive', () => {
    const result = evaluateInteractiveGate({
      requested: true,
      stdoutIsTTY: true,
      stderrIsTTY: true,
      env: { CI: '' } as NodeJS.ProcessEnv,
      term: 'xterm-256color'
    });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBeNull();
  });
});
