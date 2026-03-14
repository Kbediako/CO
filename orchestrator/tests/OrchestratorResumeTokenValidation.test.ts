import { describe, expect, it, vi } from 'vitest';

import { validateOrchestratorResumeToken } from '../src/cli/services/orchestratorResumeTokenValidation.js';

describe('validateOrchestratorResumeToken', () => {
  it('accepts the manifest token without reading from disk when it matches the provided token', async () => {
    const readFileImpl = vi.fn();

    await expect(
      validateOrchestratorResumeToken(
        {
          resumeTokenPath: '/tmp/run/resume-token'
        } as never,
        {
          run_id: 'run-1',
          resume_token: 'token-1'
        } as never,
        'token-1',
        readFileImpl as never
      )
    ).resolves.toBeUndefined();

    expect(readFileImpl).not.toHaveBeenCalled();
  });

  it('reads and trims the stored token from disk when the manifest token is absent', async () => {
    const readFileImpl = vi.fn(async () => ' token-2 \n');

    await expect(
      validateOrchestratorResumeToken(
        {
          resumeTokenPath: '/tmp/run/resume-token'
        } as never,
        {
          run_id: 'run-2',
          resume_token: null
        } as never,
        'token-2',
        readFileImpl as never
      )
    ).resolves.toBeUndefined();

    expect(readFileImpl).toHaveBeenCalledWith('/tmp/run/resume-token', 'utf8');
  });

  it('throws the existing missing-token error when disk read fails', async () => {
    const readFileImpl = vi.fn(async () => {
      throw new Error('ENOENT');
    });

    await expect(
      validateOrchestratorResumeToken(
        {
          resumeTokenPath: '/tmp/run/resume-token'
        } as never,
        {
          run_id: 'run-3',
          resume_token: undefined
        } as never,
        'token-3',
        readFileImpl as never
      )
    ).rejects.toThrow('Resume token missing for run run-3: ENOENT');
  });

  it('throws the existing mismatch error when the provided token differs', async () => {
    await expect(
      validateOrchestratorResumeToken(
        {
          resumeTokenPath: '/tmp/run/resume-token'
        } as never,
        {
          run_id: 'run-4',
          resume_token: 'token-4'
        } as never,
        'different-token'
      )
    ).rejects.toThrow('Resume token mismatch.');
  });
});
