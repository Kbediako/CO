import { afterEach, describe, expect, it } from 'vitest';
import { execFile, spawn } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import type { ReviewOutcomeDisposition } from '../scripts/lib/review-execution-telemetry.js';
import { isDirectExecution, runReviewCli } from '../scripts/run-review.js';
import { shouldUseFreshDist } from './helpers/distFreshness.js';
import { runEntrypointInProcess } from './helpers/inProcessEntrypoint.js';

const execFileAsync = promisify(execFile);
const runReviewScript = join(process.cwd(), 'scripts', 'run-review.ts');
const runReviewScriptDist = join(process.cwd(), 'dist', 'scripts', 'run-review.js');
const createdSandboxes: string[] = [];
const shellBinary = 'bash';
const LONG_WAIT_TEST_TIMEOUT_MS = 20_000;
const RUN_REVIEW_SUBPROCESS_TIMEOUT_MS = 15_000;
const RUN_REVIEW_HANGING_SUBPROCESS_TIMEOUT_MS = 15_000;
const RUN_REVIEW_HANGING_SUBPROCESS_TEST_TIMEOUT_MS = 30_000;
const RUN_REVIEW_MOCK_REAP_POLL_ATTEMPTS = 10;
const RUN_REVIEW_MOCK_REAP_POLL_INTERVAL_MS = 50;
const THREAD_NOT_FOUND_ROLLOUT_NOISE_MESSAGE =
  'codex_core::session: failed to record rollout items: thread 019de1d2-3b27-7193-8330-0ed726e28044 not found';
const THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE = `WARN ${THREAD_NOT_FOUND_ROLLOUT_NOISE_MESSAGE}`;

interface RunReviewMockProcess {
  pid: number;
  pgid: number | null;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitForFileContents(
  filePath: string,
  expected: string,
  options: { attempts?: number; intervalMs?: number } = {}
): Promise<void> {
  const attempts = options.attempts ?? 60;
  const intervalMs = options.intervalMs ?? 50;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const contents = await readFile(filePath, 'utf8');
      if (contents === expected) {
        return;
      }
    } catch {
      // The fake review command writes the marker only after reaching hang mode.
    }
    await delay(intervalMs);
  }
  throw new Error(`Timed out waiting for ${filePath} to contain ${JSON.stringify(expected)}`);
}

function isCommandTokenBoundary(value: string | undefined): boolean {
  return value === undefined || /\s/u.test(value);
}

function findCommandTokenStart(command: string, token: string): number {
  let start = command.indexOf(token);
  while (start !== -1) {
    const before = start === 0 ? undefined : command[start - 1];
    const after = command[start + token.length];
    if (isCommandTokenBoundary(before) && isCommandTokenBoundary(after)) {
      return start;
    }
    start = command.indexOf(token, start + 1);
  }
  return -1;
}

function commandInvokesRunReviewMock(command: string, codexBin: string): boolean {
  const commandStart = findCommandTokenStart(command, codexBin);
  if (commandStart === -1) {
    return false;
  }

  const tokens = command
    .slice(commandStart + codexBin.length)
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 0);
  let index = 0;
  while (tokens[index] === '-c' || tokens[index] === '--config') {
    if (!tokens[index + 1]) {
      return false;
    }
    index += 2;
  }
  return tokens[index] === 'review';
}

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'run-review-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function makeManifest(sandbox: string): Promise<string> {
  return makeManifestForTask(sandbox, 'sample-task', 'sample-run');
}

async function makeManifestForTask(sandbox: string, taskId: string, runId: string): Promise<string> {
  const runDir = join(sandbox, '.runs', taskId, 'cli', runId);
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ run: 'sample' }), 'utf8');
  await writeFile(join(runDir, 'runner.ndjson'), '{"event":"sample"}\n', 'utf8');
  return manifestPath;
}

async function makeDetachedManifest(sandbox: string): Promise<string> {
  const runDir = join(sandbox, 'detached-review-run');
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ run: 'detached' }), 'utf8');
  await writeFile(join(runDir, 'runner.ndjson'), '{"event":"detached"}\n', 'utf8');
  return manifestPath;
}

async function makeCloseoutBundle(
  sandbox: string,
  taskId: string,
  bundleName = 'TODO-closeout'
): Promise<string> {
  const bundleDir = join(sandbox, 'out', taskId, 'manual', bundleName);
  await mkdir(bundleDir, { recursive: true });
  await writeFile(join(bundleDir, '09-review.log'), 'shellProbeCount\n', 'utf8');
  await writeFile(join(bundleDir, '13-override-notes.md'), 'getShellProbeBoundaryState\n', 'utf8');
  return bundleDir;
}

async function writeTaskDocsFirstContext(
  sandbox: string,
  taskId: string,
  options: { includeArchitectureBaseline?: boolean } = {}
): Promise<void> {
  await mkdir(join(sandbox, 'tasks', 'specs'), { recursive: true });
  await mkdir(join(sandbox, 'docs'), { recursive: true });
  await writeFile(
    join(sandbox, 'tasks', `tasks-${taskId}.md`),
    [
      `# Task Checklist - ${taskId}`,
      '',
      `- MCP Task ID: \`${taskId}\``,
      `- Primary PRD: \`docs/PRD-${taskId}.md\``,
      `- TECH_SPEC: \`tasks/specs/${taskId}.md\``,
      `- ACTION_PLAN: \`docs/ACTION_PLAN-${taskId}.md\``,
      ''
    ].join('\n'),
    'utf8'
  );
  await writeFile(join(sandbox, 'docs', `PRD-${taskId}.md`), '# PRD\n', 'utf8');
  await writeFile(join(sandbox, 'tasks', 'specs', `${taskId}.md`), '# TECH_SPEC\n', 'utf8');
  await writeFile(join(sandbox, 'docs', `ACTION_PLAN-${taskId}.md`), '# ACTION_PLAN\n', 'utf8');
  if (options.includeArchitectureBaseline) {
    await mkdir(join(sandbox, '.agent', 'system'), { recursive: true });
    await writeFile(join(sandbox, '.agent', 'system', 'architecture.md'), '# Architecture\n', 'utf8');
  }
}

async function runGit(args: string[], cwd: string): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

async function initGitRepoWithCommittedFiles(
  sandbox: string,
  fileCount: number,
  extension = '.txt'
): Promise<{ files: string[] }> {
  await runGit(['init', '-q'], sandbox);
  await runGit(['config', 'user.email', 'run-review-tests@example.com'], sandbox);
  await runGit(['config', 'user.name', 'run-review-tests'], sandbox);

  const files: string[] = [];
  for (let index = 1; index <= fileCount; index += 1) {
    const file = `file-${index}${extension}`;
    files.push(file);
    await writeFile(join(sandbox, file), `baseline-${index}\n`, 'utf8');
  }
  await runGit(['add', '.'], sandbox);
  await runGit(['commit', '-m', 'seed'], sandbox);
  return { files };
}

async function initGitRepoWithTouchedPath(sandbox: string, relativePath: string): Promise<void> {
  await runGit(['init', '-q'], sandbox);
  await runGit(['config', 'user.email', 'run-review-tests@example.com'], sandbox);
  await runGit(['config', 'user.name', 'run-review-tests'], sandbox);

  const filePath = join(sandbox, relativePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, 'baseline\n', 'utf8');
  await runGit(['add', '.'], sandbox);
  await runGit(['commit', '-m', 'seed touched path'], sandbox);
  await writeFile(filePath, 'updated\n', 'utf8');
}

async function makeFakeCodex(sandbox: string): Promise<string> {
  const binPath = join(sandbox, 'codex-mock.sh');
  const script = `#!/usr/bin/env bash
set -euo pipefail
config_overrides=()
approval_policy=""
while [[ "\${1:-}" == "-c" || "\${1:-}" == "--config" || "\${1:-}" == "-a" || "\${1:-}" == "--ask-for-approval" ]]; do
  case "\${1:-}" in
    -c|--config)
      if [[ "$#" -lt 2 ]]; then
        echo "missing value for $1" >&2
        exit 2
      fi
      config_overrides+=("\${2}")
      shift 2
      ;;
    -a|--ask-for-approval)
      if [[ "$#" -lt 2 ]]; then
        echo "missing value for $1" >&2
        exit 2
      fi
      approval_policy="\${2}"
      shift 2
      ;;
  esac
done
if [[ -n "\${RUN_REVIEW_ARGS_LOG:-}" ]]; then
  {
    echo "---"
    if [[ "\${#config_overrides[@]}" -gt 0 ]]; then
      for override in "\${config_overrides[@]}"; do
        echo "config=$override"
      done
    fi
    if [[ -n "$approval_policy" ]]; then
      echo "approval=$approval_policy"
    fi
    echo "argv=$*"
  } >> "\${RUN_REVIEW_ARGS_LOG}"
fi
if [[ -n "\${RUN_REVIEW_ENV_LOG:-}" ]]; then
  {
    echo "---"
    echo "CODEX_ORCHESTRATOR_ROOT=\${CODEX_ORCHESTRATOR_ROOT-}"
    echo "CODEX_ORCHESTRATOR_MANIFEST_PATH=\${CODEX_ORCHESTRATOR_MANIFEST_PATH-}"
    echo "CODEX_ORCHESTRATOR_RUN_DIR=\${CODEX_ORCHESTRATOR_RUN_DIR-}"
    echo "CODEX_ORCHESTRATOR_RUNS_DIR=\${CODEX_ORCHESTRATOR_RUNS_DIR-}"
    echo "CODEX_ORCHESTRATOR_OUT_DIR=\${CODEX_ORCHESTRATOR_OUT_DIR-}"
    echo "CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS=\${CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS-}"
    echo "MANIFEST=\${MANIFEST-}"
  } >> "\${RUN_REVIEW_ENV_LOG}"
fi
has_arg() {
  local needle="$1"
  shift
  for arg in "$@"; do
    if [[ "$arg" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}
has_inline_prompt() {
  local args=("$@")
  local index=0
  while [[ $index -lt \${#args[@]} ]]; do
    local arg="\${args[$index]}"
    case "$arg" in
      review)
        if [[ $index -ne 0 ]]; then
          return 0
        fi
        ;;
      --uncommitted)
        ;;
      --base|--commit|--title)
        index=$((index + 1))
        ;;
      --*)
        ;;
      *)
        return 0
        ;;
    esac
    index=$((index + 1))
  done
  return 1
}
if [[ "\${1:-}" == "--help" ]]; then
  if [[ "\${RUN_REVIEW_MODE:-ok}" == "delete-after-help" ]]; then
    rm -f "$0"
  fi
  echo "OpenAI Codex CLI"
  echo "  review   Review changes"
  exit 0
fi
if [[ "\${1:-}" == "exec" ]]; then
  mode="\${RUN_REVIEW_MODE:-ok}"
  output_last_message="" stdin_payload=""
  index=1
  while [[ $index -le $# ]]; do
    arg="\${!index}"
    if [[ "$arg" == "--output-last-message" ]]; then
      next=$((index + 1))
      output_last_message="\${!next:-}"
      index=$((index + 2))
      continue
    fi
    index=$((index + 1))
  done
  for arg in "$@"; do [[ "$arg" == "-" ]] && stdin_payload="$(cat)" && break; done
  [[ -z "\${RUN_REVIEW_STDIN_LOG:-}" ]] || printf '%s' "$stdin_payload" > "\${RUN_REVIEW_STDIN_LOG}"
  if [[ "$mode" == "contract-clean-output" ]]; then
    review_dir="$(dirname "\${MANIFEST}")/review"
    evidence_path="\${review_dir}/inputs/spec-bundle.json"
    evidence_rel="\${evidence_path#\${CODEX_ORCHESTRATOR_ROOT}/}"
    evidence_sha="$(shasum -a 256 "$evidence_path" | awk '{print $1}')"
    contract_json="$(cat <<JSON
{"schema_version":"co.review.contract.v1","generated_at":"2026-05-18T00:00:00.000Z","overall_verdict":"clean","axes":{"spec_conformance":{"verdict":"clean","summary":"Spec checked.","clean_signal":"Spec checked.","evidence_refs":[{"path":"$evidence_rel","sha256":"$evidence_sha","description":"spec bundle"}],"findings":[]},"coding_standards":{"verdict":"clean","summary":"Standards checked.","clean_signal":"Standards checked.","evidence_refs":[{"path":"$evidence_rel","sha256":"$evidence_sha","description":"spec bundle"}],"findings":[]},"code_changes":{"verdict":"clean","summary":"Code checked.","clean_signal":"Code checked.","evidence_refs":[{"path":"$evidence_rel","sha256":"$evidence_sha","description":"spec bundle"}],"findings":[]},"agent_loop":{"verdict":"clean","summary":"Agent loop checked.","clean_signal":"Agent loop checked.","evidence_refs":[{"path":"$evidence_rel","sha256":"$evidence_sha","description":"spec bundle"}],"findings":[]}},"code_change_proposals":[],"agent_loop_proposals":[]}
JSON
)"
    if [[ -n "$output_last_message" ]]; then
      printf '%s\n' "$contract_json" > "$output_last_message"
    fi
    echo "codex"
    printf '%s\n' "$contract_json"
    echo "hook: Stop"
    echo "hook: Stop Completed"
    exit 0
  fi
  if [[ "$mode" == "telemetry-persist-failure" ]]; then
    mkdir -p "$(dirname "\${MANIFEST}")/review/telemetry.json"
    echo "codex"
    echo "I found no actionable issues in the uncommitted diff."
    exit 0
  fi
  echo "codex"
  echo "I found no actionable issues in the uncommitted diff."
  echo "hook: Stop"
  echo "hook: Stop Completed"
  exit 0
fi
  if [[ "\${1:-}" == "review" ]]; then
    mode="\${RUN_REVIEW_MODE:-ok}"
    if [[ "$mode" == "thread-not-found-noise-ok" ]]; then
      echo "${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}" >&2
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "thread-not-found-noise-nonzero" ]]; then
      echo "${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}" >&2
      echo "review failed after noisy session cleanup" >&2
      exit 2
    fi
    if [[ "$mode" == "thread-not-found-noise-bounded" ]]; then
      echo "${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}" >&2
      mode="relevant-reinspection-dwell"
    fi
    if [[ "$mode" == "hang" ]]; then
      if [[ -n "\${RUN_REVIEW_HANG_MARKER:-}" ]]; then
        printf 'started\\n' > "$RUN_REVIEW_HANG_MARKER"
      fi
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "reject-scoped-prompt" ]]; then
      if has_inline_prompt "$@" && has_arg "--base" "$@"; then
        echo "custom prompt cannot be combined with --base" >&2
        exit 1
      fi
      if has_inline_prompt "$@" && has_arg "--commit" "$@"; then
        echo "custom prompt cannot be combined with --commit" >&2
        exit 1
      fi
      if has_inline_prompt "$@" && has_arg "--uncommitted" "$@"; then
        echo "custom prompt cannot be combined with --uncommitted" >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-scoped-prompt-generic-diff-scoping" ]]; then
      if has_inline_prompt "$@"; then
        if has_arg "--base" "$@" || has_arg "--commit" "$@" || has_arg "--uncommitted" "$@"; then
          echo "custom prompt cannot be combined with diff scoping" >&2
          exit 1
        fi
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-scoped-prompt-usage-footer" ]]; then
      if has_inline_prompt "$@" && has_arg "--base" "$@"; then
        echo "custom prompt cannot be combined with diff scoping" >&2
        echo "Usage: codex review [options]" >&2
        echo "  --base <ref>" >&2
        echo "  --commit <sha>" >&2
        exit 1
      fi
      if has_inline_prompt "$@" && has_arg "--commit" "$@"; then
        echo "custom prompt cannot be combined with diff scoping" >&2
        echo "Usage: codex review [options]" >&2
        echo "  --base <ref>" >&2
        echo "  --commit <sha>" >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-title" ]]; then
      if has_arg "--title" "$@"; then
        echo "unknown option --title" >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-title-usage-footer" ]]; then
      if has_arg "--title" "$@"; then
        echo "unknown option --title" >&2
        echo "Usage: codex review [options]" >&2
        echo "  --base <ref>" >&2
        echo "  --commit <sha>" >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-title-prompt-usage-footer" ]]; then
      if has_arg "--title" "$@"; then
        echo "custom prompt cannot be combined with --title" >&2
        echo "Usage: codex review [options]" >&2
        echo "  --base <ref>" >&2
        echo "  --commit <sha>" >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-title-base-incompatibility" ]]; then
      if has_arg "--title" "$@"; then
        echo "--title cannot be used with --base" >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-title-base-incompatibility-double-quoted" ]]; then
      if has_arg "--title" "$@"; then
        echo '--title cannot be used with "--base"' >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-base-unknown-option" ]]; then
      if has_arg "--base" "$@"; then
        echo "unknown option --base" >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "reject-base-quoted-unknown-option" ]]; then
      if has_arg "--base" "$@"; then
        echo "unknown option '--base'" >&2
        exit 1
      fi
      echo "stdout-ok"
      echo "stderr-ok" >&2
      exit 0
    fi
    if [[ "$mode" == "term-graceful-timeout" ]]; then
      trap 'echo "term-sentinel"; exit 0' TERM
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,40p scripts/run-review.ts' in /Users/kbediako/Code/CO"
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "delegation-loop" ]]; then
      while true; do
        echo "mcp: delegation starting"
        echo "mcp: delegation ready"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "delegation-loop-with-banner" ]]; then
      echo "OpenAI Codex v0.104.0"
      while true; do
        echo "mcp: delegation starting"
        echo "mcp: delegation ready"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "delegation-loop-fragmented" ]]; then
      while true; do
        printf "mcp: delegation star"
        sleep 0.01
        printf "ting\\nmcp: delegation rea"
        sleep 0.01
        printf "dy\\n"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "delegation-loop-cross-stream-fragmented" ]]; then
      while true; do
        printf "mcp: delegation star"
        printf "ting\\n" >&2
        sleep 0.05
      done
    fi
    if [[ "$mode" == "low-signal-drift" ]]; then
      while true; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p tasks/tasks-1059-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "relevant-reinspection-dwell" ]]; then
      commands=(
        "sed -n 1,20p file-1.py"
        "sed -n 21,40p file-1.py"
        "head -n 5 file-1.py"
        "tail -n 5 file-1.py"
        "grep -n updated file-1.py"
        "grep -n baseline file-1.py"
        "cat file-1.py"
        "wc -l file-1.py"
      )
      while true; do
        for command in "\${commands[@]}"; do
          echo "thinking"
          echo "exec"
          echo "/bin/zsh -lc '\${command}' in /Users/kbediako/Code/CO"
          sleep 0.05
        done
      done
    fi
    if [[ "$mode" == "relevant-reinspection-dwell-term-nonzero" ]]; then
      trap 'echo "term-nonzero"; exit 7' TERM
      commands=(
        "sed -n 1,20p file-1.py"
        "sed -n 21,40p file-1.py"
        "head -n 5 file-1.py"
        "tail -n 5 file-1.py"
        "grep -n updated file-1.py"
        "grep -n baseline file-1.py"
        "cat file-1.py"
        "wc -l file-1.py"
      )
      while true; do
        for command in "\${commands[@]}"; do
          echo "thinking"
          echo "exec"
          echo "/bin/zsh -lc '\${command}' in /Users/kbediako/Code/CO"
          sleep 0.05
        done
      done
    fi
    if [[ "$mode" == "relevant-reinspection-dwell-heavy-term-nonzero" ]]; then
      on_term() {
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run typecheck -- run-review' in /tmp/run-review-heavy"
        echo "term-heavy"
        sleep 0.1
        exit 143
      }
      trap on_term TERM
      commands=(
        "sed -n 1,20p file-1.py"
        "sed -n 21,40p file-1.py"
        "head -n 5 file-1.py"
        "tail -n 5 file-1.py"
        "grep -n updated file-1.py"
        "grep -n baseline file-1.py"
        "cat file-1.py"
        "wc -l file-1.py"
      )
      while true; do
        for command in "\${commands[@]}"; do
          echo "thinking"
          echo "exec"
          echo "/bin/zsh -lc '\${command}' in /Users/kbediako/Code/CO"
          sleep 0.05
        done
      done
    fi
    if [[ "$mode" == "relevant-reinspection-dwell-slow-term-exit" ]]; then
      trap 'sleep 1.2; echo "term-slow-success"; exit 0' TERM
      commands=(
        "sed -n 1,20p file-1.py"
        "sed -n 21,40p file-1.py"
        "head -n 5 file-1.py"
        "tail -n 5 file-1.py"
        "grep -n updated file-1.py"
        "grep -n baseline file-1.py"
        "cat file-1.py"
        "wc -l file-1.py"
      )
      while true; do
        for command in "\${commands[@]}"; do
          echo "thinking"
          echo "exec"
          echo "/bin/zsh -lc '\${command}' in /Users/kbediako/Code/CO"
          sleep 0.01
        done
      done
    fi
    if [[ "$mode" == "relevant-reinspection-verdict-drift" ]]; then
      trap 'exit 0' TERM
      targets=(
        "file-1.py"
        "file-2.py"
        "file-1.py"
        "file-2.py"
        "file-1.py"
        "file-2.py"
        "file-1.py"
        "file-2.py"
      )
      for target in "\${targets[@]}"; do
        echo "thinking"
        echo "I am still considering whether file review output confirms the same unresolved issue."
        echo "I am still considering whether file review output confirms the same unresolved issue."
        echo "I am still considering whether file review output confirms the same unresolved issue."
        echo "I am still considering whether file review output confirms the same unresolved issue."
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,40p \${target}' in /Users/kbediako/Code/CO"
        sleep 0.01
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "relevant-reinspection-dwell-fast-exit" ]]; then
      commands=(
        "sed -n 1,20p file-1.py"
        "sed -n 21,40p file-1.py"
        "head -n 5 file-1.py"
        "tail -n 5 file-1.py"
        "grep -n updated file-1.py"
        "grep -n baseline file-1.py"
        "cat file-1.py"
        "wc -l file-1.py"
      )
      for command in "\${commands[@]}"; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc '\${command}' in /Users/kbediako/Code/CO"
        sleep 0.01
      done
      sleep 0.15
      exit 0
    fi
    if [[ "$mode" == "relevant-reinspection-dwell-meta-surface-term-success" ]]; then
      on_term() {
        for _ in $(seq 1 6); do
          echo "thinking"
          echo "exec"
          echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
          echo "thinking"
          echo "exec"
          echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md' in /Users/kbediako/Code/CO"
          sleep 0.06
        done
        exit 0
      }
      trap on_term TERM
      commands=(
        "sed -n 1,20p file-1.py"
        "sed -n 21,40p file-1.py"
        "head -n 5 file-1.py"
        "tail -n 5 file-1.py"
        "grep -n updated file-1.py"
        "grep -n baseline file-1.py"
        "cat file-1.py"
        "wc -l file-1.py"
      )
      while true; do
        for command in "\${commands[@]}"; do
          echo "thinking"
          echo "exec"
          echo "/bin/zsh -lc '\${command}' in /Users/kbediako/Code/CO"
          sleep 0.01
        done
      done
    fi
    if [[ "$mode" == "relevant-reinspection-concrete-output" ]]; then
      commands=(
        "sed -n 1,20p file-1.py"
        "sed -n 21,40p file-1.py"
        "head -n 5 file-1.py"
        "tail -n 5 file-1.py"
      )
      for command in "\${commands[@]}"; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc '\${command}' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      echo "Potential finding at file-1.py:1 indicates the touched diff now stays within the expected contract."
      exit 0
    fi
    if [[ "$mode" == "relevant-reinspection-diverse" ]]; then
      targets=(
        "file-1.py"
        "file-2.py"
        "file-3.py"
        "file-4.py"
        "file-5.py"
      )
      for target in "\${targets[@]}"; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,20p \${target}' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      exit 0
    fi
    if [[ "$mode" == "architecture-relevant-reinspection-dwell" ]]; then
      commands=(
        "sed -n 1,120p tasks/tasks-sample-task.md"
        "sed -n 1,120p docs/PRD-sample-task.md"
        "sed -n 1,120p tasks/specs/sample-task.md"
        "sed -n 1,120p docs/ACTION_PLAN-sample-task.md"
        "sed -n 1,120p .agent/system/architecture.md"
        "sed -n 1,120p file-1.py"
        "sed -n 1,120p file-2.py"
        "sed -n 121,240p tasks/tasks-sample-task.md"
        "sed -n 121,240p docs/PRD-sample-task.md"
        "sed -n 121,240p tasks/specs/sample-task.md"
        "sed -n 121,240p docs/ACTION_PLAN-sample-task.md"
        "sed -n 121,240p .agent/system/architecture.md"
        "sed -n 121,240p file-1.py"
        "sed -n 121,240p file-2.py"
      )
      while true; do
        for command in "\${commands[@]}"; do
          echo "thinking"
          echo "exec"
          echo "/bin/zsh -lc '\${command}' in /Users/kbediako/Code/CO"
          sleep 0.05
        done
      done
    fi
    if [[ "$mode" == "verdict-stability-drift" ]]; then
      targets=(
        "scripts/run-review.ts"
        "scripts/lib/review-execution-state.ts"
        "tests/run-review.spec.ts"
        "docs/standalone-review-guide.md"
      )
      for target in "\${targets[@]}"; do
        echo "thinking"
        echo "I need to inspect dist/tests/review-scope-paths.spec.js to confirm whether the generated test surface still exposes the bug."
        echo "I need to inspect dist/tests/review-scope-paths.spec.js to confirm whether the generated test surface still exposes the bug."
        echo "I am still considering whether scripts/lib/review-scope-paths.ts requires another parity change before I can finish the review."
        echo "I am still considering whether scripts/lib/review-scope-paths.ts requires another parity change before I can finish the review."
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p \${target}' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "generic-speculative-dwell" ]]; then
      narratives=(
        "Maybe the reviewer is still circling around ANSI stripping before reaching a final verdict."
        "Maybe the reviewer is still circling around ANSI stripping before reaching a final verdict."
        "I am still considering whether the small-diff revisit policy needs another tweak before I can finish the review."
        "I am still considering whether the small-diff revisit policy needs another tweak before I can finish the review."
      )
      targets=(
        "scripts/run-review.ts"
        "scripts/lib/review-execution-state.ts"
        "tests/run-review.spec.ts"
        "docs/standalone-review-guide.md"
      )
      for index in 0 1 2 3; do
        echo "thinking"
        echo "\${narratives[$index]}"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p \${targets[$index]}' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "verdict-stability-progress" ]]; then
      targets=(
        "scripts/run-review.ts"
        "scripts/lib/review-execution-state.ts"
        "tests/run-review.spec.ts"
        "docs/standalone-review-guide.md"
        "docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md"
      )
      for target in "\${targets[@]}"; do
        echo "thinking"
        echo "I need to inspect \${target} to verify the new concrete review surface before finalizing findings."
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p \${target}' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      exit 0
    fi
    if [[ "$mode" == "citation-contract-local" ]]; then
      prompt="$*"
      if [[ "$prompt" == *"Concrete same-diff progress can be shown by citing touched paths with explicit locations"* ]]; then
        if [[ "$prompt" == *"do not search the wider repo for other examples of the rendering"* ]]; then
          echo "thinking"
          echo "The diff-local citation contract is explicit, so I can stay on the touched surface."
          echo "exec"
          echo "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts' in /Users/kbediako/Code/CO"
          echo "tests/run-review.spec.ts:2250 keeps the bounded runtime citation contract covered."
          exit 0
        fi
      fi
      echo "thinking"
      echo "I need to search the repo for citation-style examples before I can trust the concrete-progress surface."
      echo "exec"
      echo "/bin/zsh -lc 'rg -n \"path#L123|path:123\" docs tests scripts' in /Users/kbediako/Code/CO"
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "meta-surface-expansion" ]]; then
      while true; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "tool delegation.delegate.status({\"pipeline\":\"docs-review\"})"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,80p .runs/sample-task/cli/sample-run/manifest.json' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'tail -n 80 .runs/sample-task/cli/sample-run/runner.ndjson' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'cat .runs/sample-task/cli/sample-run/manifest.json' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "meta-surface-expansion-audit-unrelated" ]]; then
      for _ in $(seq 1 2); do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,80p .runs/sample-task/cli/sample-run/manifest.json' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'tail -n 80 .runs/sample-task/cli/sample-run/runner.ndjson' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p docs/guides/review-artifacts.md' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      sleep 5
    fi
    if [[ "$mode" == "meta-surface-audit-evidence-only" ]]; then
      for _ in $(seq 1 24); do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,80p .runs/sample-task/cli/sample-run/manifest.json' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'tail -n 80 .runs/sample-task/cli/sample-run/runner.ndjson' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      exit 0
    fi
    if [[ "$mode" == "startup-anchor-drift" ]]; then
      while true; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "audit-explicit-manifest-anchor" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,80p \${MANIFEST}' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
      exit 0
    fi
    if [[ "$mode" == "audit-exported-manifest-anchor" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'export MANIFEST=\$MANIFEST; sed -n 1,80p \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
      exit 0
    fi
    if [[ "$mode" == "audit-leading-assignment-export" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'MANIFEST=/tmp/other.json export MANIFEST; sed -n 1,80p \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
      exit 0
    fi
    if [[ "$mode" == "audit-pipeline-manifest-anchor" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'export MANIFEST=/tmp/other.json | cat >/dev/null; sed -n 1,80p \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
      exit 0
    fi
    if [[ "$mode" == "audit-exported-run-log-alias-anchor" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'export RUN_LOG=\$RUNNER_LOG; tail -n 80 \"\$RUN_LOG\"' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
      exit 0
    fi
    if [[ "$mode" == "audit-env-unset-child-manifest-anchor" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'env -u MANIFEST sed -n 1,80p \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md' in /Users/kbediako/Code/CO"
      exit 0
    fi
    if [[ "$mode" == "shell-probe-single" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/bash -lc 'MANIFEST=/tmp/other.json; export MANIFEST; printf \"%s\\n\" \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      exit 0
    fi
    if [[ "$mode" == "shell-probe-repeat-fast-exit" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/bash -lc 'MANIFEST=/tmp/other.json; export MANIFEST; printf \"%s\\n\" \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'MANIFEST=/tmp/third.json; export MANIFEST; printf \"%s\\n\" \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      sleep 0.05
      exit 0
    fi
    if [[ "$mode" == "shell-probe-repeat-hang" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/bash -lc 'MANIFEST=/tmp/other.json; export MANIFEST; printf \"%s\\n\" \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'MANIFEST=/tmp/third.json; export MANIFEST; printf \"%s\\n\" \"\$MANIFEST\"' in /Users/kbediako/Code/CO"
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "shell-probe-repeat-nested-fast-exit" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc '/bin/bash -lc \\\"printenv MANIFEST\\\"' in /Users/kbediako/Code/CO"
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc '/bin/bash -lc \\\"printenv MANIFEST\\\"' in /Users/kbediako/Code/CO"
      sleep 0.05
      exit 0
    fi
    if [[ "$mode" == "review-self-containment-drift" ]]; then
      while true; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p docs/guides/review-artifacts.md' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p scripts/pack-smoke.mjs' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p scripts/lib/run-manifests.js' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p .runs/sample-task/cli/sample-run/review/prompt.txt' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p .runs/sample-task/cli/sample-run/review/output.log' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "active-closeout-self-reference-search" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts' in /Users/kbediako/Code/CO"
      for _ in $(seq 1 6); do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'grep -R \"shellProbeCount\\|getShellProbeBoundaryState\" -n .' in /Users/kbediako/Code/CO"
        echo "out/sample-task/manual/TODO-closeout/09-review.log:278:shellProbeCount"
        sleep 0.05
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "active-closeout-self-reference-search-mixed" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts' in /Users/kbediako/Code/CO"
      for _ in $(seq 1 2); do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p .runs/sample-task/cli/sample-run/review/output.log' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'grep -R \"shellProbeCount\\|getShellProbeBoundaryState\" -n .' in /Users/kbediako/Code/CO"
        echo "out/sample-task/manual/TODO-closeout/09-review.log:278:shellProbeCount"
        sleep 0.05
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "active-closeout-self-reference-reread" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p file-1.txt' in /Users/kbediako/Code/CO"
      closeout_targets=(
        "out/sample-task/manual/TODO-closeout/09-review.log"
        "$CODEX_ORCHESTRATOR_ROOT/out/sample-task/manual/TODO-closeout/13-override-notes.md"
        "out/sample-task/manual/TODO-closeout/09-review.log"
        "$CODEX_ORCHESTRATOR_ROOT/out/sample-task/manual/TODO-closeout/13-override-notes.md"
        "out/sample-task/manual/TODO-closeout/09-review.log"
      )
      for target in "\${closeout_targets[@]}"; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p $target' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "active-completed-closeout-self-reference-search" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts' in /Users/kbediako/Code/CO"
      for _ in $(seq 1 6); do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'grep -R \"shellProbeCount\\|getShellProbeBoundaryState\" -n .' in /Users/kbediako/Code/CO"
        echo "out/sample-task/manual/20260311T000000Z-closeout/09-review.log:278:shellProbeCount"
        sleep 0.05
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "untouched-helper-review-support-drift" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts' in /Users/kbediako/Code/CO"
      for _ in $(seq 1 6); do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p dist/scripts/lib/review-prompt-context.js' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p tests/review-prompt-context.spec.ts' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "untouched-shell-env-helper-review-support-drift" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts' in /Users/kbediako/Code/CO"
      for _ in $(seq 1 6); do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p dist/scripts/lib/review-shell-env-interpreter.js' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "command-intent-validation" ]]; then
      while true; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "command-intent-validation-then-ok" ]]; then
      if [[ "$*" == *"Strict bounded review retry."* ]]; then
        if has_inline_prompt "$@" && has_arg "--title" "$@"; then
          echo "custom prompt cannot be combined with --title" >&2
          exit 1
        fi
        if has_inline_prompt "$@" && { has_arg "--base" "$@" || has_arg "--commit" "$@" || has_arg "--uncommitted" "$@"; }; then
          echo "custom prompt cannot be combined with explicit scope flags" >&2
          exit 1
        fi
        echo "stdout-ok"
        echo "stderr-ok" >&2
        exit 0
      fi
      while true; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "command-intent-validation-fast-exit" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts' in /Users/kbediako/Code/CO"
      sleep 0.05
      exit 0
    fi
    if [[ "$mode" == "command-intent-validation-fast-exit-nonzero" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts' in /Users/kbediako/Code/CO"
      sleep 0.05
      exit 2
    fi
    if [[ "$mode" == "command-intent-validation-shorthand" ]]; then
      while true; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'pnpm vitest run tests/run-review.spec.ts' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "command-intent-review-orchestration" ]]; then
      while true; do
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'codex-orchestrator start docs-review --task sample-task' in /Users/kbediako/Code/CO"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "command-intent-delegation-control" ]]; then
      while true; do
        echo "tool delegation.delegate.status({\"pipeline\":\"docs-review\"})"
        echo "tool delegation.delegate.spawn({\"pipeline\":\"docs-review\"})"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "heavy-hang" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run test -- run-review' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-typecheck" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run typecheck -- run-review' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-quoted-text" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'echo npm run test && sleep 120' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-cross-stream-warning" ]]; then
      echo "thinking"
      echo "exec"
      echo "warning" >&2
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run test -- run-review' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-cross-stream-warning-typecheck" ]]; then
      echo "thinking"
      echo "exec"
      echo "warning" >&2
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run typecheck -- run-review' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-same-stream-warning" ]]; then
      echo "thinking"
      echo "exec"
      echo "warning: noisy line before command"
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run test -- run-review' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-same-stream-warning-typecheck" ]]; then
      echo "thinking"
      echo "exec"
      echo "warning: noisy line before command"
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run typecheck -- run-review' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-long-noise" ]]; then
      echo "thinking"
      echo "exec"
      for i in $(seq 1 8); do
        echo "warning-$i: noisy line before command"
      done
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run test -- run-review' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-long-noise-typecheck" ]]; then
      echo "thinking"
      echo "exec"
      for i in $(seq 1 8); do
        echo "warning-$i: noisy line before command"
      done
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run typecheck -- run-review' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-fast-exit" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run test -- run-review' in /tmp/run-review-heavy"
      exit 0
    fi
    if [[ "$mode" == "heavy-fast-exit-typecheck" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run typecheck -- run-review' in /tmp/run-review-heavy"
      exit 0
    fi
    if [[ "$mode" == "heavy-fast-cross-stream-command" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run test -- run-review' in /tmp/run-review-heavy" >&2
      exit 0
    fi
    if [[ "$mode" == "heavy-fast-cross-stream-command-typecheck" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm -C /tmp/run-review-heavy run typecheck -- run-review' in /tmp/run-review-heavy" >&2
      exit 0
    fi
    if [[ "$mode" == "heavy-hang-workspaces-flag" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm --workspaces test' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-run-script-alias" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm run-script test' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-test-alias" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm t' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-fast-scoped-test-file" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm test -- --runInBand tests/run-review.spec.ts' in /tmp/run-review-heavy"
      exit 0
    fi
    if [[ "$mode" == "heavy-hang-npm-cmd-launcher" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm.cmd run test' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-npm-ps1-launcher" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'npm.ps1 run test' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-cmd-wrapper" ]]; then
      echo "thinking"
      echo "exec"
      echo "cmd /c npm run test"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-cmd-wrapper-uppercase-flag" ]]; then
      echo "thinking"
      echo "exec"
      echo "cmd /C npm run test"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-python-module" ]]; then
      echo "thinking"
      echo "exec"
      echo "python -m pytest"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "telemetry-persist-failure" ]]; then
      mkdir -p "$(dirname "\${MANIFEST}")/review/telemetry.json"
      echo "I found no actionable issues in the uncommitted diff."
      exit 0
    fi
    if [[ "$mode" == "heavy-hang-env-wrapper" ]]; then
      echo "thinking"
      echo "exec"
      echo "/bin/zsh -lc 'env CI=1 npm run test' in /tmp/run-review-heavy"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "heavy-hang-env-path-wrapper" ]]; then
      echo "thinking"
      echo "exec"
      echo "/usr/bin/env pytest"
      while true; do
        sleep 1
      done
    fi
    if [[ "$mode" == "spam" ]]; then
      for i in $(seq 1 200); do
        echo "stdout-$i"
        echo "stderr-$i" >&2
      done
    exit 0
  fi
  echo "stdout-ok"
  echo "stderr-ok" >&2
  exit 0
fi
echo "unknown args: $*" >&2
exit 2
`;
  await writeFile(binPath, script, 'utf8');
  await chmod(binPath, 0o755);
  return binPath;
}

async function findRunReviewMockProcesses(
  codexBin: string,
  options: { strict?: boolean } = {}
): Promise<RunReviewMockProcess[]> {
  if (process.platform === 'win32') {
    return [];
  }
  try {
    const { stdout } = await execFileAsync('ps', ['-axww', '-o', 'pid=,pgid=,command='], {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 2000
    });
    return String(stdout ?? '')
      .split('\n')
      .flatMap((line) => {
        const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/u);
        if (!match) {
          return [];
        }
        const command = match[3] ?? '';
        if (!commandInvokesRunReviewMock(command, codexBin)) {
          return [];
        }
        const pid = Number.parseInt(match[1] ?? '', 10);
        const pgid = Number.parseInt(match[2] ?? '', 10);
        if (!Number.isFinite(pid)) {
          return [];
        }
        return [
          {
            pid,
            pgid: Number.isFinite(pgid) ? pgid : null
          }
        ];
      });
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return [];
  }
}

async function findRunReviewMockPids(
  codexBin: string,
  options: { strict?: boolean } = {}
): Promise<number[]> {
  return (await findRunReviewMockProcesses(codexBin, options)).map((processInfo) => processInfo.pid);
}

async function terminateRunReviewMockProcess(
  processInfo: RunReviewMockProcess,
  signal: NodeJS.Signals
): Promise<void> {
  if (processInfo.pgid === processInfo.pid) {
    try {
      process.kill(-processInfo.pid, signal);
      return;
    } catch {
      // Verified process-group leader still gets an exact-pid fallback below if
      // local signaling races with process exit.
    }
  }
  try {
    process.kill(processInfo.pid, signal);
  } catch {
    // Best-effort test cleanup; callers verify by scanning again.
  }
}

async function cleanupRunReviewMockProcesses(codexBin: string): Promise<void> {
  const initialProcesses = await findRunReviewMockProcesses(codexBin);
  for (const processInfo of initialProcesses) {
    await terminateRunReviewMockProcess(processInfo, 'SIGTERM');
  }
  if (initialProcesses.length > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
  const remainingProcesses = await findRunReviewMockProcesses(codexBin);
  for (const processInfo of remainingProcesses) {
    await terminateRunReviewMockProcess(processInfo, 'SIGKILL');
  }
  if (remainingProcesses.length > 0) {
    for (let attempt = 0; attempt < RUN_REVIEW_MOCK_REAP_POLL_ATTEMPTS; attempt += 1) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, RUN_REVIEW_MOCK_REAP_POLL_INTERVAL_MS)
      );
      if ((await findRunReviewMockProcesses(codexBin)).length === 0) {
        break;
      }
    }
  }
}

async function cleanupRunReviewMockProcessesForSandbox(sandbox: string): Promise<void> {
  await cleanupRunReviewMockProcesses(join(sandbox, 'codex-mock.sh'));
}

async function makeFakeDiffBudgetScript(sandbox: string): Promise<void> {
  await mkdir(join(sandbox, 'scripts'), { recursive: true });
  await writeFile(
    join(sandbox, 'scripts', 'diff-budget.mjs'),
    [
      '#!/usr/bin/env node',
      'const inheritedBaseEnvPresent = Boolean(process.env.BASE_SHA || process.env.DIFF_BUDGET_BASE);',
      'if (inheritedBaseEnvPresent) {',
      '  console.error("unexpected inherited base env");',
      '  process.exit(1);',
      '}',
      'console.log(`fake inherited base env present=${inheritedBaseEnvPresent}`);',
      'const baseIndex = process.argv.indexOf("--base");',
      'if (baseIndex !== -1) {',
      '  console.log(`fake diff-budget base=${process.argv[baseIndex + 1] ?? ""}`);',
      '}',
      'const commitIndex = process.argv.indexOf("--commit");',
      'if (commitIndex !== -1) {',
      '  console.log(`fake diff-budget commit=${process.argv[commitIndex + 1] ?? ""}`);',
      '}',
      'console.log("fake diff-budget ok");'
    ].join('\n'),
    'utf8'
  );
}

function parseArgsLogInvocations(argsLog: string): string[] {
  return argsLog
    .split(/^---$/m)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function reviewLaunchContext(
  scopeFlagMode: 'commit' | 'base' | 'uncommitted' | null,
  promptDelivery: 'inline' | 'artifact-only' = scopeFlagMode === null ? 'inline' : 'artifact-only',
  options: {
    reviewerVisibleContextTransport?: 'inline-prompt' | 'scoped-title' | 'artifact-only';
    reviewerVisibleTitleSource?: 'user' | 'notes-surface' | null;
  } = {}
) {
  return {
    scope_flag_mode: scopeFlagMode,
    prompt_delivery: promptDelivery,
    reviewer_visible_context_transport:
      options.reviewerVisibleContextTransport ??
      (scopeFlagMode === null ? 'inline-prompt' : 'artifact-only'),
    reviewer_visible_title_source: options.reviewerVisibleTitleSource ?? null
  } as const;
}

function baseEnv(sandbox: string, codexBin: string): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_NO_WARNINGS: '1',
    NOTES: 'Goal: run-review regression tests | Summary: verify timeout/stall handling | Risks: none',
    FORCE_CODEX_REVIEW: '1',
    CODEX_REVIEW_NON_INTERACTIVE: '1',
    CODEX_CLI_BIN: codexBin,
    CODEX_ORCHESTRATOR_ROOT: sandbox
  };
  for (const key of Object.keys(env)) {
    if (key.startsWith('RUN_REVIEW_')) {
      delete env[key];
    }
  }
  delete env.CODEX_REVIEW_STALL_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS;
  delete env.CODEX_REVIEW_MONITOR_INTERVAL_SECONDS;
  delete env.CODEX_REVIEW_ENABLE_DELEGATION_MCP;
  delete env.CODEX_REVIEW_DISABLE_DELEGATION_MCP;
  delete env.CODEX_REVIEW_ALLOW_HEAVY_COMMANDS;
  delete env.CODEX_REVIEW_ENFORCE_BOUNDED_MODE;
  delete env.CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_DEBUG_TELEMETRY;
  delete env.CODEX_REVIEW_SURFACE;
  delete env.CODEX_REVIEW_AUTHORITATIVE_GATE;
  delete env.CODEX_REVIEW_CONTRACT_MODE;
  delete env.CODEX_REVIEW_BREAK_GLASS_NOTES_FALLBACK;
  delete env.CODEX_REVIEW_BREAK_GLASS_OWNER;
  delete env.CODEX_REVIEW_BREAK_GLASS_EXPIRES_AT;
  delete env.CODEX_REVIEW_BREAK_GLASS_REASON;
  delete env.CODEX_REVIEW_BREAK_GLASS_EVIDENCE;
  delete env.CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD;
  delete env.CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD;
  delete env.CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON;
  delete env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
  delete env.CODEX_ORCHESTRATOR_RUN_DIR;
  delete env.CODEX_ORCHESTRATOR_RUNS_DIR;
  delete env.CODEX_ORCHESTRATOR_OUT_DIR;
  delete env.CODEX_ORCHESTRATOR_PIPELINE_ID;
  delete env.CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS;
  delete env.MCP_RUNNER_TASK_ID;
  delete env.TASK;
  delete env.CODEX_ORCHESTRATOR_TASK_ID;
  delete env.MANIFEST;
  delete env.SKIP_DIFF_BUDGET;
  delete env.DIFF_BUDGET_STAGE;
  delete env.DIFF_BUDGET_OVERRIDE_REASON;
  return env;
}

async function runReviewCommand(
  manifestPath: string | null,
  env: Record<string, string | undefined>,
  extraArgs: string[] = []
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const args = [...extraArgs];
  if (manifestPath) {
    args.push('--manifest', manifestPath);
  }
  args.push('--non-interactive');
  return await runEntrypointInProcess({
    args,
    env,
    runner: runReviewCli
  });
}

async function runReviewCommandSubprocess(
  manifestPath: string | null,
  env: Record<string, string | undefined>,
  extraArgs: string[] = [],
  cwd = process.cwd(),
  options: { timeoutMs?: number; killSignal?: NodeJS.Signals } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const entryArgs = (await shouldUseFreshDist(runReviewScript, runReviewScriptDist))
    ? [runReviewScriptDist, ...extraArgs]
    : ['--loader', 'ts-node/esm', runReviewScript, ...extraArgs];
  const args = [...entryArgs];
  if (manifestPath) {
    args.push('--manifest', manifestPath);
  }
  args.push('--non-interactive');
  const codexBin = typeof env.CODEX_CLI_BIN === 'string' ? env.CODEX_CLI_BIN : null;
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      args,
      {
        cwd,
        env,
        maxBuffer: 16 * 1024 * 1024,
        timeout: options.timeoutMs ?? RUN_REVIEW_SUBPROCESS_TIMEOUT_MS,
        killSignal: options.killSignal
      }
    );
    return { exitCode: 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      code?: number | string;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    const stdout =
      typeof err.stdout === 'string'
        ? err.stdout
        : Buffer.isBuffer(err.stdout)
        ? err.stdout.toString('utf8')
        : '';
    const stderr =
      typeof err.stderr === 'string'
        ? err.stderr
        : Buffer.isBuffer(err.stderr)
        ? err.stderr.toString('utf8')
        : '';
    const exitCode = typeof err.code === 'number' && Number.isFinite(err.code) ? err.code : 1;
    return { exitCode, stdout, stderr };
  } finally {
    if (codexBin && basename(codexBin) === 'codex-mock.sh') {
      await cleanupRunReviewMockProcesses(codexBin);
    }
  }
}

describe('shouldUseFreshDist', () => {
  it('treats dist as stale when a newer transitive runtime dependency exists', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'scripts', 'run-review.ts');
    const boundaryHelper = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.ts');
    const runtimeIndex = join(tempRoot, 'orchestrator', 'src', 'cli', 'runtime', 'index.ts');
    const runtimeProvider = join(tempRoot, 'orchestrator', 'src', 'cli', 'runtime', 'provider.ts');
    const runtimeUtility = join(tempRoot, 'orchestrator', 'src', 'cli', 'utils', 'codexCli.ts');
    const distEntry = join(tempRoot, 'dist', 'scripts', 'run-review.js');

    try {
      await mkdir(dirname(sourceEntry), { recursive: true });
      await mkdir(dirname(boundaryHelper), { recursive: true });
      await mkdir(dirname(runtimeIndex), { recursive: true });
      await mkdir(dirname(runtimeUtility), { recursive: true });
      await mkdir(dirname(distEntry), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { prepareReviewExecutionBoundaryPreflight } from './lib/review-execution-boundary-preflight.js';\n",
        'utf8'
      );
      await writeFile(
        boundaryHelper,
        "export { resolveRuntimeSelection } from '../../orchestrator/src/cli/runtime/index.js';\n",
        'utf8'
      );
      await writeFile(
        runtimeIndex,
        "export { resolveRuntimeSelection } from './provider.js';\n",
        'utf8'
      );
      await writeFile(
        runtimeProvider,
        "export { resolveCodexCliBin as resolveRuntimeSelection } from '../utils/codexCli.js';\n",
        'utf8'
      );
      await writeFile(runtimeUtility, 'export function resolveCodexCliBin() {}\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');
      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:01.000Z');
      const dependencyAt = new Date('2026-01-01T00:00:02.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(boundaryHelper, sourceAt, sourceAt);
      await utimes(runtimeIndex, sourceAt, sourceAt);
      await utimes(runtimeProvider, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);
      await utimes(runtimeUtility, dependencyAt, dependencyAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('treats dist as stale when a tracked transitive dependency cannot be resolved', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'scripts', 'run-review.ts');
    const boundaryHelper = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.ts');
    const distEntry = join(tempRoot, 'dist', 'scripts', 'run-review.js');

    try {
      await mkdir(dirname(sourceEntry), { recursive: true });
      await mkdir(dirname(boundaryHelper), { recursive: true });
      await mkdir(dirname(distEntry), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { prepareReviewExecutionBoundaryPreflight } from './lib/review-execution-boundary-preflight.js';\n",
        'utf8'
      );
      await writeFile(
        boundaryHelper,
        "export { resolveRuntimeSelection } from '../../orchestrator/src/cli/runtime/missing.js';\n",
        'utf8'
      );
      await writeFile(distEntry, 'export {};\n', 'utf8');

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('treats dist as stale when a higher-priority runtime source candidate appears with an older mtime', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'scripts', 'run-review.ts');
    const boundaryHelperTs = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.ts');
    const boundaryHelperJs = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.js');
    const distEntry = join(tempRoot, 'dist', 'scripts', 'run-review.js');

    try {
      await mkdir(dirname(sourceEntry), { recursive: true });
      await mkdir(dirname(boundaryHelperTs), { recursive: true });
      await mkdir(dirname(distEntry), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { prepareReviewExecutionBoundaryPreflight } from './lib/review-execution-boundary-preflight.js';\n",
        'utf8'
      );
      await writeFile(
        boundaryHelperTs,
        'export function prepareReviewExecutionBoundaryPreflight() { return "ts"; }\n',
        'utf8'
      );
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:05.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(boundaryHelperTs, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      const higherPriorityAt = new Date('2026-01-01T00:00:01.000Z');
      await writeFile(
        boundaryHelperJs,
        'export function prepareReviewExecutionBoundaryPreflight() { return "js"; }\n',
        'utf8'
      );
      await utimes(boundaryHelperJs, higherPriorityAt, higherPriorityAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('treats dist as stale when the winning runtime source candidate disappears and resolution falls back to an older file', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'scripts', 'run-review.ts');
    const boundaryHelperTs = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.ts');
    const boundaryHelperJs = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.js');
    const distEntry = join(tempRoot, 'dist', 'scripts', 'run-review.js');

    try {
      await mkdir(dirname(sourceEntry), { recursive: true });
      await mkdir(dirname(boundaryHelperTs), { recursive: true });
      await mkdir(dirname(distEntry), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { prepareReviewExecutionBoundaryPreflight } from './lib/review-execution-boundary-preflight.js';\n",
        'utf8'
      );
      await writeFile(
        boundaryHelperTs,
        'export function prepareReviewExecutionBoundaryPreflight() { return "ts"; }\n',
        'utf8'
      );
      await writeFile(
        boundaryHelperJs,
        'export function prepareReviewExecutionBoundaryPreflight() { return "js"; }\n',
        'utf8'
      );
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const fallbackAt = new Date('2026-01-01T00:00:00.000Z');
      const winningAt = new Date('2026-01-01T00:00:01.000Z');
      const distAt = new Date('2026-01-01T00:00:05.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(boundaryHelperTs, fallbackAt, fallbackAt);
      await utimes(boundaryHelperJs, winningAt, winningAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      await rm(boundaryHelperJs);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('keeps dist stale after a winning runtime source candidate disappears until dist mtime changes', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'scripts', 'run-review.ts');
    const boundaryHelperTs = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.ts');
    const boundaryHelperJs = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.js');
    const distEntry = join(tempRoot, 'dist', 'scripts', 'run-review.js');

    try {
      await mkdir(dirname(sourceEntry), { recursive: true });
      await mkdir(dirname(boundaryHelperTs), { recursive: true });
      await mkdir(dirname(distEntry), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { prepareReviewExecutionBoundaryPreflight } from './lib/review-execution-boundary-preflight.js';\n",
        'utf8'
      );
      await writeFile(
        boundaryHelperTs,
        'export function prepareReviewExecutionBoundaryPreflight() { return "ts"; }\n',
        'utf8'
      );
      await writeFile(
        boundaryHelperJs,
        'export function prepareReviewExecutionBoundaryPreflight() { return "js"; }\n',
        'utf8'
      );
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const fallbackAt = new Date('2026-01-01T00:00:00.000Z');
      const winningAt = new Date('2026-01-01T00:00:01.000Z');
      const distAt = new Date('2026-01-01T00:00:05.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(boundaryHelperTs, fallbackAt, fallbackAt);
      await utimes(boundaryHelperJs, winningAt, winningAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      await rm(boundaryHelperJs);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);

      await chmod(distEntry, 0o755);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('keeps dist fresh when the winning runtime source candidate disappears and dist is rebuilt first', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'scripts', 'run-review.ts');
    const boundaryHelperTs = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.ts');
    const boundaryHelperJs = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.js');
    const distEntry = join(tempRoot, 'dist', 'scripts', 'run-review.js');

    try {
      await mkdir(dirname(sourceEntry), { recursive: true });
      await mkdir(dirname(boundaryHelperTs), { recursive: true });
      await mkdir(dirname(distEntry), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { prepareReviewExecutionBoundaryPreflight } from './lib/review-execution-boundary-preflight.js';\n",
        'utf8'
      );
      await writeFile(
        boundaryHelperTs,
        'export function prepareReviewExecutionBoundaryPreflight() { return "ts"; }\n',
        'utf8'
      );
      await writeFile(
        boundaryHelperJs,
        'export function prepareReviewExecutionBoundaryPreflight() { return "js"; }\n',
        'utf8'
      );
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const fallbackAt = new Date('2026-01-01T00:00:00.000Z');
      const winningAt = new Date('2026-01-01T00:00:01.000Z');
      const distAt = new Date('2026-01-01T00:00:05.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(boundaryHelperTs, fallbackAt, fallbackAt);
      await utimes(boundaryHelperJs, winningAt, winningAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      await rm(boundaryHelperJs);

      await writeFile(distEntry, 'export const rebuiltReviewBoundary = "ts";\n', 'utf8');

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('ignores newer sibling scripts outside the run-review dependency closure', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'scripts', 'run-review.ts');
    const boundaryHelper = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.ts');
    const unrelatedSibling = join(tempRoot, 'scripts', 'other-script.ts');
    const distEntry = join(tempRoot, 'dist', 'scripts', 'run-review.js');

    try {
      await mkdir(dirname(sourceEntry), { recursive: true });
      await mkdir(dirname(boundaryHelper), { recursive: true });
      await mkdir(dirname(distEntry), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { prepareReviewExecutionBoundaryPreflight } from './lib/review-execution-boundary-preflight.js';\n",
        'utf8'
      );
      await writeFile(boundaryHelper, 'export function prepareReviewExecutionBoundaryPreflight() {}\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');
      await writeFile(unrelatedSibling, 'export {};\n', 'utf8');
      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:01.000Z');
      const siblingAt = new Date('2026-01-01T00:00:02.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(boundaryHelper, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);
      await utimes(unrelatedSibling, siblingAt, siblingAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('ignores newer type-only re-export dependencies outside the runtime closure', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'scripts', 'run-review.ts');
    const boundaryHelper = join(tempRoot, 'scripts', 'lib', 'review-execution-boundary-preflight.ts');
    const typeOnlyDependency = join(tempRoot, 'scripts', 'lib', 'review-execution-types.ts');
    const distEntry = join(tempRoot, 'dist', 'scripts', 'run-review.js');

    try {
      await mkdir(dirname(sourceEntry), { recursive: true });
      await mkdir(dirname(boundaryHelper), { recursive: true });
      await mkdir(dirname(distEntry), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { prepareReviewExecutionBoundaryPreflight } from './lib/review-execution-boundary-preflight.js';\n",
        'utf8'
      );
      await writeFile(
        boundaryHelper,
        "export { type ReviewExecutionBoundaryPreflightResult } from './review-execution-types.js';\nexport function prepareReviewExecutionBoundaryPreflight() {}\n",
        'utf8'
      );
      await writeFile(
        typeOnlyDependency,
        'export interface ReviewExecutionBoundaryPreflightResult { ok: boolean; }\n',
        'utf8'
      );
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:01.000Z');
      const typeOnlyAt = new Date('2026-01-01T00:00:02.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(boundaryHelper, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);
      await utimes(typeOnlyDependency, typeOnlyAt, typeOnlyAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('isDirectExecution', () => {
  it('accepts both resolved and realpath entry urls for same-directory symlinked direct exec', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'run-review-direct-exec-'));
    const targetEntry = join(tempRoot, 'run-review.js');
    const symlinkEntry = join(tempRoot, 'run-review-link.js');

    try {
      await writeFile(targetEntry, 'export {};\n', 'utf8');
      await symlink(targetEntry, symlinkEntry);

      expect(isDirectExecution(targetEntry, pathToFileURL(targetEntry).href)).toBe(true);
      expect(isDirectExecution(symlinkEntry, pathToFileURL(await realpath(symlinkEntry)).href)).toBe(true);
      expect(isDirectExecution(symlinkEntry, pathToFileURL(symlinkEntry).href)).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('runs help output through a same-directory symlink under preserve-symlinks-main', async () => {
    const directEntry = (await shouldUseFreshDist(runReviewScript, runReviewScriptDist))
      ? runReviewScriptDist
      : runReviewScript;
    const linkPath = join(
      dirname(directEntry),
      `run-review-link-${process.pid}-${Date.now()}${directEntry.endsWith('.ts') ? '.ts' : '.js'}`
    );

    try {
      await symlink(basename(directEntry), linkPath);

      const directArgs = directEntry.endsWith('.ts')
        ? ['--loader', 'ts-node/esm', linkPath, '--help']
        : [linkPath, '--help'];

      const { stdout } = await execFileAsync(
        process.execPath,
        directArgs,
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_OPTIONS: [process.env.NODE_OPTIONS, '--preserve-symlinks-main'].filter(Boolean).join(' ')
          },
          maxBuffer: 16 * 1024 * 1024
        }
      );

      expect(String(stdout ?? '')).toContain('Usage: npm run review -- [options]');
      expect(String(stdout ?? '')).toContain('Standalone review wrapper for Codex review with manifest-backed context.');
    } finally {
      await rm(linkPath, { force: true });
    }
  }, 15_000);
});

afterEach(async () => {
  while (createdSandboxes.length > 0) {
    const dir = createdSandboxes.pop();
    if (dir) {
      await cleanupRunReviewMockProcessesForSandbox(dir);
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('scripts/run-review regression', { timeout: LONG_WAIT_TEST_TIMEOUT_MS }, () => {
  it('does not enforce default timeout/stall/startup-loop guards', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommandSubprocess(manifestPath, baseEnv(sandbox, codexBin));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('skipping diff budget (missing scripts/diff-budget.mjs');
    expect(result.stdout).not.toContain('enforcing codex review timeout');
    expect(result.stdout).not.toContain('enforcing codex review stall timeout');
    expect(result.stdout).not.toContain('enforcing delegation-startup loop timeout');
    expect(result.stdout).toContain('delegation MCP enabled for this review (default');
    expect(result.stdout).toContain('Review output saved to:');
  });

  it('keeps explicit pipeline diff-budget skips when SKIP_DIFF_BUDGET=1', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      SKIP_DIFF_BUDGET: '1'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('skipping diff budget (already executed by pipeline).');
  });

  it('sanitizes inherited base env for default diff-budget preflight scope', async () => {
    const sandbox = await makeSandbox();
    await initGitRepoWithCommittedFiles(sandbox, 1);
    await makeFakeDiffBudgetScript(sandbox);
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      BASE_SHA: 'stale-base-ref',
      DIFF_BUDGET_BASE: 'stale-fallback-ref'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('fake inherited base env present=false');
    expect(result.stdout).toContain('fake diff-budget ok');
    expect(result.stderr).not.toContain('unexpected inherited base env');
  });

  it('preserves explicit base scope for diff-budget preflight', async () => {
    const sandbox = await makeSandbox();
    await initGitRepoWithCommittedFiles(sandbox, 1);
    await makeFakeDiffBudgetScript(sandbox);
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        BASE_SHA: 'stale-base-ref',
        DIFF_BUDGET_BASE: 'stale-fallback-ref'
      },
      ['--base', 'HEAD']
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('fake inherited base env present=false');
    expect(result.stdout).toContain('fake diff-budget base=HEAD');
    expect(result.stdout).toContain('fake diff-budget ok');
    expect(result.stderr).not.toContain('unexpected inherited base env');
  });

  it('does not require codex availability for non-interactive handoff mode', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, '/missing/codex'),
      FORCE_CODEX_REVIEW: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Codex review handoff (non-interactive):');
    expect(result.stdout).toContain('Set FORCE_CODEX_REVIEW=1 to invoke `codex review` in this environment.');
  });

  it('keeps non-authoritative handoff available without NOTES', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, '/missing/codex'),
      FORCE_CODEX_REVIEW: '0',
      NOTES: ''
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Codex review handoff (non-interactive):');
    expect(result.stderr).toContain('using a generated fallback for a non-authoritative review');
  });

  it('rejects prompt-only non-interactive handoff under the authoritative review gate', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, '/missing/codex'),
      FORCE_CODEX_REVIEW: '0',
      CODEX_REVIEW_AUTHORITATIVE_GATE: '1'
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toContain('Codex review handoff (non-interactive):');
    expect(result.stderr).toContain(
      'CODEX_REVIEW_AUTHORITATIVE_GATE=1 disallows prompt-only non-interactive review handoff'
    );
  });

  it('still emits a non-interactive handoff prompt for large uncommitted scope without requiring an override', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 3);
    for (const file of files) {
      await writeFile(join(sandbox, file), `updated-${file}\n`, 'utf8');
    }

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, '/missing/codex'),
      FORCE_CODEX_REVIEW: '0',
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '2',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '2'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Codex review handoff (non-interactive):');
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Scope advisory: large uncommitted diff detected');
  });

  it('adds bounded review constraints by default and allows heavy-command override', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const boundedResult = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

    expect(boundedResult.exitCode).toBe(0);
    expect(boundedResult.stdout).toContain('bounded review guidance enabled by default');
    const boundedPromptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const boundedPrompt = await readFile(boundedPromptPath, 'utf8');
    expect(boundedPrompt).toContain('Review surface: diff');
    expect(boundedPrompt).not.toContain('Evidence manifest:');
    expect(boundedPrompt).not.toContain('Task context:');
    expect(boundedPrompt).not.toContain('Active closeout provenance:');
    expect(boundedPrompt).not.toContain('Evidence + checklist mirroring requirements are satisfied');
    expect(boundedPrompt).toContain('Execution constraints (bounded review mode):');
    expect(boundedPrompt).toContain('Avoid full validation suites');
    expect(boundedPrompt).toContain(
      'If changed docs, task packets, or checklists mention validation commands, treat them as evidence or follow-up suggestions only; do not execute those commands during bounded review.'
    );
    expect(boundedPrompt).toContain('Keep this pass diff-focused.');
    expect(boundedPrompt).toContain(
      'Concrete same-diff progress can be shown by citing touched paths with explicit locations'
    );
    expect(boundedPrompt).toContain(
      'do not search the wider repo for other examples of the rendering'
    );

    const heavyManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'sample-run-heavy-commands');
    const heavyResult = await runReviewCommand(heavyManifestPath, {
      ...baseEnv(sandbox, codexBin),
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1'
    });

    expect(heavyResult.exitCode).toBe(0);
    expect(heavyResult.stdout).toContain('heavy review commands allowed');
    const heavyPromptPath = join(dirname(heavyManifestPath), 'review', 'prompt.txt');
    const heavyPrompt = await readFile(heavyPromptPath, 'utf8');
    expect(heavyPrompt).not.toContain('Execution constraints (bounded review mode):');
  }, LONG_WAIT_TEST_TIMEOUT_MS * 2);

  it('rejects missing NOTES instead of generating a routine fallback', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      NOTES: '',
      CODEX_REVIEW_AUTHORITATIVE_GATE: '1'
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('NOTES is required for the authoritative review gate');
    expect(result.stderr).not.toContain('using a generated fallback');
  });

  it('treats enforce contract mode as authoritative for missing NOTES', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      NOTES: '',
      CODEX_REVIEW_AUTHORITATIVE_GATE: undefined,
      CODEX_REVIEW_CONTRACT_MODE: 'enforce'
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('NOTES is required for the authoritative review gate');
    expect(result.stderr).not.toContain('using a generated fallback');
  });

  it('allows missing NOTES only with explicit break-glass waiver metadata', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      NOTES: '',
      CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
      CODEX_REVIEW_CONTRACT_MODE: 'off',
      CODEX_REVIEW_BREAK_GLASS_NOTES_FALLBACK: '1',
      CODEX_REVIEW_BREAK_GLASS_OWNER: 'parent-provider-worker',
      CODEX_REVIEW_BREAK_GLASS_EXPIRES_AT: '2099-01-01T00:00:00.000Z',
      CODEX_REVIEW_BREAK_GLASS_REASON: 'bounded emergency review before authored notes are available',
      CODEX_REVIEW_BREAK_GLASS_EVIDENCE: '.runs/sample-task/cli/sample-run/manifest.json'
    });

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Agent notes:');
    expect(prompt).toContain('Break-glass missing NOTES waiver');
    expect(prompt).toContain('approved_by=parent-provider-worker');
    expect(prompt).toContain('expires_at=2099-01-01T00:00:00.000Z');
    expect(prompt).toContain('evidence=.runs/sample-task/cli/sample-run/manifest.json');
    expect(prompt).not.toContain('auto-generated NOTES fallback');
  });

  it('fails enforce-mode review when the governed contract is missing', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      NOTES: 'Goal: enforce contract test | Summary: fake review emits prose-only output | Risks: missing contract must fail closed',
      CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
      CODEX_REVIEW_CONTRACT_MODE: 'enforce'
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('enforce contract gate failed: review contract validation is missing');
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status?: string;
      error?: string;
      contract_mode?: string;
      contract_validation?: { status?: string };
      review_verdict?: string;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.contract_mode).toBe('enforce');
    expect(telemetry.contract_validation?.status).toBe('missing');
    expect(telemetry.review_verdict).toBe('unknown');
  });

  it('uses structured-output exec as the enforce-mode contract transport', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const stdinLogPath = join(sandbox, 'review-stdin.log');
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'contract-clean-output',
      RUN_REVIEW_ARGS_LOG: argsLogPath,
      RUN_REVIEW_STDIN_LOG: stdinLogPath,
      NOTES: 'Goal: enforce contract exec test | Summary: fake exec writes schema-shaped final message | Risks: stdout hook noise must not invalidate the last-message contract',
      CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
      CODEX_REVIEW_CONTRACT_MODE: 'enforce'
    });

    expect(result.exitCode).toBe(0);
    const argsLog = await readFile(argsLogPath, 'utf8');
    expect(argsLog).toContain('argv=exec -s read-only --output-schema');
    expect(argsLog).toContain('schemas/review-contract.v1.output.schema.json');
    expect(argsLog).toContain('--output-last-message');
    expect(argsLog).toContain('review/contract.json');
    expect(argsLog).toContain(' -');
    expect(argsLog).not.toContain('argv=review');
    const stdinLog = await readFile(stdinLogPath, 'utf8');
    expect(stdinLog).toContain('Goal: enforce contract exec test');
    expect(stdinLog).toContain('co.review.contract.v1');
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status?: string;
      error?: string | null;
      review_verdict?: string;
      contract_mode?: string;
      contract_validation?: { status?: string };
      contract_overall_verdict?: string | null;
      launch_context?: {
        transport?: string;
        prompt_delivery?: string;
        reviewer_visible_context_transport?: string;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.error).toBeNull();
    expect(telemetry.review_verdict).toBe('clean');
    expect(telemetry.contract_mode).toBe('enforce');
    expect(telemetry.contract_validation?.status).toBe('valid');
    expect(telemetry.contract_overall_verdict).toBe('clean');
    expect(telemetry.launch_context?.transport).toBe('codex-exec-output-schema');
    expect(telemetry.launch_context?.prompt_delivery).toBe('stdin');
    expect(telemetry.launch_context?.reviewer_visible_context_transport).toBe('stdin-prompt');
  });

  it('keeps delegation disable config as a global option for structured-output exec', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'contract-clean-output',
      RUN_REVIEW_ARGS_LOG: argsLogPath,
      CODEX_REVIEW_DISABLE_DELEGATION_MCP: '1',
      CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
      CODEX_REVIEW_CONTRACT_MODE: 'enforce'
    });

    expect(result.exitCode).toBe(0);
    const argsLog = await readFile(argsLogPath, 'utf8');
    expect(argsLog).toContain('config=mcp_servers.delegation.enabled=false');
    expect(argsLog).toContain('argv=exec -s read-only --output-schema');
    expect(argsLog).not.toContain('argv=exec -c');
  });

  it('fails closed instead of printing a prompt-only handoff when enforce mode is set without the authoritative gate', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      FORCE_CODEX_REVIEW: undefined,
      CODEX_REVIEW_AUTHORITATIVE_GATE: undefined,
      NOTES: 'Goal: enforce contract no-handoff test | Summary: enforce mode alone must execute review | Risks: prompt-only handoff must fail closed',
      CODEX_REVIEW_NON_INTERACTIVE: '1',
      CODEX_REVIEW_CONTRACT_MODE: 'enforce'
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toContain('Codex review handoff (non-interactive):');
    expect(result.stderr).toContain('enforce contract gate failed: review contract validation is missing');
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status?: string;
      error?: string;
      contract_mode?: string;
      contract_validation?: { status?: string };
      review_verdict?: string;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.contract_mode).toBe('enforce');
    expect(telemetry.contract_validation?.status).toBe('missing');
    expect(telemetry.review_verdict).toBe('unknown');
  });

  it('respects explicit FORCE_CODEX_REVIEW=0 when enforce mode suppresses prompt-only handoff', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, '/missing/codex'),
      FORCE_CODEX_REVIEW: '0',
      CODEX_REVIEW_AUTHORITATIVE_GATE: undefined,
      CODEX_REVIEW_CONTRACT_MODE: 'enforce',
      NOTES: 'Goal: enforce contract explicit opt-out test | Summary: FORCE_CODEX_REVIEW=0 must not launch review | Risks: prompt-only handoff must fail closed',
      CODEX_REVIEW_NON_INTERACTIVE: '1'
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toContain('Codex review handoff (non-interactive):');
    expect(result.stderr).toContain('CODEX_REVIEW_CONTRACT_MODE=enforce disallows prompt-only');
    expect(result.stderr).not.toContain('spawn /missing/codex');
  });

  it('treats authoritative gate flag value "on" as enforce mode before prompt-only handoff', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      FORCE_CODEX_REVIEW: undefined,
      CODEX_REVIEW_CONTRACT_MODE: undefined,
      CODEX_REVIEW_AUTHORITATIVE_GATE: 'on',
      NOTES: 'Goal: enforce contract flag parser test | Summary: authoritative gate on must execute review | Risks: prompt-only handoff must fail closed',
      CODEX_REVIEW_NON_INTERACTIVE: '1'
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toContain('Codex review handoff (non-interactive):');
    expect(result.stderr).toContain('enforce contract gate failed: review contract validation is missing');
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status?: string;
      error?: string;
      contract_mode?: string;
      contract_validation?: { status?: string };
      review_verdict?: string;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.contract_mode).toBe('enforce');
    expect(telemetry.contract_validation?.status).toBe('missing');
    expect(telemetry.review_verdict).toBe('unknown');
  });

  it('accepts FORCE_CODEX_REVIEW flag value "on" for authoritative non-interactive execution', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      FORCE_CODEX_REVIEW: 'on',
      CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
      CODEX_REVIEW_CONTRACT_MODE: 'off',
      NOTES:
        'Goal: force review flag parser test | Summary: FORCE_CODEX_REVIEW=on must execute review under authoritative gate | Risks: prompt-only handoff must fail closed',
      CODEX_REVIEW_NON_INTERACTIVE: '1'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('Codex review handoff (non-interactive):');
    expect(result.stderr).not.toContain('CODEX_REVIEW_AUTHORITATIVE_GATE=1 disallows prompt-only');
  });

  it('fails enforce-mode review when contract telemetry cannot be persisted', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'telemetry-persist-failure',
      NOTES: 'Goal: enforce contract telemetry test | Summary: fake review blocks telemetry persistence | Risks: missing telemetry must fail closed',
      CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
      CODEX_REVIEW_CONTRACT_MODE: 'enforce'
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('enforce contract gate failed: review contract telemetry is missing');
  });

  it('runs enforce-mode explicit scoped review through structured stdin transport', async () => {
    const sandbox = await makeSandbox();
    await initGitRepoWithCommittedFiles(sandbox, 1);
    await writeFile(join(sandbox, 'file-1.txt'), 'updated\n', 'utf8');
    await runGit(['add', 'file-1.txt'], sandbox);
    await runGit(['commit', '-m', 'update file'], sandbox);
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const stdinLogPath = join(sandbox, 'review-stdin.log');
    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'contract-clean-output',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        RUN_REVIEW_STDIN_LOG: stdinLogPath,
        NOTES: 'Goal: enforce scoped contract test | Summary: explicit scoped launches must carry the contract prompt through structured stdin transport | Risks: missing scoped change-bundle must fail closed',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      },
      ['--base', 'HEAD~1']
    );

    expect(result.exitCode).toBe(0);
    const argsLog = await readFile(argsLogPath, 'utf8');
    expect(argsLog).toContain('argv=exec -s read-only --output-schema');
    expect(argsLog).toContain(' -');
    expect(argsLog).not.toContain('--base HEAD~1');
    const stdinLog = await readFile(stdinLogPath, 'utf8');
    expect(stdinLog).toContain('Goal: enforce scoped contract test');
    const changeBundle = JSON.parse(
      await readFile(join(dirname(manifestPath), 'review', 'inputs', 'change-bundle.json'), 'utf8')
    ) as {
      scope_mode?: string;
      scope_base?: string;
      git_diff_name_status?: string;
      git_diff_patch?: string;
    };
    expect(changeBundle.scope_mode).toBe('base');
    expect(changeBundle.scope_base).toBe('HEAD~1');
    expect(changeBundle.git_diff_name_status).toContain('file-1.txt');
    expect(changeBundle.git_diff_patch).toContain('updated');
    const telemetry = JSON.parse(
      await readFile(join(dirname(manifestPath), 'review', 'telemetry.json'), 'utf8')
    ) as {
      status?: string;
      review_verdict?: string;
      launch_context?: {
        scope_flag_mode?: string | null;
        prompt_delivery?: string | null;
        reviewer_visible_context_transport?: string | null;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.review_verdict).toBe('clean');
    expect(telemetry.launch_context?.scope_flag_mode).toBeNull();
    expect(telemetry.launch_context?.prompt_delivery).toBe('stdin');
    expect(telemetry.launch_context?.reviewer_visible_context_transport).toBe('stdin-prompt');
  });

  it('ignores ambient fake-codex harness env in baseEnv', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const previousMode = process.env.RUN_REVIEW_MODE;

    process.env.RUN_REVIEW_MODE = 'delete-after-help';
    try {
      const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('bounded review guidance enabled by default');
    } finally {
      if (previousMode === undefined) {
        delete process.env.RUN_REVIEW_MODE;
      } else {
        process.env.RUN_REVIEW_MODE = previousMode;
      }
    }
  });

  it('surfaces active closeout provenance in the diff-mode handoff for the direct task', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Active closeout provenance:');
    expect(prompt).toContain('- Resolved active closeout root: `out/sample-task/manual/TODO-closeout`');
    expect(prompt).toContain(
      'do not re-derive or re-enumerate them unless directly necessary to assess code correctness'
    );
  });

  it('surfaces parent-task active closeout provenance for delegated task ids', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifestForTask(sandbox, 'sample-task-scout', 'review-closeout-parent');
    await makeCloseoutBundle(sandbox, 'sample-task');
    const codexBin = await makeFakeCodex(sandbox);
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: 'sample-task',
            title: 'Sample Task',
            relates_to: 'tasks/tasks-sample-task.md'
          }
        ]
      }),
      'utf8'
    );

    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Active closeout provenance:');
    expect(prompt).toContain('- Resolved active closeout root: `out/sample-task/manual/TODO-closeout`');
    expect(prompt).not.toContain('out/sample-task-scout/manual/TODO-closeout');
  });

  it('surfaces TODO and latest completed closeout provenance together in the diff-mode handoff', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    await makeCloseoutBundle(sandbox, 'sample-task', '20260311T000000Z-closeout');
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('- Resolved active closeout root: `out/sample-task/manual/TODO-closeout`');
    expect(prompt).toContain(
      '- Resolved active closeout root: `out/sample-task/manual/20260311T000000Z-closeout`'
    );
  });

  it('includes checklist and manifest context only on the explicit audit surface', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const taskId = 'sample-task';
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await mkdir(join(sandbox, 'docs'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', `tasks-${taskId}.md`),
      [
        `# Task Checklist - ${taskId}`,
        '',
        `- MCP Task ID: \`${taskId}\``,
        `- Primary PRD: \`docs/PRD-${taskId}.md\``,
        `- TECH_SPEC: \`tasks/specs/${taskId}.md\``,
        `- ACTION_PLAN: \`docs/ACTION_PLAN-${taskId}.md\``,
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(sandbox, 'docs', `PRD-${taskId}.md`),
      ['# PRD', '', '## Summary', '', '- audit bullet one', '- audit bullet two', ''].join('\n'),
      'utf8'
    );
    const result = await runReviewCommand(
      manifestPath,
      baseEnv(sandbox, codexBin),
      ['--task', taskId, '--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('allowed audit meta surfaces: run-manifest, run-runner-log');
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review surface: audit');
    expect(prompt).toContain('Evidence manifest: .runs/sample-task/cli/sample-run/manifest.json');
    expect(prompt).toContain('Evidence runner log: .runs/sample-task/cli/sample-run/runner.ndjson');
    expect(prompt).toContain('Task context:');
    expect(prompt).toContain('- Task checklist: `tasks/tasks-sample-task.md`');
    expect(prompt).toContain('- Primary PRD: `docs/PRD-sample-task.md`');
    expect(prompt).toContain('Evidence + checklist mirroring requirements are satisfied');
    expect(prompt).toContain(
      'Start with the manifest or runner log before consulting memory, skills, or review docs'
    );
    expect(prompt).toContain(
      'Keep this review focused on the requested audit surfaces, supporting evidence, and directly related code/docs paths.'
    );
    expect(prompt).not.toContain('PRD summary (`docs/PRD-sample-task.md`):');
    expect(prompt).not.toContain('- audit bullet one');
    expect(prompt).not.toContain('- audit bullet two');
    expect(prompt).not.toContain('tasks/specs/sample-task.md');
    expect(prompt).not.toContain('docs/ACTION_PLAN-sample-task.md');
    expect(prompt).not.toContain('Keep this review focused on changed files and nearby dependencies.');
  });

  it('supports CODEX_REVIEW_SURFACE env fallback for audit mode', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const taskId = 'sample-task';
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await mkdir(join(sandbox, 'docs'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', `tasks-${taskId}.md`),
      [
        `# Task Checklist - ${taskId}`,
        '',
        `- MCP Task ID: \`${taskId}\``,
        `- Primary PRD: \`docs/PRD-${taskId}.md\``,
        `- TECH_SPEC: \`tasks/specs/${taskId}.md\``,
        `- ACTION_PLAN: \`docs/ACTION_PLAN-${taskId}.md\``,
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(sandbox, 'docs', `PRD-${taskId}.md`),
      ['# PRD', '', '## Summary', '', '- env fallback bullet', ''].join('\n'),
      'utf8'
    );

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      CODEX_REVIEW_SURFACE: 'audit'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('allowed audit meta surfaces: run-manifest, run-runner-log');
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review surface: audit');
    expect(prompt).toContain('Evidence manifest: .runs/sample-task/cli/sample-run/manifest.json');
    expect(prompt).toContain('Evidence runner log: .runs/sample-task/cli/sample-run/runner.ndjson');
    expect(prompt).toContain('Task context:');
    expect(prompt).toContain('- Task checklist: `tasks/tasks-sample-task.md`');
    expect(prompt).toContain('- Primary PRD: `docs/PRD-sample-task.md`');
    expect(prompt).toContain(
      'Start with the manifest or runner log before consulting memory, skills, or review docs'
    );
    expect(prompt).toContain(
      'Keep this review focused on the requested audit surfaces, supporting evidence, and directly related code/docs paths.'
    );
    expect(prompt).not.toContain('PRD summary (`docs/PRD-sample-task.md`):');
    expect(prompt).not.toContain('- env fallback bullet');
    expect(prompt).not.toContain('tasks/specs/sample-task.md');
    expect(prompt).not.toContain('docs/ACTION_PLAN-sample-task.md');
    expect(prompt).not.toContain('Keep this review focused on changed files and nearby dependencies.');
  });

  it('includes canonical docs-first context only on the explicit architecture surface', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const taskId = 'sample-task';
    await writeTaskDocsFirstContext(sandbox, taskId, { includeArchitectureBaseline: true });

    const result = await runReviewCommand(
      manifestPath,
      baseEnv(sandbox, codexBin),
      ['--task', taskId, '--surface', 'architecture']
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('bounded review guidance enabled by default');
    expect(result.stdout).not.toContain('allowed audit meta surfaces: run-manifest, run-runner-log');
    expect(result.stdout).toContain(
      'allowed architecture meta surfaces: architecture-context, review-support, review-docs'
    );
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review surface: architecture');
    expect(prompt).toContain('Task context:');
    expect(prompt).toContain('- Task checklist: `tasks/tasks-sample-task.md`');
    expect(prompt).toContain('- Primary PRD: `docs/PRD-sample-task.md`');
    expect(prompt).toContain('- TECH_SPEC: `tasks/specs/sample-task.md`');
    expect(prompt).toContain('- ACTION_PLAN: `docs/ACTION_PLAN-sample-task.md`');
    expect(prompt).toContain('- Repo architecture baseline: `.agent/system/architecture.md`');
    expect(prompt).toContain(
      'Use the canonical architecture inputs above as the primary review context before widening further'
    );
    expect(prompt).toContain(
      'Keep this pass architecture-focused. Do not treat it as a generic evidence or closeout audit.'
    );
    expect(prompt).toContain(
      'Keep this review focused on the requested architecture surfaces, canonical task docs, and directly relevant implementation paths.'
    );
    expect(prompt).not.toContain('Evidence manifest:');
    expect(prompt).not.toContain('Evidence runner log:');
    expect(prompt).not.toContain('Evidence + checklist mirroring requirements are satisfied');
    expect(prompt).not.toContain('Keep this pass diff-focused.');
  });

  it('supports CODEX_REVIEW_SURFACE env fallback for architecture mode', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const taskId = 'sample-task';
    await writeTaskDocsFirstContext(sandbox, taskId, { includeArchitectureBaseline: true });

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      TASK: taskId,
      CODEX_REVIEW_SURFACE: 'architecture'
    });

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review surface: architecture');
    expect(prompt).toContain('- Repo architecture baseline: `.agent/system/architecture.md`');
    expect(prompt).not.toContain('Evidence manifest:');
  });

  it('keeps delegation MCP enabled by default for wrapper review runs', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_ARGS_LOG: argsLogPath
    });

    expect(result.exitCode).toBe(0);
    const loggedArgs = await readFile(argsLogPath, 'utf8');
    expect(loggedArgs).not.toContain('config=mcp_servers.delegation.enabled=false');
  });

  it('allows explicit delegation MCP disable for wrapper review runs', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_ARGS_LOG: argsLogPath,
      CODEX_REVIEW_DISABLE_DELEGATION_MCP: '1'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('delegation MCP disabled for this review');
    const loggedArgs = await readFile(argsLogPath, 'utf8');
    expect(loggedArgs).toContain('config=mcp_servers.delegation.enabled=false');
  });

  it('supports legacy enable env override for explicit disable', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_ARGS_LOG: argsLogPath,
      CODEX_REVIEW_ENABLE_DELEGATION_MCP: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('delegation MCP disabled for this review');
    const loggedArgs = await readFile(argsLogPath, 'utf8');
    expect(loggedArgs).toContain('config=mcp_servers.delegation.enabled=false');
  });

  it('fails a silent review process via stall-timeout override', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review stalled with no output for 1s');
    expect(result.stderr).toContain('termination boundary: stall (output-stall).');
    expect(result.stderr).toContain('Review output log (partial):');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual({
      kind: 'stall',
      provenance: 'output-stall',
      reason:
        'codex review stalled with no output for 1s (set CODEX_REVIEW_STALL_TIMEOUT_SECONDS=0 to disable).',
      sample: null
    });
  }, LONG_WAIT_TEST_TIMEOUT_MS * 2);

  it('persists timeout telemetry summaries for faster failure triage', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommandSubprocess(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).toContain('termination boundary: timeout (review-timeout).');
    expect(result.stderr).toContain('Review output log (partial):');
    expect(result.stderr).toContain('[run-review] review telemetry:');
    expect(result.stderr).toContain('heavy command start(s)');
    expect(result.stderr).toContain('last command started: [redacted]');
    expect(result.stderr).toContain('output tail captured:');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: { commandStarts: string[]; heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toContain('[redacted error');
    expect(telemetry.termination_boundary).toEqual({
      kind: 'timeout',
      provenance: 'review-timeout',
      reason:
        'codex review timed out after 1s (set CODEX_REVIEW_TIMEOUT_SECONDS=0 to disable).',
      sample: null
    });
    expect(telemetry.summary.commandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts[0]).toContain('[redacted heavy-command');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('matches only exact fake Codex review commands with optional config overrides', () => {
    const codexBin = '/tmp/run-review-abc/codex-mock.sh';

    expect(commandInvokesRunReviewMock(`${codexBin} review Review task: sample-task`, codexBin)).toBe(
      true
    );
    expect(
      commandInvokesRunReviewMock(
        `${codexBin} -c mcp_servers.delegation.enabled=true review Review task: sample-task`,
        codexBin
      )
    ).toBe(true);
    expect(
      commandInvokesRunReviewMock(
        `${codexBin} --config mcp_servers.delegation.enabled=true -c default_permissions=":read-only" review`,
        codexBin
      )
    ).toBe(true);
    expect(
      commandInvokesRunReviewMock(
        `${codexBin} --ask-for-approval never review Review task: sample-task`,
        codexBin
      )
    ).toBe(false);
    expect(commandInvokesRunReviewMock(`${codexBin}.bak -c value review`, codexBin)).toBe(false);
    expect(commandInvokesRunReviewMock(`${codexBin} -c value exec`, codexBin)).toBe(false);
  });

  it('reaps hanging fake Codex subprocesses after a subprocess harness timeout', async () => {
    if (process.platform === 'win32') {
      return;
    }

    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const hangMarker = join(sandbox, 'hang-started.txt');
    const beforePids = await findRunReviewMockPids(codexBin, { strict: true });

    const result = await runReviewCommandSubprocess(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'hang',
        RUN_REVIEW_HANG_MARKER: hangMarker,
        CODEX_REVIEW_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
      },
      [],
      process.cwd(),
      // This assertion needs fake Codex to reach hang mode before the outer
      // subprocess harness kills run-review; full-suite load can spend close
      // to the 10s main-branch budget in wrapper startup before the marker is
      // written.
      { timeoutMs: RUN_REVIEW_HANGING_SUBPROCESS_TIMEOUT_MS, killSignal: 'SIGKILL' }
    );

    expect(result.exitCode).toBeGreaterThan(0);
    await expect(readFile(hangMarker, 'utf8')).resolves.toBe('started\n');
    expect(await findRunReviewMockPids(codexBin, { strict: true })).toEqual(beforePids);
  }, RUN_REVIEW_HANGING_SUBPROCESS_TEST_TIMEOUT_MS);

  it('reaps override-prefixed fake Codex review subprocesses', async () => {
    if (process.platform === 'win32') {
      return;
    }

    const sandbox = await makeSandbox();
    const codexBin = await makeFakeCodex(sandbox);
    const hangMarker = join(sandbox, 'override-hang-started.txt');
    const beforePids = await findRunReviewMockPids(codexBin, { strict: true });
    const child = spawn(
      codexBin,
      ['-c', 'mcp_servers.delegation.enabled=true', 'review', 'Review task: sample-task'],
      {
        detached: true,
        env: {
          ...baseEnv(sandbox, codexBin),
          RUN_REVIEW_MODE: 'hang',
          RUN_REVIEW_HANG_MARKER: hangMarker
        },
        stdio: 'ignore'
      }
    );
    child.unref();

    try {
      await waitForFileContents(hangMarker, 'started\n');
      expect(await findRunReviewMockPids(codexBin, { strict: true })).toContain(child.pid);
      await cleanupRunReviewMockProcesses(codexBin);
      expect(await findRunReviewMockPids(codexBin, { strict: true })).toEqual(beforePids);
    } finally {
      if (typeof child.pid === 'number') {
        await terminateRunReviewMockProcess({ pid: child.pid, pgid: child.pid }, 'SIGKILL');
      }
    }
  }, RUN_REVIEW_HANGING_SUBPROCESS_TEST_TIMEOUT_MS);

  it('persists telemetry when review launch fails after the command probe', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delete-after-help'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('ENOENT');
    expect(result.stderr).toContain('[run-review] review telemetry:');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      summary: { commandStarts: string[]; heavyCommandStarts: string[]; reviewProgressSignals: number };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toContain('[redacted error');
    expect(telemetry.summary.commandStarts).toEqual([]);
    expect(telemetry.summary.heavyCommandStarts).toEqual([]);
    expect(telemetry.summary.reviewProgressSignals).toBe(0);
  });

  it('prints raw telemetry command/tail details only when debug telemetry env is enabled', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_DEBUG_TELEMETRY: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('last command started: /bin/zsh -lc');
    expect(result.stderr).toContain('heavy commands detected: /bin/zsh -lc');
    expect(result.stderr).toContain('output tail:');
    expect(result.stderr).not.toContain('bounded command-intent boundary');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      summary: {
        commandStarts: string[];
        heavyCommandStarts: string[];
        commandIntentViolationCount: number;
        lastLines: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).not.toContain('[redacted error');
    expect(telemetry.summary.commandStarts[0]).toContain('/bin/zsh -lc');
    expect(telemetry.summary.heavyCommandStarts[0]).toContain('run test');
    expect(telemetry.summary.commandIntentViolationCount).toBe(0);
    expect(telemetry.summary.lastLines.length).toBeGreaterThan(0);
    expect(telemetry.summary.lastLines[0]).not.toContain('[redacted');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('keeps bounded guidance advisory by default for heavy command starts', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-typecheck',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('attempted heavy command in bounded mode');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails fast when bounded enforcement is enabled and heavy command starts are detected', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-typecheck',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(result.stderr).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');
    expect(result.stderr).not.toContain('/tmp/run-review-heavy');
    expect(result.stderr).not.toContain('timed out');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: { heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('includes raw blocked command text in bounded failures only when debug telemetry is enabled', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const redactedResult = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-fast-exit-typecheck',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });
    expect(redactedResult.exitCode).toBeGreaterThan(0);
    expect(redactedResult.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(redactedResult.stderr).not.toContain('/tmp/run-review-heavy');
    expect(redactedResult.stderr).not.toContain('timed out');

    const debugResult = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-fast-exit-typecheck',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_DEBUG_TELEMETRY: '1'
    });
    expect(debugResult.exitCode).toBeGreaterThan(0);
    expect(debugResult.stderr).toContain('/tmp/run-review-heavy');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded enforcement even after long noisy preamble lines between exec and command', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-long-noise-typecheck',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '3',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(result.stderr).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('captures heavy telemetry even when command follows long noisy preamble lines', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-long-noise-typecheck',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: { commandStarts: string[]; heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.commandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts[0]).toContain('[redacted heavy-command');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('detects heavy commands when stderr noise appears between exec and command line', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-cross-stream-warning-typecheck',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(result.stderr).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: { heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts[0]).toContain('[redacted heavy-command');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('detects heavy commands when stdout noise appears between exec and command line', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-same-stream-warning-typecheck',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(result.stderr).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: { heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts[0]).toContain('[redacted heavy-command');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded enforcement even when heavy commands exit quickly', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-fast-exit-typecheck',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(result.stderr).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: { heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('does not treat quoted heavy-command text as a bounded heavy command', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-quoted-text',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('attempted heavy command in bounded mode');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: { heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.heavyCommandStarts.length).toBe(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded enforcement when command lines land on stderr after stdout exec markers', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-fast-cross-stream-command-typecheck',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(result.stderr).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: { heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on npm --workspaces validation-suite launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-workspaces-flag',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
    expect(result.stderr).toContain('termination boundary: command-intent (validation-suite).');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on npm run-script validation-suite launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-run-script-alias',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on npm test aliases by default', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-test-alias',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on scoped package-manager test-file launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-fast-scoped-test-file',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on npm.cmd validation-suite launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-npm-cmd-launcher',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on npm.ps1 validation-suite launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-npm-ps1-launcher',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on cmd /c wrapped validation-suite launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-cmd-wrapper',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on cmd /C wrapped validation-suite launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-cmd-wrapper-uppercase-flag',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('detects heavy commands executed as python -m pytest', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-python-module',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(result.stderr).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on env-wrapped validation-suite launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-env-wrapper',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('detects heavy commands wrapped by /usr/bin/env', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang-env-path-wrapper',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');
    expect(result.stderr).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('emits patience-first monitor checkpoints during long-running waits', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_TIMEOUT_SECONDS: '2',
      CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0.2'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stdout).toContain('patience-first monitor checkpoints every');
    expect(result.stdout).toContain('waiting on codex review (');
    expect(result.stderr).toContain('codex review timed out after 2s');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows disabling monitor checkpoints explicitly', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stdout).toContain('patience-first monitor checkpoints disabled');
    expect(result.stdout).not.toContain('waiting on codex review (');
    expect(result.stderr).toContain('codex review timed out after 1s');
  });

  it('fails large uncommitted review scope unless an explicit override is recorded', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 3);
    const argsLogPath = join(sandbox, 'review-args.log');
    for (const file of files) {
      await writeFile(join(sandbox, file), `updated-${file}\n`, 'utf8');
    }

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_ARGS_LOG: argsLogPath,
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '2',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '2'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stdout).toContain('review scope metrics: 3 files, 6 lines.');
    expect(result.stderr).toContain('large uncommitted review scope detected');
    expect(result.stderr).toContain(
      'large uncommitted review scope requires explicit scoping or override'
    );
    const reviewInvocations = parseArgsLogInvocations(
      await readFile(argsLogPath, 'utf8').catch(() => '')
    ).filter((entry) => entry.includes('argv=review'));
    expect(reviewInvocations).toHaveLength(0);
  });

  it('allows large uncommitted review scope only with an auditable override', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 3);
    const argsLogPath = join(sandbox, 'review-args.log');
    for (const file of files) {
      await writeFile(join(sandbox, file), `updated-${file}\n`, 'utf8');
    }

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_ARGS_LOG: argsLogPath,
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '2',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '2',
      CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON: 'operator requested full working-tree review'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('review scope metrics: 3 files, 6 lines.');
    expect(result.stderr).toContain('large uncommitted review scope detected');
    expect(result.stderr).toContain('large uncommitted review scope override accepted');

    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Scope advisory: large uncommitted diff detected');
    expect(prompt).toContain('Large-scope override recorded: operator requested full working-tree review');
    expect(prompt).toContain('Prioritize highest-risk findings first');
    const reviewInvocations = parseArgsLogInvocations(
      await readFile(argsLogPath, 'utf8').catch(() => '')
    ).filter((entry) => entry.includes('argv=review'));
    expect(reviewInvocations.length).toBeGreaterThanOrEqual(1);
  });

  it('uses path-only uncommitted scope notes in prompts', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 1);
    const modifiedFile = files[0] ?? 'file-1.txt';
    await writeFile(join(sandbox, modifiedFile), 'updated\n', 'utf8');
    await writeFile(join(sandbox, 'notes.txt'), 'draft\n', 'utf8');

    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review scope hint: uncommitted working tree changes (default).');
    expect(prompt).toContain('Review scope paths (2):');
    expect(prompt).toContain(modifiedFile);
    expect(prompt).toContain('notes.txt');
    expect(prompt).toContain(
      'Start with touched paths, scoped diff commands, or nearby changed code before consulting memory, skills, review docs, manifests, or review artifacts'
    );
    expect(prompt).not.toContain('Git scope summary:');
    expect(prompt).not.toContain('## ');
    expect(prompt).not.toContain('?? notes.txt');
  });

  it('uses path-only commit scope notes in prompts', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 1);
    const modifiedFile = files[0] ?? 'file-1.txt';
    await writeFile(join(sandbox, modifiedFile), 'second pass\n', 'utf8');
    await runGit(['commit', '-am', 'scope-only second'], sandbox);
    const { stdout: commitStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const commitSha = commitStdout.trim();

    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin), [
      '--commit',
      commitSha
    ]);

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain(`Review scope hint: commit \`${commitSha}\``);
    expect(prompt).toContain('Review scope paths (1):');
    expect(prompt).toContain(modifiedFile);
    expect(prompt).toContain(
      'Start with touched paths or nearby changed code before consulting memory, skills, review docs, manifests, or review artifacts'
    );
    expect(prompt).not.toContain(
      'Start with touched paths, scoped diff commands, or nearby changed code before consulting memory, skills, review docs, manifests, or review artifacts'
    );
    expect(prompt).not.toContain('Git scope summary:');
    expect(prompt).not.toContain('Author:');
    expect(prompt).not.toContain('Date:');
    expect(prompt).not.toContain('scope-only second');
  });

  it('uses path-only base scope notes in prompts while preserving rename identity', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 1);
    const originalFile = files[0] ?? 'file-1.txt';
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();

    const renamedFile = 'renamed-from-base.txt';
    await runGit(['mv', originalFile, renamedFile], sandbox);
    await runGit(['commit', '-m', 'scope-only base rename'], sandbox);

    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin), [
      '--base',
      baseRef
    ]);

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain(`Review scope hint: diff vs base \`${baseRef}\``);
    expect(prompt).toContain('Review scope paths (2):');
    expect(prompt).toContain(`${originalFile} -> ${renamedFile}`);
    expect(prompt).toContain(
      'Start with touched paths or nearby changed code before consulting memory, skills, review docs, manifests, or review artifacts'
    );
    expect(prompt).not.toContain(
      'Start with touched paths, scoped diff commands, or nearby changed code before consulting memory, skills, review docs, manifests, or review artifacts'
    );
    expect(prompt).not.toContain('Git scope summary:');
    expect(prompt).not.toContain('scope-only base rename');
    expect(prompt).not.toContain('R100\t');
  });

  it('executes explicit base-scoped review with synthesized title transport and no inline prompt argument', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-scoped-prompt',
        RUN_REVIEW_ARGS_LOG: argsLogPath
      },
      ['--base', baseRef]
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('stdout-ok');
    expect(result.stderr).toContain('stderr-ok');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const reviewInvocations = parseArgsLogInvocations(argsLog).filter((entry) =>
      entry.includes('argv=review')
    );
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(
      'argv=review --title Surface: diff | Bounded: no validation; list follow-up commands only | Goal: run-review regression tests | Summary: verify timeout/stall handling | Risks: none'
    );
    expect(reviewInvocations[0]).toContain(`--base ${baseRef}`);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      launch_context: {
        scope_flag_mode: 'base' | 'commit' | 'uncommitted' | null;
        prompt_delivery: 'inline' | 'artifact-only';
        reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
        reviewer_visible_title_source: 'user' | 'notes-surface' | null;
      } | null;
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.error).toBeNull();
    expect(telemetry.launch_context).toEqual(
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'notes-surface'
      })
    );
  });

  it('retries explicit base-scoped review without synthesized title when codex rejects --title', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-title',
        RUN_REVIEW_ARGS_LOG: argsLogPath
      },
      ['--base', baseRef]
    );

    expect(result.exitCode).toBe(0);
    const argsLog = await readFile(argsLogPath, 'utf8');
    const reviewInvocations = parseArgsLogInvocations(argsLog).filter((entry) =>
      entry.includes('argv=review')
    );
    expect(reviewInvocations).toEqual([
      'argv=review --title Surface: diff | Bounded: no validation; list follow-up commands only | Goal: run-review regression tests | Summary: verify timeout/stall handling | Risks: none --base ' +
        baseRef,
      `argv=review --base ${baseRef}`
    ]);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      launch_context: {
        scope_flag_mode: 'base' | 'commit' | 'uncommitted' | null;
        prompt_delivery: 'inline' | 'artifact-only';
        reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
        reviewer_visible_title_source: 'user' | 'notes-surface' | null;
      } | null;
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.error).toBeNull();
    expect(telemetry.launch_context).toEqual(reviewLaunchContext('base'));
  });

  it('treats later review positional tokens as inline prompt content in the fake codex harness', async () => {
    const sandbox = await makeSandbox();
    const codexBin = await makeFakeCodex(sandbox);

    try {
      await execFileAsync(codexBin, ['review', '--base', 'HEAD', 'review'], {
        cwd: sandbox,
        env: {
          ...process.env,
          RUN_REVIEW_MODE: 'reject-scoped-prompt'
        }
      });
      throw new Error('expected fake codex to reject inline prompt content');
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string; code?: number };
      expect(err.code).toBe(1);
      expect(String(err.stderr ?? '')).toContain('custom prompt cannot be combined with --base');
    }
  });

  it('fails when explicit scoped review requests a non-diff surface', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_ARGS_LOG: argsLogPath
      },
      ['--base', baseRef, '--surface', 'audit']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('explicit scoped review cannot honor --surface audit');
    await expect(readFile(argsLogPath, 'utf8')).rejects.toThrow();
  });

  it('fails explicit scoped non-diff surfaces before diff-budget or manifest preflight', async () => {
    const sandbox = await makeSandbox();
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      null,
      {
        ...baseEnv(sandbox, codexBin),
        TASK: 'missing-scoped-surface-preflight-task'
      },
      ['--base', 'definitely-not-a-ref', '--surface', 'audit']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('explicit scoped review cannot honor --surface audit');
    expect(result.stderr).not.toContain('Explicit diff base requested but no valid ref was found');
    expect(result.stderr).not.toContain('No run manifests found');
  });

  it('fails when explicit base scope is rejected with a generic unknown-option error', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-base-unknown-option',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1'
      },
      ['--base', baseRef]
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('retrying without them would remove explicit review scope');
    expect(result.stderr).toContain('explicit `--base` review scope must remain auditable');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const invocations = parseArgsLogInvocations(argsLog);
    const reviewInvocations = invocations.filter((entry) => entry.includes('argv=review'));
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(`--base ${baseRef}`);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      launch_context: {
        scope_flag_mode: 'base' | 'commit' | 'uncommitted' | null;
        prompt_delivery: 'inline' | 'artifact-only';
        reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
        reviewer_visible_title_source: 'user' | 'notes-surface' | null;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).toContain('explicit `--base` review scope must remain auditable');
    expect(telemetry.launch_context).toEqual(
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'notes-surface'
      })
    );
  });

  it('still blocks dropping explicit base scope when a pipeline-owned large-scope override is set', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-base-unknown-option',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1',
        CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON:
          'Pipeline-owned implementation gate review accepts large uncommitted scope; use --base/--commit for narrower operator-driven review runs.'
      },
      ['--base', baseRef]
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('retrying without them would remove explicit review scope');
    expect(result.stderr).toContain('explicit `--base` review scope must remain auditable');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const reviewInvocations = parseArgsLogInvocations(argsLog).filter((entry) =>
      entry.includes('argv=review')
    );
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(`--base ${baseRef}`);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      launch_context: {
        scope_flag_mode: 'base' | 'commit' | 'uncommitted' | null;
        prompt_delivery: 'inline' | 'artifact-only';
        reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
        reviewer_visible_title_source: 'user' | 'notes-surface' | null;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).toContain('explicit `--base` review scope must remain auditable');
    expect(telemetry.launch_context).toEqual(
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'notes-surface'
      })
    );
  });

  it('executes explicit commit-scoped review with synthesized title transport and no inline prompt argument', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    await writeFile(join(sandbox, 'file-1.txt'), 'updated-file-1.txt\n', 'utf8');
    await runGit(['commit', '-am', 'commit-only review scope'], sandbox);
    const { stdout: commitStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const commitSha = commitStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-scoped-prompt-usage-footer',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1'
      },
      ['--commit', commitSha]
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('stdout-ok');
    expect(result.stderr).toContain('stderr-ok');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const reviewInvocations = parseArgsLogInvocations(argsLog).filter((entry) =>
      entry.includes('argv=review')
    );
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(
      'argv=review --title Surface: diff | Bounded: no validation; list follow-up commands only | Goal: run-review regression tests | Summary: verify timeout/stall handling | Risks: none'
    );
    expect(reviewInvocations[0]).toContain(`--commit ${commitSha}`);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      launch_context: {
        scope_flag_mode: 'base' | 'commit' | 'uncommitted' | null;
        prompt_delivery: 'inline' | 'artifact-only';
        reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
        reviewer_visible_title_source: 'user' | 'notes-surface' | null;
      } | null;
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.error).toBeNull();
    expect(telemetry.launch_context).toEqual(
      reviewLaunchContext('commit', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'notes-surface'
      })
    );
  });

  it('executes explicit uncommitted review with synthesized title transport and no inline prompt argument', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    await writeFile(join(sandbox, 'file-1.txt'), 'updated-file-1.txt\n', 'utf8');
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-scoped-prompt-generic-diff-scoping',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1'
      },
      ['--uncommitted']
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('stdout-ok');
    expect(result.stderr).toContain('stderr-ok');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const reviewInvocations = parseArgsLogInvocations(argsLog).filter((entry) =>
      entry.includes('argv=review')
    );
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(
      'argv=review --title Surface: diff | Bounded: no validation; list follow-up commands only | Goal: run-review regression tests | Summary: verify timeout/stall handling | Risks: none'
    );
    expect(reviewInvocations[0]).toContain('--uncommitted');
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      launch_context: {
        scope_flag_mode: 'base' | 'commit' | 'uncommitted' | null;
        prompt_delivery: 'inline' | 'artifact-only';
        reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
        reviewer_visible_title_source: 'user' | 'notes-surface' | null;
      } | null;
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.error).toBeNull();
    expect(telemetry.launch_context).toEqual(
      reviewLaunchContext('uncommitted', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'notes-surface'
      })
    );
  });

  it('preserves explicit scoped titles instead of replacing them with synthesized NOTES transport', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-scoped-prompt',
        RUN_REVIEW_ARGS_LOG: argsLogPath
      },
      ['--base', baseRef, '--title', 'Sample review']
    );

    expect(result.exitCode).toBe(0);
    const argsLog = await readFile(argsLogPath, 'utf8');
    const reviewInvocations = parseArgsLogInvocations(argsLog).filter((entry) =>
      entry.includes('argv=review')
    );
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(
      '--title Sample review | Bounded: no validation; list follow-up commands only'
    );
    expect(reviewInvocations[0]).not.toContain('Goal: run-review regression tests');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      launch_context: {
        scope_flag_mode: 'base' | 'commit' | 'uncommitted' | null;
        prompt_delivery: 'inline' | 'artifact-only';
        reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
        reviewer_visible_title_source: 'user' | 'notes-surface' | null;
      } | null;
    };
    expect(telemetry.launch_context).toEqual(
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'user'
      })
    );
  });

  it('documents scoped launch prompt handling in the wrapper help output', async () => {
    const sandbox = await makeSandbox();
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, baseEnv(sandbox, codexBin), ['--help']);

    expect(result.exitCode).toBe(0);
    const normalizedHelp = result.stdout.replace(/\s+/g, ' ').trim();
    expect(normalizedHelp).toContain(
      'Behavior: Explicit --uncommitted/--base/--commit wrapper runs keep prompt/context in review/prompt.txt and launch codex review without any prompt argument because current CLI still treats stdin (`-`) as [PROMPT]; reviewer-visible scoped context first rides on --title (user-provided when present, otherwise synthesized from NOTES + surface) with bounded no-validation guidance visible where the current Codex review surface honors titles. If Codex rejects a synthesized scoped title, the wrapper retries the same explicit scope without `--title` and falls back to artifact-only context. If bounded review blocks a validation command, the wrapper retries once with a reviewer-visible inline no-validation prompt that names the original scope and runs under a read-only permission-profile override, falling back to one expiry-enforced legacy read-only sandbox override only when the active Codex CLI rejects `default_permissions`; successful retry preserves the command-intent boundary in telemetry as bounded-success and records legacy fallback metadata when that compatibility path is used.'
    );
    expect(normalizedHelp).toContain(
      'Explicit scoped wrapper runs Support only the default diff surface; audit/architecture still require prompt-capable unscoped review.'
    );
    expect(normalizedHelp).toContain(
      'Unscoped wrapper runs Pass the saved prompt/context inline to codex review.'
    );
  });

  it('preserves unrelated CLI option failures instead of rewriting them as scope-gate errors', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 3);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    for (const file of files) {
      await writeFile(join(sandbox, file), `updated-${file}\n`, 'utf8');
    }
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-title',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1',
        CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '2',
        CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '2'
      },
      ['--base', baseRef, '--title', 'Sample review']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('unknown option --title');
    expect(result.stderr).not.toContain('retrying without flags would remove explicit review scope');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const invocations = parseArgsLogInvocations(argsLog);
    expect(invocations.length).toBeGreaterThan(0);
    const reviewInvocations = invocations.filter((entry) => entry.includes('argv=review'));
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain('--title Sample review');
    expect(reviewInvocations[0]).toContain(`--base ${baseRef}`);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).not.toContain('remove explicit review scope');
  });

  it('preserves unrelated CLI option failures when the CLI usage footer lists explicit scope flags', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 3);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    for (const file of files) {
      await writeFile(join(sandbox, file), `updated-${file}\n`, 'utf8');
    }
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-title-usage-footer',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1',
        CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '2',
        CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '2'
      },
      ['--base', baseRef, '--title', 'Sample review']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('unknown option --title');
    expect(result.stderr).not.toContain('retrying without flags would remove explicit review scope');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const invocations = parseArgsLogInvocations(argsLog);
    expect(invocations.length).toBeGreaterThan(0);
    const reviewInvocations = invocations.filter((entry) => entry.includes('argv=review'));
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain('--title Sample review');
    expect(reviewInvocations[0]).toContain(`--base ${baseRef}`);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).not.toContain('remove explicit review scope');
  });

  it('preserves prompt incompatibility failures for unrelated options even when the CLI usage footer lists scope flags', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 3);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    for (const file of files) {
      await writeFile(join(sandbox, file), `updated-${file}\n`, 'utf8');
    }
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-title-prompt-usage-footer',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1',
        CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '2',
        CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '2'
      },
      ['--base', baseRef, '--title', 'Sample review']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('custom prompt cannot be combined with --title');
    expect(result.stderr).not.toContain('retrying without flags would remove explicit review scope');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const invocations = parseArgsLogInvocations(argsLog);
    expect(invocations.length).toBeGreaterThan(0);
    expect(
      invocations.some(
        (entry) =>
          entry.includes('argv=review') &&
          entry.includes('--title Sample review') &&
          entry.includes(`--base ${baseRef}`)
      )
    ).toBe(true);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).not.toContain('remove explicit review scope');
  });

  it('fails when a title/base incompatibility would drop explicit base scope', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-title-base-incompatibility',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1'
      },
      ['--base', baseRef, '--title', 'Sample review']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('--title cannot be used with --base');
    expect(result.stderr).toContain('retrying without them would remove explicit review scope');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const invocations = parseArgsLogInvocations(argsLog);
    const reviewInvocations = invocations.filter((entry) => entry.includes('argv=review'));
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(`--base ${baseRef}`);
    expect(reviewInvocations[0]).toContain('--title Sample review');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).toContain('explicit `--base` review scope must remain auditable');
  });

  it('fails when a quoted title/base incompatibility would drop explicit base scope', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-title-base-incompatibility-double-quoted',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1'
      },
      ['--base', baseRef, '--title', 'Sample review']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('--title cannot be used with "--base"');
    expect(result.stderr).toContain('retrying without them would remove explicit review scope');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const invocations = parseArgsLogInvocations(argsLog);
    const reviewInvocations = invocations.filter((entry) => entry.includes('argv=review'));
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(`--base ${baseRef}`);
    expect(reviewInvocations[0]).toContain('--title Sample review');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).toContain('explicit `--base` review scope must remain auditable');
  });

  it('fails when quoted explicit base scope rejection would drop explicit base scope', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: sandbox
    });
    const baseRef = baseStdout.trim();
    const argsLogPath = join(sandbox, 'review-args.log');

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-base-quoted-unknown-option',
        RUN_REVIEW_ARGS_LOG: argsLogPath,
        CODEX_REVIEW_DEBUG_TELEMETRY: '1'
      },
      ['--base', baseRef, '--title', 'Sample review']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain("unknown option '--base'");
    expect(result.stderr).toContain('retrying without them would remove explicit review scope');
    const argsLog = await readFile(argsLogPath, 'utf8');
    const invocations = parseArgsLogInvocations(argsLog);
    const reviewInvocations = invocations.filter((entry) => entry.includes('argv=review'));
    expect(reviewInvocations).toHaveLength(1);
    expect(reviewInvocations[0]).toContain(`--base ${baseRef}`);
    expect(reviewInvocations[0]).toContain('--title Sample review');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.error).toContain('explicit `--base` review scope must remain auditable');
  });

  it('does not treat scope flag text inside title values as an explicit scope flag', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'reject-base-unknown-option'
      },
      ['--title', 'docs mention --base handling']
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('stdout-ok');
    expect(result.stderr).toContain('stderr-ok');
  });

  it('renders uncommitted rename scope notes as paired paths', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 1);
    const originalFile = files[0] ?? 'file-1.txt';
    const renamedFile = 'renamed-working-tree.txt';
    await runGit(['mv', originalFile, renamedFile], sandbox);

    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review scope hint: uncommitted working tree changes (default).');
    expect(prompt).toContain('Review scope paths (2):');
    expect(prompt).toContain(`${originalFile} -> ${renamedFile}`);
    expect(prompt).not.toContain(`\n${originalFile}\n`);
    expect(prompt).not.toContain(`\n${renamedFile}\n`);
  });

  it('counts untracked file lines when evaluating large uncommitted scope', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    await writeFile(join(sandbox, 'huge-untracked.txt'), `${'line\n'.repeat(30)}`, 'utf8');

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '99',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '10',
      CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON: 'explicitly validating untracked-line counting'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('review scope metrics: 1 files, 30 lines.');
    expect(result.stderr).toContain('large uncommitted review scope override accepted');
  });

  it('skips non-regular untracked paths when computing scope line metrics', async () => {
    if (process.platform === 'win32') {
      return;
    }

    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 1);
    await writeFile(join(sandbox, files[0] ?? 'file-1.txt'), 'updated\n', 'utf8');
    await symlink('/dev/zero', join(sandbox, 'endless-stream'));

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '99',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '99'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('review scope metrics:');
  });

  it('disables stall termination when CODEX_REVIEW_STALL_TIMEOUT_SECONDS=0', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('stalled with no output');
    expect(result.stderr).not.toContain('termination boundary: stall (output-stall).');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('defaults manifest selection to canonical task env when --task is omitted', async () => {
    const sandbox = await makeSandbox();
    await makeManifestForTask(
      sandbox,
      '0975-codex-cli-capability-adoption-redesign',
      '2026-02-19T01-00-00-000Z-older'
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    await makeManifestForTask(sandbox, '0101', '2026-02-19T02-00-00-000Z-newer');

    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      CODEX_ORCHESTRATOR_TASK_ID: '0975-codex-cli-capability-adoption-redesign'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('evidence: .runs/0975-codex-cli-capability-adoption-redesign/');
    expect(result.stdout).not.toContain('evidence: .runs/0101/');
  });

  it('prefers CODEX_ORCHESTRATOR_MANIFEST_PATH over stale MANIFEST and keeps artifacts on the active run dir', async () => {
    const sandbox = await makeSandbox();
    const staleManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'docs-review-old');
    const activeManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'implementation-gate-active');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'sample-task',
      MANIFEST: staleManifestPath,
      CODEX_ORCHESTRATOR_MANIFEST_PATH: activeManifestPath,
      CODEX_ORCHESTRATOR_RUN_DIR: dirname(activeManifestPath)
    }, ['--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const activePromptPath = join(dirname(activeManifestPath), 'review', 'prompt.txt');
    const activePrompt = await readFile(activePromptPath, 'utf8');
    expect(activePrompt).toContain(
      'Evidence manifest: .runs/sample-task/cli/implementation-gate-active/manifest.json'
    );
    expect(activePrompt).not.toContain('docs-review-old');
  });

  it('falls back to MANIFEST when CODEX_ORCHESTRATOR_MANIFEST_PATH is absent', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifestForTask(sandbox, 'sample-task', 'legacy-manifest-env');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'sample-task',
      MANIFEST: manifestPath
    }, ['--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Evidence manifest: .runs/sample-task/cli/legacy-manifest-env/manifest.json');
  });

  it('falls back to the run-dir manifest when explicit manifest envs are absent', async () => {
    const sandbox = await makeSandbox();
    await makeManifestForTask(sandbox, 'sample-task', 'docs-review-old');
    const activeManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'run-dir-active');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'sample-task',
      CODEX_ORCHESTRATOR_RUN_DIR: dirname(activeManifestPath)
    }, ['--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(activeManifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Evidence manifest: .runs/sample-task/cli/run-dir-active/manifest.json');
  });

  it('prefers an explicit task over a stale CODEX_ORCHESTRATOR_RUN_DIR manifest', async () => {
    const sandbox = await makeSandbox();
    const staleRunManifestPath = await makeManifestForTask(sandbox, 'stale-task', 'stale-run-dir');
    const requestedManifestPath = await makeManifestForTask(sandbox, 'requested-task', 'active-manifest');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      CODEX_ORCHESTRATOR_RUN_DIR: dirname(staleRunManifestPath)
    }, ['--task', 'requested-task', '--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const requestedPromptPath = join(dirname(requestedManifestPath), 'review', 'prompt.txt');
    const stalePromptPath = join(dirname(staleRunManifestPath), 'review', 'prompt.txt');
    const requestedPrompt = await readFile(requestedPromptPath, 'utf8');
    expect(requestedPrompt).toContain(
      'Evidence manifest: .runs/requested-task/cli/active-manifest/manifest.json'
    );
    expect(requestedPrompt).not.toContain('.runs/stale-task/');
    expect(requestedPrompt).not.toContain('stale-run-dir');
    await expect(readFile(stalePromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('accepts an explicit CODEX_ORCHESTRATOR_RUN_DIR layout when the task cannot be inferred from path', async () => {
    const sandbox = await makeSandbox();
    const customRunDir = join(sandbox, 'custom-review-runs', 'orchestrator-run');
    await mkdir(customRunDir, { recursive: true });
    await writeFile(join(customRunDir, 'manifest.json'), JSON.stringify({ run: 'custom-layout' }), 'utf8');
    await writeFile(join(customRunDir, 'runner.ndjson'), '{"event":"custom-layout"}\n', 'utf8');
    const requestedManifestPath = await makeManifestForTask(sandbox, 'requested-task', 'in-band-fallback');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      CODEX_ORCHESTRATOR_RUN_DIR: customRunDir
    }, ['--task', 'requested-task', '--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const selectedPromptPath = join(customRunDir, 'review', 'prompt.txt');
    const selectedPrompt = await readFile(selectedPromptPath, 'utf8');
    expect(selectedPrompt).toContain('Evidence manifest: custom-review-runs/orchestrator-run/manifest.json');
    expect(selectedPrompt).toContain('Review task: requested-task');
    const fallbackPromptPath = join(dirname(requestedManifestPath), 'review', 'prompt.txt');
    await expect(readFile(fallbackPromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('derives audit task context from the resolved run-dir manifest when task env is absent', async () => {
    const sandbox = await makeSandbox();
    const activeManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'run-dir-active');
    const codexBin = await makeFakeCodex(sandbox);
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await mkdir(join(sandbox, 'docs'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', 'tasks-sample-task.md'),
      [
        '# Task Checklist - sample-task',
        '',
        '- MCP Task ID: `sample-task`',
        '- Primary PRD: `docs/PRD-sample-task.md`',
        '- TECH_SPEC: `tasks/specs/sample-task.md`',
        '- ACTION_PLAN: `docs/ACTION_PLAN-sample-task.md`',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(sandbox, 'docs', 'PRD-sample-task.md'),
      ['# PRD', '', '## Summary', '', '- run-dir context bullet', ''].join('\n'),
      'utf8'
    );

    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      CODEX_ORCHESTRATOR_RUN_DIR: dirname(activeManifestPath)
    }, ['--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(activeManifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review task: sample-task');
    expect(prompt).toContain('Task context:');
    expect(prompt).toContain('- Task checklist: `tasks/tasks-sample-task.md`');
    expect(prompt).toContain('- Primary PRD: `docs/PRD-sample-task.md`');
    expect(prompt).not.toContain('PRD summary (`docs/PRD-sample-task.md`):');
    expect(prompt).not.toContain('- run-dir context bullet');
    expect(prompt).not.toContain('tasks/specs/sample-task.md');
    expect(prompt).not.toContain('docs/ACTION_PLAN-sample-task.md');
  });

  it('keeps audit task context checklist-only when no primary PRD is declared', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifestForTask(sandbox, 'sample-task', 'audit-no-prd');
    const codexBin = await makeFakeCodex(sandbox);
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', 'tasks-sample-task.md'),
      [
        '# Task Checklist - sample-task',
        '',
        '- MCP Task ID: `sample-task`',
        '- TECH_SPEC: `tasks/specs/sample-task.md`',
        '- ACTION_PLAN: `docs/ACTION_PLAN-sample-task.md`',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = await runReviewCommand(
      manifestPath,
      baseEnv(sandbox, codexBin),
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Task context:');
    expect(prompt).toContain('- Task checklist: `tasks/tasks-sample-task.md`');
    expect(prompt).not.toContain('- Primary PRD:');
    expect(prompt).not.toContain('tasks/specs/sample-task.md');
    expect(prompt).not.toContain('docs/ACTION_PLAN-sample-task.md');
  });

  it('derives audit task context from the registered parent task for delegated scout manifests', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifestForTask(sandbox, '1097-sample-task-scout', 'audit-scout');
    const codexBin = await makeFakeCodex(sandbox);
    await mkdir(join(sandbox, 'tasks', 'custom'), { recursive: true });
    await mkdir(join(sandbox, 'docs'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '20260310-1097-sample-task',
            title: 'Sample Task',
            relates_to: 'tasks/custom/registered-parent-checklist.md'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(sandbox, 'tasks', 'custom', 'registered-parent-checklist.md'),
      [
        '# Task Checklist - 1097-sample-task',
        '',
        '- MCP Task ID: `1097-sample-task`',
        '- Primary PRD: `docs/PRD-sample-task.md`',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(join(sandbox, 'docs', 'PRD-sample-task.md'), '# PRD\n', 'utf8');

    const result = await runReviewCommand(
      manifestPath,
      baseEnv(sandbox, codexBin),
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review task: 1097-sample-task-scout');
    expect(prompt).toContain('Task context:');
    expect(prompt).toContain('- Task checklist: `tasks/custom/registered-parent-checklist.md`');
    expect(prompt).toContain('- Primary PRD: `docs/PRD-sample-task.md`');
  });

  it('ignores legacy task index path entries that are not checklist paths', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifestForTask(
      sandbox,
      '0202-prd-orchestrator-hardening-scout',
      'audit-legacy-path'
    );
    const codexBin = await makeFakeCodex(sandbox);
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '0202',
            slug: 'prd-orchestrator-hardening',
            path: 'tasks/0202-prd-orchestrator-hardening.md'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(sandbox, 'tasks', '0202-prd-orchestrator-hardening.md'),
      '# PRD Snapshot - legacy entry\n',
      'utf8'
    );

    const result = await runReviewCommand(
      manifestPath,
      baseEnv(sandbox, codexBin),
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);
    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Review task: 0202-prd-orchestrator-hardening-scout');
    expect(prompt).not.toContain('Task context:');
    expect(prompt).not.toContain('tasks/0202-prd-orchestrator-hardening.md');
  });

  it('keeps review artifacts aligned with the resolved manifest when CODEX_ORCHESTRATOR_RUN_DIR is stale', async () => {
    const sandbox = await makeSandbox();
    const staleRunManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'stale-run-dir');
    const activeManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'active-manifest');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'sample-task',
      CODEX_ORCHESTRATOR_MANIFEST_PATH: activeManifestPath,
      CODEX_ORCHESTRATOR_RUN_DIR: dirname(staleRunManifestPath)
    }, ['--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const activePromptPath = join(dirname(activeManifestPath), 'review', 'prompt.txt');
    const stalePromptPath = join(dirname(staleRunManifestPath), 'review', 'prompt.txt');
    const activePrompt = await readFile(activePromptPath, 'utf8');
    expect(activePrompt).toContain('Evidence manifest: .runs/sample-task/cli/active-manifest/manifest.json');
    await expect(readFile(stalePromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rebases provider-worker explicit manifest and inherited run-dir envs to issue workspace artifacts', async () => {
    const sharedRoot = await mkdtemp(join(process.cwd(), '.tmp-run-review-provider-'));
    createdSandboxes.push(sharedRoot);
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(sharedRoot, '.workspaces', taskId);
    const sharedManifestPath = await makeManifestForTask(sharedRoot, taskId, 'provider-parent-run');
    const workspaceManifestPath = await makeManifestForTask(
      issueWorkspacePath,
      taskId,
      'provider-parent-run'
    );
    const codexBin = await makeFakeCodex(sharedRoot);
    const envLogPath = join(sharedRoot, 'review-env.log');

    const result = await runReviewCommandSubprocess(
      null,
      {
        ...baseEnv(sharedRoot, codexBin),
        MCP_RUNNER_TASK_ID: 'stale-linear-issue',
        CODEX_ORCHESTRATOR_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
        CODEX_ORCHESTRATOR_RUN_DIR: dirname(sharedManifestPath),
        CODEX_ORCHESTRATOR_RUNS_DIR: join(sharedRoot, '.runs'),
        CODEX_ORCHESTRATOR_OUT_DIR: join(sharedRoot, 'out'),
        CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS: '1',
        CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON:
          'provider artifact-root fixture; review large-scope gate is validated separately',
        DIFF_BUDGET_OVERRIDE_REASON: 'provider artifact-root fixture; diff budget is validated separately',
        RUN_REVIEW_ENV_LOG: envLogPath
      },
      ['--manifest', relative(sharedRoot, sharedManifestPath), '--surface', 'audit'],
      issueWorkspacePath
    );

    expect(result.exitCode).toBe(0);
    const workspacePromptPath = join(dirname(workspaceManifestPath), 'review', 'prompt.txt');
    const sharedPromptPath = join(dirname(sharedManifestPath), 'review', 'prompt.txt');
    const workspacePrompt = await readFile(workspacePromptPath, 'utf8');
    expect(workspacePrompt).toContain(
      'Evidence manifest: .runs/linear-lin-issue-1/cli/provider-parent-run/manifest.json'
    );
    const reviewEnvLog = await readFile(envLogPath, 'utf8');
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_ROOT=${issueWorkspacePath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_MANIFEST_PATH=${workspaceManifestPath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUN_DIR=${dirname(workspaceManifestPath)}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUNS_DIR=${join(issueWorkspacePath, '.runs')}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_OUT_DIR=${join(issueWorkspacePath, 'out')}`);
    expect(reviewEnvLog).toContain('CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS=1');
    expect(reviewEnvLog).toContain(`MANIFEST=${workspaceManifestPath}`);
    await expect(readFile(sharedPromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rebases provider-worker explicit manifest from configured runs layout roots to issue workspace artifacts', async () => {
    const sharedRoot = await mkdtemp(join(process.cwd(), '.tmp-run-review-provider-'));
    createdSandboxes.push(sharedRoot);
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(sharedRoot, '.workspaces', taskId);
    const sharedRunDir = join(sharedRoot, 'runs', taskId, 'cli', 'provider-parent-run');
    const workspaceRunDir = join(issueWorkspacePath, 'runs', taskId, 'cli', 'provider-parent-run');
    const sharedManifestPath = join(sharedRunDir, 'manifest.json');
    const workspaceManifestPath = join(workspaceRunDir, 'manifest.json');
    await mkdir(sharedRunDir, { recursive: true });
    await mkdir(workspaceRunDir, { recursive: true });
    await writeFile(sharedManifestPath, JSON.stringify({ run: 'shared' }), 'utf8');
    await writeFile(join(sharedRunDir, 'runner.ndjson'), '{"event":"shared"}\n', 'utf8');
    await writeFile(workspaceManifestPath, JSON.stringify({ run: 'workspace' }), 'utf8');
    await writeFile(join(workspaceRunDir, 'runner.ndjson'), '{"event":"workspace"}\n', 'utf8');
    const codexBin = await makeFakeCodex(sharedRoot);
    const envLogPath = join(sharedRoot, 'review-env-runs-layout.log');

    const result = await runReviewCommandSubprocess(
      null,
      {
        ...baseEnv(sharedRoot, codexBin),
        MCP_RUNNER_TASK_ID: 'stale-linear-issue',
        CODEX_ORCHESTRATOR_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
        CODEX_ORCHESTRATOR_RUN_DIR: dirname(sharedManifestPath),
        CODEX_ORCHESTRATOR_RUNS_DIR: join(sharedRoot, 'runs'),
        CODEX_ORCHESTRATOR_OUT_DIR: join(sharedRoot, 'out'),
        CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS: '1',
        CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON: 'provider artifact-root fixture; large-scope gate is tested separately',
        RUN_REVIEW_ENV_LOG: envLogPath
      },
      ['--manifest', relative(sharedRoot, sharedManifestPath), '--surface', 'audit'],
      issueWorkspacePath
    );

    expect(result.exitCode).toBe(0);
    const workspacePromptPath = join(dirname(workspaceManifestPath), 'review', 'prompt.txt');
    await expect(readFile(workspacePromptPath, 'utf8')).resolves.toContain(
      'Evidence manifest: runs/linear-lin-issue-1/cli/provider-parent-run/manifest.json'
    );
    const reviewEnvLog = await readFile(envLogPath, 'utf8');
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_ROOT=${issueWorkspacePath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_MANIFEST_PATH=${workspaceManifestPath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUN_DIR=${dirname(workspaceManifestPath)}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUNS_DIR=${join(issueWorkspacePath, 'runs')}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_OUT_DIR=${join(issueWorkspacePath, 'out')}`);
    expect(reviewEnvLog).toContain('CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS=1');
    expect(reviewEnvLog).toContain(`MANIFEST=${workspaceManifestPath}`);
  });

  it('rebases provider-worker manifests selected from configured absolute runs-dir roots to issue workspace artifacts', async () => {
    const sharedRoot = await mkdtemp(join(process.cwd(), '.tmp-run-review-provider-'));
    createdSandboxes.push(sharedRoot);
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(sharedRoot, '.workspaces', taskId);
    const sharedRunsRoot = join(sharedRoot, 'artifacts', 'runs');
    const sharedOutRoot = join(sharedRoot, 'artifacts', 'out');
    const workspaceRunsRoot = join(issueWorkspacePath, 'artifacts', 'runs');
    const workspaceOutRoot = join(issueWorkspacePath, 'artifacts', 'out');
    const sharedRunDir = join(sharedRunsRoot, taskId, 'cli', 'provider-parent-run');
    const workspaceRunDir = join(workspaceRunsRoot, taskId, 'cli', 'provider-parent-run');
    const sharedManifestPath = join(sharedRunDir, 'manifest.json');
    const workspaceManifestPath = join(workspaceRunDir, 'manifest.json');
    await mkdir(sharedRunDir, { recursive: true });
    await mkdir(workspaceRunDir, { recursive: true });
    await writeFile(sharedManifestPath, JSON.stringify({ run: 'shared' }), 'utf8');
    await writeFile(join(sharedRunDir, 'runner.ndjson'), '{"event":"shared"}\n', 'utf8');
    await writeFile(workspaceManifestPath, JSON.stringify({ run: 'workspace' }), 'utf8');
    await writeFile(join(workspaceRunDir, 'runner.ndjson'), '{"event":"workspace"}\n', 'utf8');
    const codexBin = await makeFakeCodex(sharedRoot);
    const envLogPath = join(sharedRoot, 'review-env-custom-runs-dir.log');

    const result = await runReviewCommandSubprocess(
      null,
      {
        ...baseEnv(sharedRoot, codexBin),
        MCP_RUNNER_TASK_ID: 'stale-linear-issue',
        CODEX_ORCHESTRATOR_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
        CODEX_ORCHESTRATOR_RUNS_DIR: sharedRunsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: sharedOutRoot,
        CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS: '1',
        CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON: 'provider artifact-root fixture; large-scope gate is tested separately',
        RUN_REVIEW_ENV_LOG: envLogPath
      },
      ['--runs-dir', sharedRunsRoot, '--surface', 'audit'],
      issueWorkspacePath
    );

    expect(result.exitCode).toBe(0);
    const workspacePromptPath = join(workspaceRunDir, 'review', 'prompt.txt');
    const sharedPromptPath = join(sharedRunDir, 'review', 'prompt.txt');
    await expect(readFile(workspacePromptPath, 'utf8')).resolves.toContain(
      'Evidence manifest: artifacts/runs/linear-lin-issue-1/cli/provider-parent-run/manifest.json'
    );
    const reviewEnvLog = await readFile(envLogPath, 'utf8');
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_ROOT=${issueWorkspacePath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_MANIFEST_PATH=${workspaceManifestPath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUN_DIR=${workspaceRunDir}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUNS_DIR=${workspaceRunsRoot}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_OUT_DIR=${workspaceOutRoot}`);
    expect(reviewEnvLog).toContain('CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS=1');
    expect(reviewEnvLog).toContain(`MANIFEST=${workspaceManifestPath}`);
    await expect(readFile(sharedPromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps default out root when only provider-worker runs-dir is configured', async () => {
    const sharedRoot = await mkdtemp(join(process.cwd(), '.tmp-run-review-provider-'));
    createdSandboxes.push(sharedRoot);
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(sharedRoot, '.workspaces', taskId);
    const sharedRunsRoot = join(sharedRoot, 'artifacts', 'runs');
    const workspaceRunsRoot = join(issueWorkspacePath, 'artifacts', 'runs');
    const sharedRunDir = join(sharedRunsRoot, taskId, 'cli', 'provider-parent-run');
    const workspaceRunDir = join(workspaceRunsRoot, taskId, 'cli', 'provider-parent-run');
    const sharedManifestPath = join(sharedRunDir, 'manifest.json');
    const workspaceManifestPath = join(workspaceRunDir, 'manifest.json');
    await mkdir(sharedRunDir, { recursive: true });
    await mkdir(workspaceRunDir, { recursive: true });
    await writeFile(sharedManifestPath, JSON.stringify({ run: 'shared' }), 'utf8');
    await writeFile(join(sharedRunDir, 'runner.ndjson'), '{"event":"shared"}\n', 'utf8');
    await writeFile(workspaceManifestPath, JSON.stringify({ run: 'workspace' }), 'utf8');
    await writeFile(join(workspaceRunDir, 'runner.ndjson'), '{"event":"workspace"}\n', 'utf8');
    const codexBin = await makeFakeCodex(sharedRoot);
    const envLogPath = join(sharedRoot, 'review-env-custom-runs-default-out.log');

    const result = await runReviewCommandSubprocess(
      null,
      {
        ...baseEnv(sharedRoot, codexBin),
        MCP_RUNNER_TASK_ID: 'stale-linear-issue',
        CODEX_ORCHESTRATOR_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
        CODEX_ORCHESTRATOR_RUNS_DIR: sharedRunsRoot,
        CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS: '1',
        CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON: 'provider artifact-root fixture; large-scope gate is tested separately',
        RUN_REVIEW_ENV_LOG: envLogPath
      },
      ['--runs-dir', sharedRunsRoot, '--surface', 'audit'],
      issueWorkspacePath
    );

    expect(result.exitCode).toBe(0);
    const reviewEnvLog = await readFile(envLogPath, 'utf8');
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_ROOT=${issueWorkspacePath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_MANIFEST_PATH=${workspaceManifestPath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUNS_DIR=${workspaceRunsRoot}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_OUT_DIR=${join(issueWorkspacePath, 'out')}`);
    expect(reviewEnvLog).toContain(`MANIFEST=${workspaceManifestPath}`);
  });

  it('keeps inherited provider-worker manifest envs on the real shared manifest when no workspace counterpart exists', async () => {
    const sharedRoot = await mkdtemp(join(process.cwd(), '.tmp-run-review-provider-'));
    createdSandboxes.push(sharedRoot);
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(sharedRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    const sharedManifestPath = await makeManifestForTask(sharedRoot, taskId, 'provider-parent-run');
    const codexBin = await makeFakeCodex(sharedRoot);
    const envLogPath = join(sharedRoot, 'review-env-no-counterpart.log');

    const result = await runReviewCommandSubprocess(
      null,
      {
        ...baseEnv(sharedRoot, codexBin),
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
        CODEX_ORCHESTRATOR_MANIFEST_PATH: sharedManifestPath,
        CODEX_ORCHESTRATOR_RUN_DIR: dirname(sharedManifestPath),
        CODEX_ORCHESTRATOR_RUNS_DIR: join(sharedRoot, '.runs'),
        CODEX_ORCHESTRATOR_OUT_DIR: join(sharedRoot, 'out'),
        CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON:
          'provider artifact-root fixture; review large-scope gate is validated separately',
        DIFF_BUDGET_OVERRIDE_REASON: 'provider artifact-root fixture; diff budget is validated separately',
        RUN_REVIEW_ENV_LOG: envLogPath
      },
      ['--surface', 'audit'],
      issueWorkspacePath
    );

    expect(result.exitCode).toBe(0);
    const sharedPromptPath = join(dirname(sharedManifestPath), 'review', 'prompt.txt');
    const workspacePromptPath = join(
      issueWorkspacePath,
      '.runs',
      taskId,
      'cli',
      'provider-parent-run',
      'review',
      'prompt.txt'
    );
    const sharedPrompt = await readFile(sharedPromptPath, 'utf8');
    expect(sharedPrompt).toContain(
      'Evidence manifest: ../../.runs/linear-lin-issue-1/cli/provider-parent-run/manifest.json'
    );
    const reviewEnvLog = await readFile(envLogPath, 'utf8');
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_ROOT=${issueWorkspacePath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_MANIFEST_PATH=${sharedManifestPath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUN_DIR=${dirname(sharedManifestPath)}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUNS_DIR=${join(sharedRoot, '.runs')}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_OUT_DIR=${join(issueWorkspacePath, 'out')}`);
    expect(reviewEnvLog).toContain('CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS=1');
    expect(reviewEnvLog).toContain(`MANIFEST=${sharedManifestPath}`);
    await expect(readFile(workspacePromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps explicit relative provider-worker runs-dir on the real shared manifest without a workspace counterpart', async () => {
    const sharedRoot = await mkdtemp(join(process.cwd(), '.tmp-run-review-provider-'));
    createdSandboxes.push(sharedRoot);
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(sharedRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    await mkdir(join(issueWorkspacePath, '.runs'), { recursive: true });
    const sharedManifestPath = await makeManifestForTask(sharedRoot, taskId, 'provider-parent-run');
    const codexBin = await makeFakeCodex(sharedRoot);
    const envLogPath = join(sharedRoot, 'review-env-relative-no-counterpart.log');

    const result = await runReviewCommandSubprocess(
      null,
      {
        ...baseEnv(sharedRoot, codexBin),
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
        CODEX_ORCHESTRATOR_RUNS_DIR: '.runs',
        CODEX_ORCHESTRATOR_OUT_DIR: 'out',
        CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON:
          'provider artifact-root fixture; review large-scope gate is validated separately',
        DIFF_BUDGET_OVERRIDE_REASON: 'provider artifact-root fixture; diff budget is validated separately',
        RUN_REVIEW_ENV_LOG: envLogPath
      },
      ['--runs-dir', '.runs', '--surface', 'audit'],
      issueWorkspacePath
    );

    expect(result.exitCode).toBe(0);
    const sharedPromptPath = join(dirname(sharedManifestPath), 'review', 'prompt.txt');
    const workspacePromptPath = join(
      issueWorkspacePath,
      '.runs',
      taskId,
      'cli',
      'provider-parent-run',
      'review',
      'prompt.txt'
    );
    await expect(readFile(sharedPromptPath, 'utf8')).resolves.toContain(
      'Evidence manifest: ../../.runs/linear-lin-issue-1/cli/provider-parent-run/manifest.json'
    );
    const reviewEnvLog = await readFile(envLogPath, 'utf8');
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_ROOT=${issueWorkspacePath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_MANIFEST_PATH=${sharedManifestPath}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUN_DIR=${dirname(sharedManifestPath)}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_RUNS_DIR=${join(sharedRoot, '.runs')}`);
    expect(reviewEnvLog).toContain(`CODEX_ORCHESTRATOR_OUT_DIR=${join(issueWorkspacePath, 'out')}`);
    expect(reviewEnvLog).toContain('CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS=1');
    expect(reviewEnvLog).toContain(`MANIFEST=${sharedManifestPath}`);
    await expect(readFile(workspacePromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('ignores CODEX_ORCHESTRATOR_RUN_DIR when --task requests a different task', async () => {
    const sandbox = await makeSandbox();
    const staleRunManifestPath = await makeManifestForTask(sandbox, 'stale-task', 'stale-run-dir');
    const requestedManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'requested-task-active');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      CODEX_ORCHESTRATOR_RUN_DIR: dirname(staleRunManifestPath)
    }, ['--task', 'sample-task', '--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const requestedPromptPath = join(dirname(requestedManifestPath), 'review', 'prompt.txt');
    const stalePromptPath = join(dirname(staleRunManifestPath), 'review', 'prompt.txt');
    const requestedPrompt = await readFile(requestedPromptPath, 'utf8');
    expect(requestedPrompt).toContain(
      'Evidence manifest: .runs/sample-task/cli/requested-task-active/manifest.json'
    );
    await expect(readFile(stalePromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('ignores CODEX_ORCHESTRATOR_RUN_DIR when MCP_RUNNER_TASK_ID requests a different task', async () => {
    const sandbox = await makeSandbox();
    const staleRunManifestPath = await makeManifestForTask(sandbox, 'stale-task', 'stale-run-dir');
    const requestedManifestPath = await makeManifestForTask(sandbox, 'sample-task', 'env-task-active');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'sample-task',
      CODEX_ORCHESTRATOR_RUN_DIR: dirname(staleRunManifestPath)
    }, ['--surface', 'audit']);

    expect(result.exitCode).toBe(0);
    const requestedPromptPath = join(dirname(requestedManifestPath), 'review', 'prompt.txt');
    const stalePromptPath = join(dirname(staleRunManifestPath), 'review', 'prompt.txt');
    const requestedPrompt = await readFile(requestedPromptPath, 'utf8');
    expect(requestedPrompt).toContain('Evidence manifest: .runs/sample-task/cli/env-task-active/manifest.json');
    await expect(readFile(stalePromptPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails fast when delegation startup loops without review progress', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delegation-loop',
      CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '2',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review appears stuck in delegation startup loop');
    expect(result.stderr).toContain('termination boundary: startup-loop (delegation-startup-loop).');
    expect(result.stderr).toContain('Review output log (partial):');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'startup-loop',
        provenance: 'delegation-startup-loop',
        reason: expect.stringContaining('codex review appears stuck in delegation startup loop'),
        sample: null
      })
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('still detects startup loops when non-progress banner lines appear before the loop', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delegation-loop-with-banner',
      CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '2',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review appears stuck in delegation startup loop');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('detects startup loops when startup lines span multiple output chunks', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delegation-loop-fragmented',
      CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '2',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review appears stuck in delegation startup loop');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('does not merge startup-loop fragments across stdout/stderr streams', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delegation-loop-cross-stream-fragmented',
      CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('delegation startup loop');
    expect(result.stderr).toContain('termination boundary: timeout (review-timeout).');
    expect(result.stderr).toContain('Review output log (partial):');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
    };
    expect(telemetry.termination_boundary).toEqual({
      kind: 'timeout',
      provenance: 'review-timeout',
      reason:
        'codex review timed out after 1s (set CODEX_REVIEW_TIMEOUT_SECONDS=0 to disable).',
      sample: null
    });
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review when repetitive low-signal inspection persists', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'low-signal-drift',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('low-signal review drift detected');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        commandStarts: string[];
        heavyCommandStarts: string[];
        thinkingBlocks: number;
        distinctInspectionTargets: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.commandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts).toEqual([]);
    expect(telemetry.summary.thinkingBlocks).toBeGreaterThan(0);
    expect(telemetry.summary.distinctInspectionTargets).toBeLessThanOrEqual(4);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('successfully bounds diff review when repetitive relevant reinspection persists without concrete findings after startup anchor', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-dwell',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      '[run-review] review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure; semantic review verdict: unknown.'
    );

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      review_outcome: ReviewOutcomeDisposition;
      review_verdict: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        startupAnchorObserved: boolean;
        distinctInspectionTargets: number;
        maxInspectionTargetHits: number;
        metaSurfaceSignals: number;
        concreteOutputSignals: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.review_outcome).toBe('bounded-success');
    expect(telemetry.review_verdict).toBe('unknown');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'relevant-reinspection-dwell',
        provenance: 'post-startup-anchor'
      })
    );
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.distinctInspectionTargets).toBe(1);
    expect(telemetry.summary.maxInspectionTargetHits).toBeGreaterThanOrEqual(3);
    expect(telemetry.summary.metaSurfaceSignals).toBe(0);
    expect(telemetry.summary.concreteOutputSignals).toBe(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('keeps thread-not-found rollout-item review log noise non-blocking when telemetry succeeds', async () => {
    const cleanSandbox = await makeSandbox();
    const cleanManifestPath = await makeManifest(cleanSandbox);
    const cleanCodexBin = await makeFakeCodex(cleanSandbox);
    const cleanResult = await runReviewCommand(cleanManifestPath, {
      ...baseEnv(cleanSandbox, cleanCodexBin),
      RUN_REVIEW_MODE: 'thread-not-found-noise-ok'
    });

    expect(cleanResult.exitCode).toBe(0);
    expect(cleanResult.stdout).toContain(
      '[run-review] review outcome: clean success; semantic review verdict: unknown.'
    );
    const cleanOutputLogPath = join(dirname(cleanManifestPath), 'review', 'output.log');
    const cleanOutputLog = await readFile(cleanOutputLogPath, 'utf8');
    expect(cleanOutputLog).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
    const cleanTelemetryPath = join(dirname(cleanManifestPath), 'review', 'telemetry.json');
    const cleanTelemetry = JSON.parse(await readFile(cleanTelemetryPath, 'utf8')) as {
      status: string;
      review_outcome: ReviewOutcomeDisposition;
      review_verdict: string;
      error: string | null;
    };
    expect(cleanTelemetry.status).toBe('succeeded');
    expect(cleanTelemetry.review_outcome).toBe('clean-success');
    expect(cleanTelemetry.review_verdict).toBe('unknown');
    expect(cleanTelemetry.error).toBeNull();

    const boundedSandbox = await makeSandbox();
    const boundedManifestPath = await makeManifest(boundedSandbox);
    await initGitRepoWithTouchedPath(boundedSandbox, 'file-1.py');
    const boundedCodexBin = await makeFakeCodex(boundedSandbox);
    const boundedResult = await runReviewCommand(boundedManifestPath, {
      ...baseEnv(boundedSandbox, boundedCodexBin),
      RUN_REVIEW_MODE: 'thread-not-found-noise-bounded',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(boundedResult.exitCode).toBe(0);
    expect(boundedResult.stdout).toContain(
      '[run-review] review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure; semantic review verdict: unknown.'
    );
    const boundedOutputLogPath = join(dirname(boundedManifestPath), 'review', 'output.log');
    const boundedOutputLog = await readFile(boundedOutputLogPath, 'utf8');
    expect(boundedOutputLog).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
    const boundedTelemetryPath = join(dirname(boundedManifestPath), 'review', 'telemetry.json');
    const boundedTelemetry = JSON.parse(await readFile(boundedTelemetryPath, 'utf8')) as {
      status: string;
      review_outcome: ReviewOutcomeDisposition;
      review_verdict: string;
      error: string | null;
      termination_boundary: {
        kind: string;
        provenance: string;
      } | null;
    };
    expect(boundedTelemetry.status).toBe('succeeded');
    expect(boundedTelemetry.review_outcome).toBe('bounded-success');
    expect(boundedTelemetry.review_verdict).toBe('unknown');
    expect(boundedTelemetry.error).toBeNull();
    expect(boundedTelemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'relevant-reinspection-dwell',
        provenance: 'post-startup-anchor'
      })
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('does not classify thread-not-found rollout-item review log noise as success when telemetry fails', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'thread-not-found-noise-nonzero'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain(
      '[run-review] review outcome: review command failed without termination-boundary classification; not an explicit wrapper-boundary failure; semantic review verdict: unknown.'
    );
    const outputLogPath = join(dirname(manifestPath), 'review', 'output.log');
    const outputLog = await readFile(outputLogPath, 'utf8');
    expect(outputLog).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      review_outcome: ReviewOutcomeDisposition;
      review_verdict: string;
      error: string | null;
      termination_boundary: {
        kind: string;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.review_outcome).toBe('failed-other');
    expect(telemetry.review_verdict).toBe('unknown');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.termination_boundary).toBeNull();
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails when a bounded success stop is followed by a non-zero review exit', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-dwell-term-nonzero',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded success stop');
    expect(result.stderr).toContain('termination boundary: relevant-reinspection-dwell (post-startup-anchor).');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      review_outcome: ReviewOutcomeDisposition;
      error: string | null;
      termination_boundary: {
        kind: string;
        provenance: string;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.review_outcome).toBe('failed-boundary');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'relevant-reinspection-dwell',
        provenance: 'post-startup-anchor'
      })
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails when a heavy command appears during bounded-success shutdown', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-dwell-heavy-term-nonzero',
      CODEX_REVIEW_ENFORCE_BOUNDED_MODE: '1',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review attempted heavy command in bounded mode');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      termination_boundary: {
        kind: string;
        provenance: string;
      } | null;
      summary: {
        heavyCommandStarts: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.termination_boundary).toBeNull();
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('preserves a bounded success stop when shutdown is slower than a later stall poll', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-dwell-slow-term-exit',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '0.05',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0.1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
      } | null;
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'relevant-reinspection-dwell',
        provenance: 'post-startup-anchor'
      })
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails when meta-surface expansion appears during bounded-success shutdown', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-dwell-meta-surface-term-success',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '0.05',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '0.2',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');
    expect(result.stderr).toContain('termination boundary: meta-surface-expansion');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      termination_boundary: {
        kind: string;
        provenance: string;
      } | null;
      summary: {
        metaSurfaceSignals: number;
        metaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toBeTruthy();
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'meta-surface-expansion',
        provenance: 'meta-surface-kinds'
      })
    );
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.metaSurfaceKinds).toEqual(
      expect.arrayContaining(['codex-memories', 'review-support'])
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails when verdict-stability drift is already active alongside post-startup relevant reinspection', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-verdict-drift',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '0.05',
      CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS: '0.05',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('verdict-stability drift detected');
    expect(result.stderr).toContain('termination boundary: verdict-stability');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'verdict-stability'
      })
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('preserves relevant dwell termination provenance when the review exits naturally before the poller fires', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-dwell-fast-exit',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '0.05',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'relevant-reinspection-dwell',
        provenance: 'post-startup-anchor'
      })
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows bounded review to complete when relevant reinspection produces concrete findings', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-concrete-output',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        concreteOutputSignals: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.concreteOutputSignals).toBeGreaterThan(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows bounded review to complete when relevant inspection stays diverse across targets', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 5, '.py');
    await writeFile(join(sandbox, 'file-1.py'), 'updated\n', 'utf8');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-diverse',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        distinctInspectionTargets: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.distinctInspectionTargets).toBeGreaterThan(4);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('disables the relevant reinspection dwell boundary when low-signal timeout is off', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await initGitRepoWithTouchedPath(sandbox, 'file-1.py');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'relevant-reinspection-dwell',
      CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).not.toContain('relevant-reinspection dwell boundary violated');
    expect(result.stderr).toContain('codex review timed out after 1s');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded architecture review when in-bounds rereads keep revisiting canonical docs and touched files without a verdict', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await writeTaskDocsFirstContext(sandbox, 'sample-task', { includeArchitectureBaseline: true });
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 2, '.py');
    const architectureRelevantTargets = [
      'tasks/tasks-sample-task.md',
      'docs/PRD-sample-task.md',
      'tasks/specs/sample-task.md',
      'docs/ACTION_PLAN-sample-task.md',
      '.agent/system/architecture.md',
      files[0] ?? 'file-1.py',
      files[1] ?? 'file-2.py'
    ];
    await writeFile(join(sandbox, files[0] ?? 'file-1.py'), 'updated-1\n', 'utf8');
    await writeFile(join(sandbox, files[1] ?? 'file-2.py'), 'updated-2\n', 'utf8');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'architecture-relevant-reinspection-dwell',
        CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '1',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_TIMEOUT_SECONDS: '60'
      },
      ['--task', 'sample-task', '--surface', 'architecture']
    );

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('relevant-reinspection dwell boundary violated');
    expect(result.stderr).toContain('within the current bounded review surface');
    expect(result.stderr).toContain(
      'termination boundary: relevant-reinspection-dwell (bounded-surface).'
    );
    expect(result.stderr).not.toContain('codex review timed out after');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        metaSurfaceSignals: number;
        distinctInspectionTargets: number;
        maxInspectionTargetHits: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'relevant-reinspection-dwell',
        provenance: 'bounded-surface',
        reason: expect.stringContaining('relevant-reinspection dwell boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain(
      '[redacted relevant-reinspection-dwell sample'
    );
    expect(telemetry.summary.metaSurfaceSignals).toBe(0);
    expect(telemetry.summary.distinctInspectionTargets).toBeLessThanOrEqual(
      architectureRelevantTargets.length
    );
    expect(telemetry.summary.maxInspectionTargetHits).toBeGreaterThanOrEqual(2);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review when speculative output keeps repeating without new concrete progress', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'verdict-stability-drift',
      CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('verdict-stability drift detected');
    expect(result.stderr).toContain(
      'termination boundary: verdict-stability (repeated-output-inspection).'
    );
    expect(result.stderr).not.toContain('Review output log (partial):');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        outputInspectionSignals: number;
        distinctOutputInspectionTargets: number;
        maxOutputNarrativeSignatureHits: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual({
      kind: 'verdict-stability',
      provenance: 'repeated-output-inspection',
      reason: expect.stringContaining('verdict-stability drift detected'),
      sample: null
    });
    expect(telemetry.summary.outputInspectionSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.distinctOutputInspectionTargets).toBeLessThanOrEqual(4);
    expect(telemetry.summary.maxOutputNarrativeSignatureHits).toBeGreaterThanOrEqual(2);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('clears verdict-stability timeout env from shared wrapper test setup', async () => {
    const sandbox = await makeSandbox();
    const codexBin = await makeFakeCodex(sandbox);
    const previous = process.env.CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS;
    process.env.CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS = '99';
    try {
      const env = baseEnv(sandbox, codexBin);
      expect(env.CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS).toBeUndefined();
    } finally {
      if (previous === undefined) {
        delete process.env.CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS;
      } else {
        process.env.CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS = previous;
      }
    }
  });

  it('fails bounded review when repeated targetless speculative output persists without concrete findings', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'generic-speculative-dwell',
      CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('verdict-stability drift detected');
    expect(result.stderr).toContain(
      'termination boundary: verdict-stability (targetless-speculative-narrative).'
    );

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        outputInspectionSignals: number;
        outputNarrativeSignals: number;
        distinctOutputInspectionTargets: number;
        maxOutputNarrativeSignatureHits: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual({
      kind: 'verdict-stability',
      provenance: 'targetless-speculative-narrative',
      reason: expect.stringContaining('verdict-stability drift detected'),
      sample: null
    });
    expect(telemetry.summary.outputInspectionSignals).toBe(0);
    expect(telemetry.summary.outputNarrativeSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.distinctOutputInspectionTargets).toBe(0);
    expect(telemetry.summary.maxOutputNarrativeSignatureHits).toBeGreaterThanOrEqual(2);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('disables verdict-stability termination when CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=0', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'verdict-stability-drift',
      CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('verdict-stability drift detected');
    expect(result.stderr).not.toContain(
      'termination boundary: verdict-stability (repeated-output-inspection).'
    );

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual({
      kind: 'timeout',
      provenance: 'review-timeout',
      reason:
        'codex review timed out after 1s (set CODEX_REVIEW_TIMEOUT_SECONDS=0 to disable).',
      sample: null
    });
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows bounded review to complete when speculative output keeps introducing new concrete targets', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'verdict-stability-progress',
      CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        distinctOutputInspectionTargets: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.distinctOutputInspectionTargets).toBeGreaterThan(4);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows bounded review to stay diff-local when the concrete-progress citation contract is explicit', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'citation-contract-local',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '10'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain('timed out');

    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain(
      'Concrete same-diff progress can be shown by citing touched paths with explicit locations'
    );
    expect(prompt).toContain(
      'do not search the wider repo for other examples of the rendering'
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review when meta-surface expansion persists', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'meta-surface-expansion-audit-unrelated',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');
    expect(result.stderr).toContain(
      'termination boundary: meta-surface-expansion (meta-surface-kinds).'
    );

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        commandStarts: string[];
        metaSurfaceSignals: number;
        distinctMetaSurfaces: number;
        maxMetaSurfaceHits: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'meta-surface-expansion',
        provenance: 'meta-surface-kinds',
        reason: expect.stringContaining('meta-surface expansion detected'),
        sample: expect.any(String)
      })
    );
    expect(telemetry.summary.commandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.distinctMetaSurfaces).toBeGreaterThanOrEqual(3);
    expect(telemetry.summary.maxMetaSurfaceHits).toBeGreaterThanOrEqual(1);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded diff review when repeated meta-surface reads happen before the first startup anchor', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await runGit(['init', '-q'], sandbox);
    await runGit(['config', 'user.email', 'run-review-tests@example.com'], sandbox);
    await runGit(['config', 'user.name', 'run-review-tests'], sandbox);
    await mkdir(join(sandbox, 'scripts'), { recursive: true });
    await writeFile(join(sandbox, 'scripts', 'run-review.ts'), 'export const version = 1;\n', 'utf8');
    await runGit(['add', '.'], sandbox);
    await runGit(['commit', '-m', 'seed'], sandbox);
    await writeFile(join(sandbox, 'scripts', 'run-review.ts'), 'export const version = 2;\n', 'utf8');

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'startup-anchor-drift',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('startup-anchor boundary violated');
    expect(result.stderr).toContain('before the first startup anchor');
    expect(result.stderr).toContain(
      'termination boundary: startup-anchor (pre-anchor-meta-surface).'
    );

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'startup-anchor',
        provenance: 'pre-anchor-meta-surface',
        reason: expect.stringContaining('startup-anchor boundary violated'),
        sample: expect.any(String)
      })
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded audit review when repeated off-surface reads happen before the first audit startup anchor', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'startup-anchor-drift',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    }, ['--surface', 'audit']);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stdout).toContain('startup-anchor boundary enabled for audit mode');
    expect(result.stderr).toContain('startup-anchor boundary violated');
    expect(result.stderr).toContain(
      'termination boundary: startup-anchor (pre-anchor-meta-surface).'
    );

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
        preAnchorMetaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'startup-anchor',
        provenance: 'pre-anchor-meta-surface',
        reason: expect.stringContaining('startup-anchor boundary violated'),
        sample: expect.any(String)
      })
    );
    expect(telemetry.summary.startupAnchorObserved).toBe(false);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBeGreaterThanOrEqual(2);
    expect(telemetry.summary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories']);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded diff review when adjacent review-system surfaces persist', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'review-self-containment-drift',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        metaSurfaceSignals: number;
        distinctMetaSurfaces: number;
        metaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.distinctMetaSurfaces).toBeGreaterThanOrEqual(3);
    expect(telemetry.summary.metaSurfaceKinds).toEqual(
      expect.arrayContaining(['review-artifacts', 'review-docs', 'review-support'])
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded diff review when repo-wide search results surface the active closeout bundle', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'active-closeout-self-reference-search',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');
    expect(result.stderr).toContain(
      'termination boundary: meta-surface-expansion (active-closeout-self-reference-search).'
    );

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        startupAnchorObserved: boolean;
        metaSurfaceSignals: number;
        metaSurfaceKinds: string[];
        preAnchorMetaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'meta-surface-expansion',
        provenance: 'active-closeout-self-reference-search',
        reason: expect.stringContaining('meta-surface expansion detected')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain(
      '[redacted meta-surface-expansion sample'
    );
    expect(telemetry.summary.startupAnchorObserved).toBe(false);
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.metaSurfaceKinds).toContain('review-closeout-bundle');
    expect(telemetry.summary.preAnchorMetaSurfaceKinds).toEqual([]);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('keeps mixed active closeout search drift on generic meta-surface provenance', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'active-closeout-self-reference-search-mixed',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');
    expect(result.stderr).toContain('termination boundary: meta-surface-expansion (meta-surface-kinds).');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        metaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'meta-surface-expansion',
        provenance: 'meta-surface-kinds',
        reason: expect.stringContaining('meta-surface expansion detected')
      })
    );
    expect(telemetry.summary.metaSurfaceKinds).toEqual(
      expect.arrayContaining(['review-artifacts', 'review-closeout-bundle', 'review-docs'])
    );
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded diff review promptly when post-anchor rereads hit the active closeout bundle', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    await initGitRepoWithTouchedPath(sandbox, 'file-1.txt');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'active-closeout-self-reference-reread',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('active-closeout-bundle reread boundary violated');
    expect(result.stderr).not.toContain('codex review timed out after');
    expect(result.stderr).toContain(
      'termination boundary: active-closeout-bundle-reread (post-startup-anchor).'
    );

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        startupAnchorObserved: boolean;
        metaSurfaceSignals: number;
        metaSurfaceKinds: string[];
        preAnchorMetaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'active-closeout-bundle-reread',
        provenance: 'post-startup-anchor',
        reason: expect.stringContaining('active-closeout-bundle reread boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain(
      '[redacted active-closeout-bundle-reread sample'
    );
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(2);
    expect(telemetry.summary.metaSurfaceKinds).toContain('review-closeout-bundle');
    expect(telemetry.summary.preAnchorMetaSurfaceKinds).toEqual([]);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('does not apply the closeout-bundle reread boundary when heavy review commands are explicitly allowed', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    await initGitRepoWithTouchedPath(sandbox, 'file-1.txt');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'active-closeout-self-reference-reread',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('active-closeout-bundle reread boundary violated');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        metaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.metaSurfaceKinds).toContain('review-closeout-bundle');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('inherits closeout roots from the registered parent task for delegated task ids', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifestForTask(sandbox, 'sample-task-scout', 'review-closeout-parent');
    await makeCloseoutBundle(sandbox, 'sample-task');
    const codexBin = await makeFakeCodex(sandbox);
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: 'sample-task',
            title: 'Sample Task',
            relates_to: 'tasks/tasks-sample-task.md'
          }
        ]
      }),
      'utf8'
    );

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'active-closeout-self-reference-search',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('keeps the latest completed closeout root active even when TODO-closeout exists', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    await makeCloseoutBundle(sandbox, 'sample-task', '20260311T000000Z-closeout');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'active-completed-closeout-self-reference-search',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded diff review when untouched adjacent prompt-context helpers keep expanding after the provenance hint', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'untouched-helper-review-support-drift',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        metaSurfaceSignals: number;
        metaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.metaSurfaceKinds).toContain('review-support');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded diff review when untouched shell-env helpers keep expanding after the provenance hint', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    await makeCloseoutBundle(sandbox, 'sample-task');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'untouched-shell-env-helper-review-support-drift',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        metaSurfaceSignals: number;
        metaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.metaSurfaceKinds).toContain('review-support');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('keeps the meta-surface guard active for audit mode when unrelated meta surfaces persist', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'meta-surface-expansion-audit-unrelated',
      CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    }, ['--surface', 'audit']);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('meta-surface expansion detected');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        metaSurfaceSignals: number;
        distinctMetaSurfaces: number;
        metaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.distinctMetaSurfaces).toBeGreaterThanOrEqual(3);
    expect(telemetry.summary.metaSurfaceKinds).toContain('codex-memories');
    expect(telemetry.summary.metaSurfaceKinds).toContain('review-support');
    expect(telemetry.summary.metaSurfaceKinds).toContain('review-docs');
    expect(telemetry.summary.metaSurfaceKinds).not.toContain('run-manifest');
    expect(telemetry.summary.metaSurfaceKinds).not.toContain('run-runner-log');
  }, LONG_WAIT_TEST_TIMEOUT_MS * 2);

  it('allows audit mode to inspect manifest and runner-log evidence without tripping the meta-surface guard', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'meta-surface-audit-evidence-only',
        CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '1',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_TIMEOUT_SECONDS: '60'
      },
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('allowed audit meta surfaces: run-manifest, run-runner-log');
    expect(result.stdout).toContain('startup-anchor boundary enabled for audit mode');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
        metaSurfaceSignals: number;
        distinctMetaSurfaces: number;
        metaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBe(0);
    expect(telemetry.summary.metaSurfaceSignals).toBe(0);
    expect(telemetry.summary.distinctMetaSurfaces).toBe(0);
    expect(telemetry.summary.metaSurfaceKinds).toEqual([]);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('treats explicit audit manifest paths outside .runs as valid startup anchors', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeDetachedManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'audit-explicit-manifest-anchor',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_TIMEOUT_SECONDS: '60',
        TASK: 'sample-task'
      },
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBe(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('treats exported audit MANIFEST reads inside the review shell payload as valid startup anchors', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeDetachedManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'audit-exported-manifest-anchor',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_TIMEOUT_SECONDS: '60',
        TASK: 'sample-task'
      },
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBe(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('keeps zsh leading assignment plus export on the active audit MANIFEST path', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeDetachedManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'audit-leading-assignment-export',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_TIMEOUT_SECONDS: '60',
        TASK: 'sample-task'
      },
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBe(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('does not carry export state across pipelines when checking audit startup anchors', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeDetachedManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'audit-pipeline-manifest-anchor',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_TIMEOUT_SECONDS: '60',
        TASK: 'sample-task'
      },
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBe(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('treats RUN_LOG alias reexports inside the review shell payload as valid startup anchors', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeDetachedManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'audit-exported-run-log-alias-anchor',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_TIMEOUT_SECONDS: '60',
        TASK: 'sample-task'
      },
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBe(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('treats env -u same-shell MANIFEST expansions as valid startup anchors', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeDetachedManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(
      manifestPath,
      {
        ...baseEnv(sandbox, codexBin),
        RUN_REVIEW_MODE: 'audit-env-unset-child-manifest-anchor',
        CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
        CODEX_REVIEW_TIMEOUT_SECONDS: '60',
        TASK: 'sample-task'
      },
      ['--surface', 'audit']
    );

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.summary.startupAnchorObserved).toBe(true);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBe(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows a single direct shell probe during bounded review', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'shell-probe-single',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBe(0);

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        shellProbeCount: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
    expect(telemetry.termination_boundary).toBeNull();
    expect(telemetry.summary.shellProbeCount).toBe(1);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on repeated direct shell probes even when the child exits quickly', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'shell-probe-repeat-fast-exit',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded review shell-probe boundary violated');
    expect(result.stderr).toContain('termination boundary: shell-probe (direct-shell-verification).');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        shellProbeCount: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'shell-probe',
        provenance: 'direct-shell-verification',
        reason: expect.stringContaining('shell-probe boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain('[redacted shell-probe sample');
    expect(telemetry.summary.shellProbeCount).toBe(2);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on repeated direct shell probes before child exit', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'shell-probe-repeat-hang',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded review shell-probe boundary violated');
    expect(result.stderr).toContain('termination boundary: shell-probe (direct-shell-verification).');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        shellProbeCount: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'shell-probe',
        provenance: 'direct-shell-verification',
        reason: expect.stringContaining('shell-probe boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain('[redacted shell-probe sample');
    expect(telemetry.summary.shellProbeCount).toBe(2);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review when it launches a package-manager validation suite', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
    expect(result.stderr).not.toContain('Review output log (partial):');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        commandIntentViolationCount: number;
        commandIntentViolationKinds: string[];
        commandIntentViolationSamples: string[];
        heavyCommandStarts: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'command-intent',
        provenance: 'validation-suite',
        reason: expect.stringContaining('bounded review command-intent boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain('[redacted command-intent sample');
    expect(telemetry.summary.commandIntentViolationCount).toBeGreaterThanOrEqual(1);
    expect(telemetry.summary.commandIntentViolationKinds).toContain('validation-suite');
    expect(telemetry.summary.commandIntentViolationSamples[0]).toContain('[redacted command-intent');
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review even when a forbidden validation suite exits before the interval tick', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-fast-exit'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (validation suite launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows package-manager validation suites when heavy review commands are explicitly enabled', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('bounded command-intent boundary');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review when it launches a direct validation runner', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'command-intent-validation',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (direct validation runner launch)');
    expect(result.stderr).toContain('termination boundary: command-intent (validation-runner).');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        commandIntentViolationCount: number;
        commandIntentViolationKinds: string[];
        commandIntentViolationSamples: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'command-intent',
        provenance: 'validation-runner',
        reason: expect.stringContaining('bounded review command-intent boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain('[redacted command-intent sample');
    expect(telemetry.summary.commandIntentViolationCount).toBeGreaterThanOrEqual(1);
    expect(telemetry.summary.commandIntentViolationKinds).toContain('validation-runner');
    expect(telemetry.summary.commandIntentViolationSamples[0]).toContain('[redacted command-intent');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('retries explicit scoped bounded review after validation command intent and preserves a bounded-success verdict', async () => {
    for (const scopeMode of ['base', 'commit', 'uncommitted'] as const) {
      const sandbox = await makeSandbox();
      const manifestPath = await makeManifest(sandbox);
      const codexBin = await makeFakeCodex(sandbox);
      await initGitRepoWithCommittedFiles(sandbox, 1);
      const argsLogPath = join(sandbox, `review-${scopeMode}-args.log`);
      let scopeArgs: string[];

      if (scopeMode === 'base') {
        const { stdout: baseStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
          cwd: sandbox
        });
        const baseRef = baseStdout.trim();
        await writeFile(join(sandbox, 'file-1.txt'), 'updated-base-scope\n', 'utf8');
        scopeArgs = ['--base', baseRef];
      } else if (scopeMode === 'commit') {
        await writeFile(join(sandbox, 'file-1.txt'), 'updated-commit-scope\n', 'utf8');
        await runGit(['commit', '-am', 'commit-scope review retry'], sandbox);
        const { stdout: commitStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
          cwd: sandbox
        });
        scopeArgs = ['--commit', commitStdout.trim()];
      } else {
        await writeFile(join(sandbox, 'file-1.txt'), 'updated-uncommitted-scope\n', 'utf8');
        scopeArgs = ['--uncommitted'];
      }

      const result = await runReviewCommand(
        manifestPath,
        {
          ...baseEnv(sandbox, codexBin),
          RUN_REVIEW_MODE: 'command-intent-validation-then-ok',
          RUN_REVIEW_ARGS_LOG: argsLogPath,
          CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
          CODEX_REVIEW_TIMEOUT_SECONDS: '60'
        },
        scopeArgs
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(
        'retrying once with reviewer-visible inline no-validation context'
      );
      expect(result.stdout).toContain('review outcome: bounded success via command-intent');
      const argsLog = await readFile(argsLogPath, 'utf8');
      const reviewInvocations = parseArgsLogInvocations(argsLog).filter((entry) =>
        entry.includes('argv=review')
      );
      expect(reviewInvocations).toHaveLength(2);
      expect(reviewInvocations[0]).toContain(
        'Surface: diff | Bounded: no validation; list follow-up commands only'
      );
      expect(reviewInvocations[1]).toContain('Strict bounded review retry.');
      expect(reviewInvocations[1]).toContain('config=default_permissions=":read-only"');
      expect(reviewInvocations[0]).not.toContain('config=default_permissions=":read-only"');
      const retryArgvLine = reviewInvocations[1].split('\n').find((line) => line.startsWith('argv=')) ?? '';
      expect(retryArgvLine).toContain('argv=review Strict bounded review retry.');
      for (const forbidden of ['argv=review --base', 'argv=review --commit', 'argv=review --uncommitted']) expect(retryArgvLine).not.toContain(forbidden);
      expect(reviewInvocations[1]).not.toContain('--title');
      for (const scopeArg of scopeArgs) {
        expect(reviewInvocations[0]).toContain(scopeArg);
      }
      expect(reviewInvocations[1]).toContain(`Retry review scope: ${scopeArgs.join(' ')}.`);

      const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
      const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
        status: string;
        review_outcome: string;
        termination_boundary: {
          kind: string;
          provenance: string;
        } | null;
        launch_context: {
          scope_flag_mode: 'base' | 'commit' | 'uncommitted' | null;
          prompt_delivery: 'inline' | 'artifact-only';
          reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
          reviewer_visible_title_source: 'user' | 'notes-surface' | null;
        } | null;
        summary: {
          commandIntentViolationCount: number;
          commandIntentViolationKinds: string[];
        };
      };
      expect(telemetry.status).toBe('succeeded');
      expect(telemetry.review_outcome).toBe('bounded-success');
      expect(telemetry.termination_boundary).toEqual(
        expect.objectContaining({
          kind: 'command-intent',
          provenance: 'validation-runner'
        })
      );
      expect(telemetry.launch_context).toEqual(
        reviewLaunchContext(null)
      );
      expect(telemetry.summary.commandIntentViolationCount).toBe(1);
      expect(telemetry.summary.commandIntentViolationKinds).toEqual(['validation-runner']);
    }
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('waits for graceful child termination before surfacing timeout failure', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'term-graceful-timeout',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    const outputLogPath = join(dirname(manifestPath), 'review', 'output.log');
    const outputLog = await readFile(outputLogPath, 'utf8');
    expect(outputLog).toContain('term-sentinel');
    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
    };
    expect(telemetry.status).toBe('failed');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review even when a forbidden validation runner exits before the interval tick', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'command-intent-validation-fast-exit'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (direct validation runner launch)');
    expect(result.stderr).toContain('termination boundary: command-intent (validation-runner).');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'command-intent',
        provenance: 'validation-runner',
        reason: expect.stringContaining('bounded review command-intent boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain('[redacted command-intent sample');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review when a forbidden validation runner exits non-zero before the interval tick', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'command-intent-validation-fast-exit-nonzero'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (direct validation runner launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on package-manager shorthand validation launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'command-intent-validation-shorthand',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (direct validation runner launch)');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows direct validation runners when heavy review commands are explicitly enabled', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'command-intent-validation',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('bounded command-intent boundary');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on nested review or pipeline launches', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'command-intent-review-orchestration',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (nested review or pipeline launch)');
    expect(result.stderr).toContain('termination boundary: command-intent (review-orchestration).');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        commandIntentViolationKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'command-intent',
        provenance: 'review-orchestration',
        reason: expect.stringContaining('bounded review command-intent boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain('[redacted command-intent sample');
    expect(telemetry.summary.commandIntentViolationKinds).toContain('review-orchestration');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on mutating delegation control but not read-only status checks', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'command-intent-delegation-control',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded command-intent boundary (delegation control activity)');
    expect(result.stderr).toContain('termination boundary: command-intent (delegation-control).');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      termination_boundary: {
        kind: string;
        provenance: string;
        reason: string;
        sample: string | null;
      } | null;
      summary: {
        commandIntentViolationCount: number;
        commandIntentViolationKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.termination_boundary).toEqual(
      expect.objectContaining({
        kind: 'command-intent',
        provenance: 'delegation-control',
        reason: expect.stringContaining('bounded review command-intent boundary violated')
      })
    );
    expect(telemetry.termination_boundary?.sample).toContain('[redacted command-intent sample');
    expect(telemetry.summary.commandIntentViolationCount).toBeGreaterThanOrEqual(1);
    expect(telemetry.summary.commandIntentViolationKinds).toEqual(['delegation-control']);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('derives task context from explicit manifest instead of stale task env fallback', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifestForTask(sandbox, 'task-b', 'run-b');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'task-a',
      FORCE_CODEX_REVIEW: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Review task: task-b');
    expect(result.stdout).not.toContain('Review task: task-a');
  });

  it('ignores a stale run-dir manifest when it conflicts with the requested task', async () => {
    const sandbox = await makeSandbox();
    const staleManifestPath = await makeManifestForTask(sandbox, 'task-a', 'run-a');
    const requestedManifestPath = await makeManifestForTask(sandbox, 'task-b', 'run-b');
    const codexBin = await makeFakeCodex(sandbox);
    const staleRunDir = dirname(staleManifestPath).replace(`${sandbox}/`, '');
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'task-b',
      CODEX_ORCHESTRATOR_RUN_DIR: staleRunDir,
      FORCE_CODEX_REVIEW: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Review task: task-b');
    expect(result.stdout).not.toContain('Review task: task-a');
    expect(result.stdout).toContain('Review prompt saved to: .runs/task-b/cli/run-b/review/prompt.txt');
    expect(result.stdout).not.toContain('.runs/task-a/cli/run-a/review/prompt.txt');
  });

  it('derives task context from legacy run-layout manifests', async () => {
    const sandbox = await makeSandbox();
    const legacyManifestPath = join(sandbox, '.runs', 'task-legacy', 'run-legacy', 'manifest.json');
    await mkdir(dirname(legacyManifestPath), { recursive: true });
    await writeFile(legacyManifestPath, JSON.stringify({ run: 'legacy' }), 'utf8');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(legacyManifestPath, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'task-a',
      FORCE_CODEX_REVIEW: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Review task: task-legacy');
    expect(result.stdout).not.toContain('Review task: task-a');
  });

  it('uses the nearest run-root segment when ancestor paths contain "runs"', async () => {
    const sandbox = await makeSandbox();
    const nestedManifestPath = join(sandbox, 'runs', 'repo', '.runs', 'task-b', 'cli', 'run-b', 'manifest.json');
    await mkdir(dirname(nestedManifestPath), { recursive: true });
    await writeFile(nestedManifestPath, JSON.stringify({ run: 'nested' }), 'utf8');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(nestedManifestPath, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'task-a',
      FORCE_CODEX_REVIEW: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Review task: task-b');
    expect(result.stdout).not.toContain('Review task: repo');
  });

  it('captures an issue bundle on review failure when auto issue log is enabled', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_AUTO_ISSUE_LOG: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('[run-review] captured review failure issue log:');

    const issueLogPath = join(sandbox, 'docs', 'codex-orchestrator-issues.md');
    const issueLog = await readFile(issueLogPath, 'utf8');
    expect(issueLog).toContain('Auto issue log: standalone review failed');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('does not crash when stdout pipe closes early', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const cmd = [
      'set -o pipefail',
      `${shellQuote(process.execPath)} --loader ts-node/esm ${shellQuote(runReviewScript)} --manifest ${shellQuote(manifestPath)} --non-interactive 2>/dev/null | head -n 1 >/dev/null`
    ].join('\n');

    const { stdout, stderr } = await execFileAsync(shellBinary, ['-lc', cmd], {
      cwd: process.cwd(),
      env: { ...baseEnv(sandbox, codexBin), RUN_REVIEW_MODE: 'spam' },
      maxBuffer: 16 * 1024 * 1024
    });

    expect(String(stdout ?? '')).toBe('');
    expect(String(stderr ?? '')).toBe('');
  });
});
