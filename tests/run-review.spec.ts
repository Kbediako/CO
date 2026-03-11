import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const runReviewScript = join(process.cwd(), 'scripts', 'run-review.ts');
const createdSandboxes: string[] = [];
const shellBinary = 'bash';
const LONG_WAIT_TEST_TIMEOUT_MS = 20_000;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
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

async function runGit(args: string[], cwd: string): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

async function initGitRepoWithCommittedFiles(
  sandbox: string,
  fileCount: number
): Promise<{ files: string[] }> {
  await runGit(['init', '-q'], sandbox);
  await runGit(['config', 'user.email', 'run-review-tests@example.com'], sandbox);
  await runGit(['config', 'user.name', 'run-review-tests'], sandbox);

  const files: string[] = [];
  for (let index = 1; index <= fileCount; index += 1) {
    const file = `file-${index}.txt`;
    files.push(file);
    await writeFile(join(sandbox, file), `baseline-${index}\n`, 'utf8');
  }
  await runGit(['add', '.'], sandbox);
  await runGit(['commit', '-m', 'seed'], sandbox);
  return { files };
}

async function makeFakeCodex(sandbox: string): Promise<string> {
  const binPath = join(sandbox, 'codex-mock.sh');
  const script = `#!/usr/bin/env bash
set -euo pipefail
config_overrides=()
while [[ "\${1:-}" == "-c" ]]; do
  if [[ "$#" -lt 2 ]]; then
    echo "missing value for -c" >&2
    exit 2
  fi
  config_overrides+=("\${2}")
  shift 2
done
if [[ -n "\${RUN_REVIEW_ARGS_LOG:-}" ]]; then
  {
    if [[ "\${#config_overrides[@]}" -gt 0 ]]; then
      for override in "\${config_overrides[@]}"; do
        echo "config=$override"
      done
    fi
    echo "argv=$*"
  } > "\${RUN_REVIEW_ARGS_LOG}"
fi
if [[ "\${1:-}" == "--help" ]]; then
  if [[ "\${RUN_REVIEW_MODE:-ok}" == "delete-after-help" ]]; then
    rm -f "$0"
  fi
  echo "OpenAI Codex CLI"
  echo "  review   Review changes"
  exit 0
fi
  if [[ "\${1:-}" == "review" ]]; then
    mode="\${RUN_REVIEW_MODE:-ok}"
    if [[ "$mode" == "hang" ]]; then
      while true; do sleep 1; done
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
        echo "/bin/zsh -lc 'sed -n 1,120p dist/scripts/lib/review-scope-paths.js' in /Users/kbediako/Code/CO"
        echo "thinking"
        echo "exec"
        echo "/bin/zsh -lc 'sed -n 1,120p tests/review-scope-paths.spec.ts' in /Users/kbediako/Code/CO"
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
  delete env.CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_DEBUG_TELEMETRY;
  delete env.CODEX_REVIEW_SURFACE;
  delete env.CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD;
  delete env.CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD;
  delete env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
  delete env.CODEX_ORCHESTRATOR_RUN_DIR;
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
  const args = ['--loader', 'ts-node/esm', runReviewScript, ...extraArgs];
  if (manifestPath) {
    args.push('--manifest', manifestPath);
  }
  args.push('--non-interactive');
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      args,
      { cwd: process.cwd(), env, maxBuffer: 16 * 1024 * 1024, timeout: 30_000 }
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
  }
}

afterEach(async () => {
  while (createdSandboxes.length > 0) {
    const dir = createdSandboxes.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('scripts/run-review regression', { timeout: LONG_WAIT_TEST_TIMEOUT_MS }, () => {
  it('does not enforce default timeout/stall/startup-loop guards', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

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
  }, LONG_WAIT_TEST_TIMEOUT_MS * 2);

  it('persists timeout telemetry summaries for faster failure triage', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'heavy-hang',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).toContain('[run-review] review telemetry:');
    expect(result.stderr).toContain('heavy command start(s)');
    expect(result.stderr).toContain('last command started: [redacted]');
    expect(result.stderr).toContain('output tail captured:');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      error: string | null;
      summary: { commandStarts: string[]; heavyCommandStarts: string[] };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.error).toContain('[redacted error');
    expect(telemetry.summary.commandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts.length).toBeGreaterThan(0);
    expect(telemetry.summary.heavyCommandStarts[0]).toContain('[redacted heavy-command');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

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

  it('warns and injects a scope advisory when uncommitted scope is large', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 3);
    for (const file of files) {
      await writeFile(join(sandbox, file), `updated-${file}\n`, 'utf8');
    }

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '2',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '2'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('review scope metrics: 3 files, 6 lines.');
    expect(result.stderr).toContain('large uncommitted review scope detected');
    expect(result.stderr).toContain('prefer scoped reviews (`--base`/`--commit`)');

    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Scope advisory: large uncommitted diff detected');
    expect(prompt).toContain('Prioritize highest-risk findings first');
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
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '10'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('review scope metrics: 1 files, 30 lines.');
    expect(result.stderr).toContain('large uncommitted review scope detected');
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
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('defaults manifest selection to active task env when --task is omitted', async () => {
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
      MCP_RUNNER_TASK_ID: '0975-codex-cli-capability-adoption-redesign'
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        outputInspectionSignals: number;
        distinctOutputInspectionTargets: number;
        maxOutputNarrativeSignatureHits: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.outputInspectionSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.distinctOutputInspectionTargets).toBeLessThanOrEqual(4);
    expect(telemetry.summary.maxOutputNarrativeSignatureHits).toBeGreaterThanOrEqual(2);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        outputInspectionSignals: number;
        outputNarrativeSignals: number;
        distinctOutputInspectionTargets: number;
        maxOutputNarrativeSignatureHits: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.outputInspectionSignals).toBe(0);
    expect(telemetry.summary.outputNarrativeSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.distinctOutputInspectionTargets).toBe(0);
    expect(telemetry.summary.maxOutputNarrativeSignatureHits).toBeGreaterThanOrEqual(2);
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        commandStarts: string[];
        metaSurfaceSignals: number;
        distinctMetaSurfaces: number;
        maxMetaSurfaceHits: number;
      };
    };
    expect(telemetry.status).toBe('failed');
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        preAnchorMetaSurfaceSignals: number;
        preAnchorMetaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.startupAnchorObserved).toBe(false);
    expect(telemetry.summary.preAnchorMetaSurfaceSignals).toBeGreaterThanOrEqual(2);
    expect(telemetry.summary.preAnchorMetaSurfaceKinds).toEqual([
      'codex-memories',
      'codex-skills'
    ]);
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        startupAnchorObserved: boolean;
        metaSurfaceSignals: number;
        metaSurfaceKinds: string[];
        preAnchorMetaSurfaceKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.startupAnchorObserved).toBe(false);
    expect(telemetry.summary.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(telemetry.summary.metaSurfaceKinds).toContain('review-closeout-bundle');
    expect(telemetry.summary.preAnchorMetaSurfaceKinds).toEqual([]);
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

  it('fails bounded diff review when untouched adjacent review-scope helpers keep expanding after the provenance hint', async () => {
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
    expect(telemetry.summary.metaSurfaceKinds).toContain('codex-skills');
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
      summary: {
        shellProbeCount: number;
      };
    };
    expect(telemetry.status).toBe('succeeded');
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        shellProbeCount: number;
      };
    };
    expect(telemetry.status).toBe('failed');
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        shellProbeCount: number;
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.shellProbeCount).toBe(2);
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('fails bounded review on repeated nested shell probes', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'shell-probe-repeat-nested-fast-exit',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('bounded review shell-probe boundary violated');

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        shellProbeCount: number;
      };
    };
    expect(telemetry.status).toBe('failed');
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        commandIntentViolationCount: number;
        commandIntentViolationKinds: string[];
        commandIntentViolationSamples: string[];
        heavyCommandStarts: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        commandIntentViolationCount: number;
        commandIntentViolationKinds: string[];
        commandIntentViolationSamples: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
    expect(telemetry.summary.commandIntentViolationCount).toBeGreaterThanOrEqual(1);
    expect(telemetry.summary.commandIntentViolationKinds).toContain('validation-runner');
    expect(telemetry.summary.commandIntentViolationSamples[0]).toContain('[redacted command-intent');
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        commandIntentViolationKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
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

    const telemetryPath = join(dirname(manifestPath), 'review', 'telemetry.json');
    const telemetry = JSON.parse(await readFile(telemetryPath, 'utf8')) as {
      status: string;
      summary: {
        commandIntentViolationCount: number;
        commandIntentViolationKinds: string[];
      };
    };
    expect(telemetry.status).toBe('failed');
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
