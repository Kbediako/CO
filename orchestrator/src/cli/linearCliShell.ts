/* eslint-disable patterns/prefer-logger-over-console */

import { readFile } from 'node:fs/promises';
import process from 'node:process';

import {
  resolveLinearSourceSetup,
} from './control/linearDispatchSource.js';
import {
  attachProviderLinearIssuePr,
  deleteProviderLinearWorkpadComment,
  getProviderLinearIssueContext,
  type ProviderLinearAttachPrResult,
  type ProviderLinearDeleteWorkpadResult,
  type ProviderLinearIssueContextResult,
  type ProviderLinearTransitionResult,
  type ProviderLinearUpsertWorkpadResult,
  transitionProviderLinearIssueState,
  upsertProviderLinearWorkpadComment
} from './control/providerLinearWorkflowFacade.js';
import {
  appendProviderLinearAuditEntry,
  resolveProviderLinearAuditPath,
  type ProviderLinearAuditEntry
} from './control/providerLinearWorkflowAudit.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';

type ArgMap = Record<string, string | boolean>;

export interface RunLinearCliShellParams {
  positionals: string[];
  flags: ArgMap;
  printHelp: () => void;
}

interface LinearCliShellDependencies {
  getProviderLinearIssueContext: typeof getProviderLinearIssueContext;
  upsertProviderLinearWorkpadComment: typeof upsertProviderLinearWorkpadComment;
  deleteProviderLinearWorkpadComment: typeof deleteProviderLinearWorkpadComment;
  transitionProviderLinearIssueState: typeof transitionProviderLinearIssueState;
  attachProviderLinearIssuePr: typeof attachProviderLinearIssuePr;
  appendAuditEntry: typeof appendProviderLinearAuditEntry;
  readTextFile: (path: string) => Promise<string>;
  getEnv: () => NodeJS.ProcessEnv;
  now: () => string;
  log: (line: string) => void;
  warn: (line: string) => void;
  setExitCode: (code: number) => void;
}

interface LinearCliUsageFailureResult {
  ok: false;
  error: {
    code: string;
    message: string;
    status: number;
  };
}

type LinearCliUsageError = Error & {
  result: LinearCliUsageFailureResult;
};

const DEFAULT_DEPENDENCIES: LinearCliShellDependencies = {
  getProviderLinearIssueContext,
  upsertProviderLinearWorkpadComment,
  deleteProviderLinearWorkpadComment,
  transitionProviderLinearIssueState,
  attachProviderLinearIssuePr,
  appendAuditEntry: appendProviderLinearAuditEntry,
  readTextFile: async (path: string) => await readFile(path, 'utf8'),
  getEnv: () => process.env,
  now: () => new Date().toISOString(),
  log: (line: string) => console.log(line),
  warn: (line: string) => console.warn(line),
  setExitCode: (code: number) => {
    process.exitCode = code;
  }
};

export async function runLinearCliShell(
  params: RunLinearCliShellParams,
  overrides: Partial<LinearCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  try {
    const env = dependencies.getEnv();
    const positionals = [...params.positionals];
    const subcommand = positionals.shift();
    const wantsHelp =
      params.flags['help'] === true
      || params.flags['--help'] === true
      || params.flags['h'] === true
      || !subcommand
      || subcommand === 'help'
      || subcommand === '--help'
      || subcommand === '-h';

    if (wantsHelp) {
      params.printHelp();
      return;
    }

    if (positionals.length > 0) {
      throw usageError(
        'linear_extra_arguments',
        `linear does not accept extra positional arguments: ${positionals.join(' ')}`
      );
    }

    switch (subcommand) {
      case 'issue-context': {
        assertAllowedFlags(params.flags, ['format', 'issue-id', 'workspace-id', 'team-id', 'project-id']);
        const result = await dependencies.getProviderLinearIssueContext({
          issueId: requireFlag(params.flags, 'issue-id'),
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'upsert-workpad': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'body',
          'body-file',
          'comment-id'
        ]);
        const result = await dependencies.upsertProviderLinearWorkpadComment({
          issueId: requireFlag(params.flags, 'issue-id'),
          body: await resolveBody(params.flags, dependencies.readTextFile),
          commentId: readStringFlag(params.flags, 'comment-id') ?? null,
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'delete-workpad': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'comment-id'
        ]);
        const result = await dependencies.deleteProviderLinearWorkpadComment({
          issueId: requireFlag(params.flags, 'issue-id'),
          commentId: readStringFlag(params.flags, 'comment-id') ?? null,
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'transition': {
        assertAllowedFlags(params.flags, ['format', 'issue-id', 'workspace-id', 'team-id', 'project-id', 'state']);
        const result = await dependencies.transitionProviderLinearIssueState({
          issueId: requireFlag(params.flags, 'issue-id'),
          stateName: requireFlag(params.flags, 'state'),
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'attach-pr': {
        assertAllowedFlags(params.flags, ['format', 'issue-id', 'workspace-id', 'team-id', 'project-id', 'url', 'title']);
        const result = await dependencies.attachProviderLinearIssuePr({
          issueId: requireFlag(params.flags, 'issue-id'),
          url: requireFlag(params.flags, 'url'),
          title: readStringFlag(params.flags, 'title') ?? null,
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      default:
        throw usageError('linear_unknown_subcommand', `Unknown linear subcommand: ${subcommand}`);
    }
  } catch (error) {
    emitJsonResult(
      isLinearCliUsageError(error) ? error.result : failureResult('linear_cli_error', resolveErrorMessage(error), 500),
      dependencies
    );
  }
}

function emitJsonResult(
  result: { ok: boolean },
  dependencies: Pick<LinearCliShellDependencies, 'log' | 'setExitCode'>
): void {
  dependencies.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    dependencies.setExitCode(1);
  }
}

function assertAllowedFlags(flags: ArgMap, allowed: string[]): void {
  const allowedSet = new Set([...allowed, 'help', '--help', 'h']);
  for (const key of Object.keys(flags)) {
    if (!allowedSet.has(key)) {
      throw usageError('linear_unknown_flag', `Unknown linear flag: --${key}`);
    }
  }
  const format = flags['format'];
  if (format !== undefined && format !== 'json') {
    throw usageError('linear_format_unsupported', 'linear only supports --format json.');
  }
}

function requireFlag(flags: ArgMap, key: string): string {
  const value = readStringFlag(flags, key);
  if (!value) {
    throw usageError('linear_missing_flag', `--${key} is required.`);
  }
  return value;
}

function readRawStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readSourceSetup(flags: ArgMap): DispatchPilotSourceSetup | null {
  const workspaceId = readStringFlag(flags, 'workspace-id') ?? null;
  const teamId = readStringFlag(flags, 'team-id') ?? null;
  const projectId = readStringFlag(flags, 'project-id') ?? null;
  if (!workspaceId && !teamId && !projectId) {
    return null;
  }
  return {
    provider: 'linear',
    workspace_id: workspaceId,
    team_id: teamId,
    project_id: projectId
  };
}

async function resolveBody(
  flags: ArgMap,
  readTextFile: (path: string) => Promise<string>
): Promise<string> {
  const inlineBody = readRawStringFlag(flags, 'body');
  const bodyFile = readStringFlag(flags, 'body-file');
  const hasInlineBody = typeof inlineBody === 'string' && inlineBody.trim().length > 0;
  if (hasInlineBody && bodyFile) {
    throw usageError('linear_body_conflict', 'Use either --body or --body-file, not both.');
  }
  if (hasInlineBody) {
    return inlineBody;
  }
  if (bodyFile) {
    return await readTextFile(bodyFile);
  }
  throw usageError('linear_body_missing', '--body or --body-file is required.');
}

function usageError(code: string, message: string): LinearCliUsageError {
  const error = new Error(message) as LinearCliUsageError;
  error.result = failureResult(code, message, 422);
  return error;
}

function isLinearCliUsageError(error: unknown): error is LinearCliUsageError {
  return (
    error instanceof Error
    && typeof (error as Partial<LinearCliUsageError>).result?.error?.code === 'string'
    && typeof (error as Partial<LinearCliUsageError>).result?.error?.message === 'string'
    && typeof (error as Partial<LinearCliUsageError>).result?.error?.status === 'number'
  );
}

function failureResult(code: string, message: string, status: number): LinearCliUsageFailureResult {
  return {
    ok: false,
    error: {
      code,
      message,
      status
    }
  };
}

function resolveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type LinearCliResult =
  | ProviderLinearIssueContextResult
  | ProviderLinearUpsertWorkpadResult
  | ProviderLinearDeleteWorkpadResult
  | ProviderLinearTransitionResult
  | ProviderLinearAttachPrResult;

async function recordAuditResult(
  result: LinearCliResult,
  flags: ArgMap,
  env: NodeJS.ProcessEnv,
  dependencies: Pick<LinearCliShellDependencies, 'appendAuditEntry' | 'now' | 'warn'>
): Promise<void> {
  const auditPath = resolveProviderLinearAuditPath(env);
  if (!auditPath) {
    return;
  }
  try {
    await dependencies.appendAuditEntry(auditPath, buildAuditEntry(result, flags, env, dependencies.now()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dependencies.warn(`linear audit warning: failed to append audit entry to ${auditPath}: ${message}`);
  }
}

function buildAuditEntry(
  result: LinearCliResult,
  flags: ArgMap,
  env: NodeJS.ProcessEnv,
  recordedAt: string
): ProviderLinearAuditEntry {
  const requestedIssueId = readStringFlag(flags, 'issue-id') ?? null;
  const sourceSetup = resolveAuditSourceSetup(flags, env);
  if (!result.ok) {
    return {
      recorded_at: recordedAt,
      operation: result.operation,
      ok: false,
      issue_id: requestedIssueId,
      issue_identifier: null,
      source_setup: sourceSetup,
      action: null,
      via: null,
      state: null,
      comment_id: null,
      attachment_id: null,
      error_code: result.error.code,
      error_message: result.error.message
    };
  }

  switch (result.operation) {
    case 'issue-context':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: null,
        via: null,
        state: result.issue.state?.name ?? null,
        comment_id: result.issue.workpad_comment?.id ?? null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'upsert-workpad':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: null,
        state: null,
        comment_id: result.comment.id,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'delete-workpad':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: null,
        state: null,
        comment_id: result.comment_id,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'transition':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: null,
        state: result.issue.state?.name ?? result.target_state.name,
        comment_id: null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'attach-pr':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: result.via,
        state: null,
        comment_id: null,
        attachment_id: result.attachment.id,
        error_code: null,
        error_message: null
      };
  }
}

function resolveAuditSourceSetup(flags: ArgMap, env: NodeJS.ProcessEnv): DispatchPilotSourceSetup | null {
  const sourceSetup = readSourceSetup(flags);
  if (sourceSetup) {
    return sourceSetup;
  }
  const resolved = resolveLinearSourceSetup(
    {
      provider: 'linear',
      workspace_id: null,
      team_id: null,
      project_id: null
    },
    env
  );
  return resolved.workspace_id || resolved.team_id || resolved.project_id ? resolved : null;
}
