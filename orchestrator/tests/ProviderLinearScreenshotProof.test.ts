import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it } from 'vitest';

import {
  resolveProviderLinearScreenshotProof,
  type ProviderLinearScreenshotProofCommandRequest,
  type ProviderLinearScreenshotProofCommandResult
} from '../src/cli/control/providerLinearScreenshotProof.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        force: true,
        recursive: true
      })
    )
  );
});

function commandResult(
  overrides: Partial<ProviderLinearScreenshotProofCommandResult> = {}
): ProviderLinearScreenshotProofCommandResult {
  return {
    exit_code: 0,
    stdout: '',
    stderr: '',
    signal: null,
    command_missing: false,
    error_message: null,
    ...overrides
  };
}

it('captures a default macOS screenshot file and reports cleanup skipped when no preview surface is opened', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir
    },
    {
      platform: 'darwin',
      now: () => '2026-04-08T06:10:00.000Z',
      runCommand: async (request: ProviderLinearScreenshotProofCommandRequest) => {
        if (request.command === 'screencapture') {
          const outputPath = request.args.at(-1);
          if (!outputPath) {
            throw new Error('missing output path');
          }
          await writeFile(outputPath, 'png', 'utf8');
          return commandResult();
        }
        throw new Error(`unexpected command ${request.command}`);
      }
    }
  );

  expect(result).toMatchObject({
    ok: true,
    capture: {
      mode: 'display',
      open_preview: false,
      bytes: 3,
      media_type: 'image/png',
      cleanup: {
        status: 'skipped'
      }
    }
  });
  if (!result.ok) {
    throw new Error('expected success');
  }
  expect(result.capture.output_path).toContain('.tmp/linear-screenshot-proof-20260408T061000000Z.png');
  expect(result.capture.embed_markdown).toContain('![Proof screenshot](file:///');
});

it('rejects --display-id=0 before invoking macOS capture tools', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      displayId: '0'
    },
    {
      platform: 'darwin',
      runCommand: async () => {
        throw new Error('runCommand should not execute for invalid display id');
      }
    }
  );

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'screenshot_proof_display_id_invalid',
      message: '--display-id must be a positive integer when provided.'
    }
  });
});

it('rejects --window-id=0 before invoking macOS capture tools', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      windowId: '0'
    },
    {
      platform: 'darwin',
      runCommand: async () => {
        throw new Error('runCommand should not execute for invalid window id');
      }
    }
  );

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'screenshot_proof_window_id_invalid',
      message: '--window-id must be a positive integer when provided.'
    }
  });
});

it('returns a structured failure when the screenshot output directory cannot be prepared', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      outputPath: 'proofs/proof.png'
    },
    {
      platform: 'darwin',
      mkdir: async () => {
        const error = new Error('EACCES: permission denied');
        (error as NodeJS.ErrnoException).code = 'EACCES';
        throw error;
      },
      runCommand: async () => {
        throw new Error('runCommand should not execute when output directory preparation fails');
      }
    }
  );

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'screenshot_proof_output_directory_prepare_failed',
      message: `Screenshot output directory "${join(tempDir, 'proofs')}" could not be prepared before capture.`
    },
    capture: {
      output_path: join(tempDir, 'proofs/proof.png'),
      cleanup: {
        status: 'skipped'
      }
    }
  });
});

it('wraps local file markdown in angle brackets when the output name contains parentheses', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);
  const outputPath = join(tempDir, 'proof (1).png');

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      outputPath
    },
    {
      platform: 'darwin',
      runCommand: async (request: ProviderLinearScreenshotProofCommandRequest) => {
        if (request.command === 'screencapture') {
          const resolvedOutputPath = request.args.at(-1);
          if (!resolvedOutputPath) {
            throw new Error('missing output path');
          }
          await writeFile(resolvedOutputPath, 'png', 'utf8');
          return commandResult();
        }
        throw new Error(`unexpected command ${request.command}`);
      }
    }
  );

  expect(result).toMatchObject({ ok: true });
  if (!result.ok) {
    throw new Error('expected success');
  }
  expect(result.capture.embed_markdown).toContain('(<file:///');
  expect(result.capture.embed_markdown).toContain('proof%20(1).png>)');
});

it('classifies likely screen-recording permission failures from screencapture stderr', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      outputPath: 'proof.png'
    },
    {
      platform: 'darwin',
      runCommand: async () =>
        commandResult({
          exit_code: 1,
          stderr:
            'screencapture: You are not authorized to capture the contents of the screen without Screen Recording permission.'
        })
    }
  );

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'screenshot_proof_screen_recording_denied'
    },
    capture: {
      cleanup: {
        status: 'skipped'
      }
    }
  });
});

it('classifies unreadable output when screencapture succeeds but no file is readable afterward', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      outputPath: 'proof.png'
    },
    {
      platform: 'darwin',
      runCommand: async () => commandResult()
    }
  );

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'screenshot_proof_output_unreadable'
    }
  });
});

it('classifies automation-denied cleanup failures after a successful preview capture', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      outputPath: 'proof.png',
      openPreview: true
    },
    {
      platform: 'darwin',
      sleep: async () => {},
      runCommand: async (request: ProviderLinearScreenshotProofCommandRequest) => {
        if (request.command === 'pgrep') {
          return commandResult({
            exit_code: 1
          });
        }
        if (request.command === 'screencapture') {
          const outputPath = request.args.at(-1);
          if (!outputPath) {
            throw new Error('missing output path');
          }
          await writeFile(outputPath, 'png', 'utf8');
          return commandResult();
        }
        if (request.command === 'osascript') {
          return commandResult({
            exit_code: 1,
            stderr: 'Not authorized to send Apple events to Preview. (-1743)'
          });
        }
        throw new Error(`unexpected command ${request.command}`);
      }
    }
  );

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'screenshot_proof_cleanup_automation_denied'
    },
    capture: {
      bytes: 3,
      cleanup: {
        status: 'automation-denied'
      }
    }
  });
});

it('skips bounded cleanup when Preview was already running before capture', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      outputPath: 'proof.png',
      openPreview: true
    },
    {
      platform: 'darwin',
      sleep: async () => {},
      runCommand: async (request: ProviderLinearScreenshotProofCommandRequest) => {
        if (request.command === 'pgrep') {
          return commandResult({
            stdout: '123\n'
          });
        }
        if (request.command === 'screencapture') {
          const outputPath = request.args.at(-1);
          if (!outputPath) {
            throw new Error('missing output path');
          }
          await writeFile(outputPath, 'png', 'utf8');
          return commandResult();
        }
        throw new Error(`unexpected command ${request.command}`);
      }
    }
  );

  expect(result).toMatchObject({
    ok: true,
    capture: {
      bytes: 3,
      cleanup: {
        status: 'skipped',
        summary:
          'Cleanup skipped because Preview was already running before capture, so the helper would not close unrelated Preview documents.'
      }
    }
  });
});

it('classifies cleanup failures when the bounded Preview cleanup script returns an unexpected result', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-screenshot-proof-'));
  tempDirs.push(tempDir);

  const result = await resolveProviderLinearScreenshotProof(
    {
      cwd: tempDir,
      outputPath: 'proof.png',
      openPreview: true
    },
    {
      platform: 'darwin',
      sleep: async () => {},
      runCommand: async (request: ProviderLinearScreenshotProofCommandRequest) => {
        if (request.command === 'pgrep') {
          return commandResult({
            exit_code: 1
          });
        }
        if (request.command === 'screencapture') {
          const outputPath = request.args.at(-1);
          if (!outputPath) {
            throw new Error('missing output path');
          }
          await writeFile(outputPath, 'png', 'utf8');
          return commandResult();
        }
        if (request.command === 'osascript') {
          return commandResult({
            stdout: 'unexpected\n'
          });
        }
        throw new Error(`unexpected command ${request.command}`);
      }
    }
  );

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'screenshot_proof_cleanup_failed'
    },
    capture: {
      bytes: 3,
      cleanup: {
        status: 'failed'
      }
    }
  });
});
