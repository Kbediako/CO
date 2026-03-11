# Standalone Review (Agent-First)

This guide is the canonical reference for ad-hoc reviews outside pipelines.

Scope note:
- `codex-orchestrator review` is the downstream-safe default command.
- `npm run review` remains a repo-local convenience alias in this repository.
- `npm run pack:smoke` is the standard downstream simulation gate for this wrapper behavior (tarball install + mock-repo review artifacts).

Use `codex-orchestrator review` as the default path so runs inherit CO guardrails (task-scoped evidence, delegation MCP default-on with explicit opt-out controls, and optional auto issue logging).

## Default path (recommended): `codex-orchestrator review`
- Manifest-backed review:
  `TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." codex-orchestrator review --manifest <path>`
- Latest manifest for active task:
  `MCP_RUNNER_TASK_ID=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ..." codex-orchestrator review`
- Optional automatic issue logging on review failure:
  - Env: `CODEX_REVIEW_AUTO_ISSUE_LOG=1`
  - Flag: `codex-orchestrator review --auto-issue-log`

## Direct `codex review` (quick, best-effort)
- Uncommitted diff: `codex review --uncommitted`
- Base branch: `codex review --base <branch>`
- Commit: `codex review --commit <sha>`
- Custom focus (prompt-only): `codex review "<custom instructions>"`
- Compatibility guard: do not combine prompt arguments with `--uncommitted`, `--base`, or `--commit` (current Codex CLI rejects that combination).
- If direct review hangs in delegation startup, switch to `codex-orchestrator review`, which keeps task-scoped evidence and supports explicit delegation disable controls plus optional issue-bundle capture.

## Use during implementation (recommended)
- Run a quick standalone review after each meaningful chunk of work to catch issues early.
- After each review run, append a short progress checkpoint in the active task checklist (what changed, evidence, next step).
- Use this default trigger heuristic so reviews stay useful (not noisy):
  - run when 2+ files changed since the previous review, or
  - run when about 40+ changed lines accumulate, or
  - run immediately for any workflow/security/release file touch.
- Also run at implementation checkpoints: after finishing a coding burst/sub-goal, after addressing a feedback batch, and before switching streams or handoff.
- Prefer a custom focus prompt for targeted checks, for example:
  `codex review "Focus on correctness, regressions, and edge cases in the files I just touched; ignore style; list missing tests."`
- WIP two-step pattern when you want both scope and focus:
  1. `codex review --uncommitted` (or `--base/--commit`)
  2. `codex review "<targeted focus prompt>"` (prompt-only)
- For non-trivial diffs (about 2+ files or 40+ changed lines), run an elegance/minimality pass in the same cycle before handoff/merge.
- Capture key findings in the PRD/TECH_SPEC or task notes so context survives compaction.
- Before implementation begins, run a standalone review of the task/spec against the user’s intent and record the approval (or issues) in the spec/task notes.

## Eval-driven mindset
- Define the review criteria up front (correctness, regressions, edge cases, missing tests).
- Keep prompts short and explicit; list the exact files or behaviors you want checked.
- When you need repeatable results, turn the review into a checklist or a small eval run and compare outcomes over time.

## Wrapper behavior notes
- Set `TASK` or `MCP_RUNNER_TASK_ID` so the review prompt includes task context instead of `unknown-task`.
- In CI or when `CODEX_REVIEW_NON_INTERACTIVE=1`/`CODEX_NON_INTERACTIVE=1` (or `CODEX_NO_INTERACTIVE=1`) is set, the wrapper prints a “review handoff” prompt and exits unless `FORCE_CODEX_REVIEW=1` is set.
- To force execution in those environments: `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 TASK=<task-id> NOTES="..." MANIFEST=<path> codex-orchestrator review --manifest <path>`.
- `codex-orchestrator review` keeps delegation MCP enabled by default; disable when needed with `CODEX_REVIEW_DISABLE_DELEGATION_MCP=1` or `--disable-delegation-mcp` (legacy control remains supported: `CODEX_REVIEW_ENABLE_DELEGATION_MCP=0` or `--enable-delegation-mcp=false`).
- `codex-orchestrator review` does not enforce runtime limits by default (reviews can run as long as needed).
- `codex-orchestrator review` uses bounded review guidance by default (default `diff` reviews stay on changed files; `audit` reviews stay on the requested audit surfaces; both avoid full-suite validation commands).
- `codex-orchestrator review` now defaults to the `diff` review surface, which keeps the prompt focused on changed code and nearby dependencies instead of checklist/docs/evidence audit surfaces.
- Prompt-side scope notes now stay path-only; the wrapper no longer injects raw branch-history / commit-metadata git summaries into the review prompt.
- Use `--surface audit` (or `CODEX_REVIEW_SURFACE=audit`) when you explicitly want checklist/manifest/canonical task-doc path/evidence validation in the prompt.
- In that default bounded path, an immediate command-intent boundary now fails closed on explicit package-manager validation suites (`npm` / `pnpm` / `yarn` / `bun` `run test|lint|build|docs:check|docs:freshness`), direct `vitest`/`jest`-style launches, nested `codex review` / `codex-orchestrator review` / `codex-orchestrator start docs-review|implementation-gate|diagnostics`, and mutating `delegation.delegate.spawn|pause|cancel` tool calls; `delegation.delegate.status` is not an immediate boundary violation, but repeated status-only meta inspection can still contribute to the sustained meta-surface guard.
- In that default non-heavy path, a low-signal drift guard can fail closed when the review stays on repetitive nearby inspection for too long; disable it with `CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS=0` or shorten/extend it with an explicit seconds value.
- In that same bounded path, one direct shell-probe verification command is tolerated when the reviewer genuinely needs to confirm env or shell semantics, but repeated shell-probe commands now fail closed instead of allowing open-ended shell experimentation.
- In that same default `diff` path, a meta-surface expansion guard can fail closed when the review persistently broadens into off-task review-orchestration surfaces such as global skills/memory, run manifests/logs, or adjacent review-system docs/artifacts/helpers that are not part of the touched diff; disable it with `CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS=0` or shorten/extend it with an explicit seconds value.
- In that same default `diff` path, the current task's active closeout bundle under `out/<task>/manual/*-closeout/` now counts as a self-referential review surface; direct rereads or repo-wide search results that surface those paths contribute to the same bounded guardrails instead of reopening another closeout-loop audit.
- When the wrapper can already resolve those active closeout root paths, the diff-mode handoff may surface them explicitly as already-resolved self-referential review surfaces so the reviewer does not need to rediscover or re-enumerate them.
- In that same default `diff` path, untouched adjacent standalone-review-specific helper files such as `scripts/lib/review-scope-paths.ts` and `tests/review-scope-paths.spec.ts` count as the `review-support` meta-surface family. Cross-cutting shared helpers such as `scripts/lib/docs-helpers.js` stay ordinary nearby dependency reads instead of being elevated into `review-support`.
- In `audit` mode, the wrapper keeps the meta-surface expansion guard active for unrelated drift but treats the explicit audit evidence surfaces (`run-manifest` and `run-runner-log`) as in-scope.
- In that same bounded `audit` path, a startup-anchor boundary now fails closed only when repeated memory/skills/review-doc reads happen before the review first anchors on the active evidence manifest or active runner log; it does not fail merely because no audit anchor has been observed yet.
- That audit startup anchor can arrive either through the explicit active manifest/runner-log path itself or through an exported review-shell env var that still resolves to that same active evidence path.
- Heavy-command policy toggles:
  - Allow unrestricted heavy command execution (including explicit validation suites and direct validation-runner launches): `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1`
  - Enforce bounded mode (hard-stop on remaining heavy command starts outside the default command-intent boundary): `CODEX_REVIEW_ENFORCE_BOUNDED_MODE=1`
- `codex-orchestrator review` emits patience-first runtime checkpoints every 60s by default (`elapsed` + `idle` visibility while waiting).
- `codex-orchestrator review` auto-detects large uncommitted scopes and injects a prompt advisory to prioritize highest-risk findings early (helps CO-scale diffs where exhaustive traversal can take a long time).
- Optional timeout/stall/startup-loop guards:
  - `CODEX_REVIEW_TIMEOUT_SECONDS=<seconds>` (`0` disables when set)
  - `CODEX_REVIEW_STALL_TIMEOUT_SECONDS=<seconds>` (`0` disables when set)
  - `CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS=<seconds>` with optional `CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS` (default `8` when startup-loop timeout is set)
  - `CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS=<seconds>` (`0` disables the bounded low-signal drift guard; default `180`)
  - `CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS=<seconds>` (`0` disables the bounded meta-surface expansion guard; default `180`)
- Optional monitor tuning:
  - `CODEX_REVIEW_MONITOR_INTERVAL_SECONDS=<seconds>` (`0` disables checkpoints)
- Optional large-scope thresholds:
  - `CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD=<count>` (default `25`)
  - `CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD=<count>` (default `1200`)
- `codex-orchestrator review` writes artifacts under `<runDir>/review/`, where `<runDir>` tracks the resolved manifest lineage: it uses `CODEX_ORCHESTRATOR_RUN_DIR` only when that directory contains the resolved manifest, otherwise it falls back to `dirname(manifestPath)`.
- Prompt artifact: `<runDir>/review/prompt.txt` (always).
- Review transcript: `<runDir>/review/output.log` (when `codex review` runs, for example with `FORCE_CODEX_REVIEW=1`).
- Runtime telemetry artifact: `<runDir>/review/telemetry.json` (best-effort summary of observed command activity, startup events, and output tail).

## Expected outputs
- `codex review`: prioritized findings; no working tree edits.
- `codex-orchestrator review`: includes task-scoped manifest evidence in the review prompt, applies diff-budget checks when `scripts/diff-budget.mjs` exists in the target repo root (auto-skips in downstream npm installs that do not ship that helper), and may emit a handoff prompt in non-interactive mode (see above).
