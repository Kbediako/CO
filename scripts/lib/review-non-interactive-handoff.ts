import path from 'node:path';

import {
  prepareReviewArtifacts,
  type ReviewArtifactPaths
} from './review-launch-attempt.js';

export interface ReviewNonInteractiveHandoffShellOptions {
  cliNonInteractive?: boolean;
  env: NodeJS.ProcessEnv;
  manifestPath: string;
  prompt: string;
  repoRoot: string;
  runnerLogExists: boolean;
  runnerLogPath: string;
  stdinIsTTY: boolean;
  logger?: Pick<Console, 'log'>;
}

export interface ReviewNonInteractiveHandoffShellResult {
  artifactPaths: ReviewArtifactPaths;
  nonInteractive: boolean;
  reviewEnv: NodeJS.ProcessEnv;
  handedOff: boolean;
}

export function shouldForceNonInteractive(env: NodeJS.ProcessEnv, stdinIsTTY: boolean): boolean {
  return (
    !stdinIsTTY ||
    envFlagEnabled(env.CI) ||
    envFlagEnabled(env.CODEX_REVIEW_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NO_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NONINTERACTIVE)
  );
}

export function shouldPrintNonInteractiveHandoff(params: {
  env: NodeJS.ProcessEnv;
  nonInteractive: boolean;
  stdinIsTTY: boolean;
}): boolean {
  return (
    params.nonInteractive &&
    !envFlagEnabled(params.env.FORCE_CODEX_REVIEW) &&
    (envFlagEnabled(params.env.CI) ||
      !params.stdinIsTTY ||
      envFlagEnabled(params.env.CODEX_REVIEW_NON_INTERACTIVE) ||
      envFlagEnabled(params.env.CODEX_NON_INTERACTIVE) ||
      envFlagEnabled(params.env.CODEX_NO_INTERACTIVE) ||
      envFlagEnabled(params.env.CODEX_NONINTERACTIVE))
  );
}

export async function prepareReviewNonInteractiveHandoffShell(
  options: ReviewNonInteractiveHandoffShellOptions
): Promise<ReviewNonInteractiveHandoffShellResult> {
  const artifactPaths = await prepareReviewArtifacts(
    options.manifestPath,
    options.prompt,
    options.repoRoot
  );
  const nonInteractive =
    options.cliNonInteractive ?? shouldForceNonInteractive(options.env, options.stdinIsTTY);
  const reviewEnv = { ...options.env };
  reviewEnv.MANIFEST = options.manifestPath;
  if (options.runnerLogExists) {
    reviewEnv.RUNNER_LOG = options.runnerLogPath;
    reviewEnv.RUN_LOG = options.runnerLogPath;
  } else {
    delete reviewEnv.RUNNER_LOG;
    delete reviewEnv.RUN_LOG;
  }
  if (nonInteractive) {
    reviewEnv.CODEX_NON_INTERACTIVE = reviewEnv.CODEX_NON_INTERACTIVE ?? '1';
    reviewEnv.CODEX_NO_INTERACTIVE = reviewEnv.CODEX_NO_INTERACTIVE ?? '1';
    reviewEnv.CODEX_INTERACTIVE = reviewEnv.CODEX_INTERACTIVE ?? '0';
  }

  const handedOff = shouldPrintNonInteractiveHandoff({
    env: options.env,
    nonInteractive,
    stdinIsTTY: options.stdinIsTTY
  });
  if (handedOff) {
    const logger = options.logger ?? console;
    logger.log('Codex review handoff (non-interactive):');
    logger.log('---');
    logger.log(options.prompt);
    logger.log('---');
    logger.log(`Review prompt saved to: ${path.relative(options.repoRoot, artifactPaths.promptPath)}`);
    logger.log('Set FORCE_CODEX_REVIEW=1 to invoke `codex review` in this environment.');
  }

  return { artifactPaths, nonInteractive, reviewEnv, handedOff };
}

function envFlagEnabled(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
