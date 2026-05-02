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
- `NOTES` is required for authoritative review gates. Missing notes fail unless `CODEX_REVIEW_BREAK_GLASS_NOTES_FALLBACK=1` is paired with `CODEX_REVIEW_BREAK_GLASS_OWNER`, `CODEX_REVIEW_BREAK_GLASS_EXPIRES_AT`, `CODEX_REVIEW_BREAK_GLASS_REASON`, and `CODEX_REVIEW_BREAK_GLASS_EVIDENCE`; `CODEX_REVIEW_BREAK_GLASS_EXPIRES_AT` must be a valid future timestamp, and expired or malformed values are rejected.
- In CI or when `CODEX_REVIEW_NON_INTERACTIVE=1`/`CODEX_NON_INTERACTIVE=1` (or `CODEX_NO_INTERACTIVE=1`) is set, direct/manual wrapper runs print a “review handoff” prompt and exit unless `FORCE_CODEX_REVIEW=1` is set. When `CODEX_REVIEW_AUTHORITATIVE_GATE=1` is set, prompt-only handoff fails closed instead of counting as review completion.
- Non-interactive lane matrix:
  - Direct/manual wrapper runs stay handoff-only unless you set `FORCE_CODEX_REVIEW=1`.
  - `docs-review` and `implementation-gate` set `FORCE_CODEX_REVIEW=1` plus `CODEX_REVIEW_AUTHORITATIVE_GATE=1` and execute unattended standalone review.
  - `docs-relevance-advisory` clears `FORCE_CODEX_REVIEW` and stays prompt-only/advisory.
  - The `provider-linear-worker` pipeline exports `CODEX_REVIEW_NON_INTERACTIVE=1`, `FORCE_CODEX_REVIEW=1`, and `CODEX_REVIEW_AUTHORITATIVE_GATE=1` for the worker session, so the pre-handoff standalone review executes before `Human Review` / `In Review`; use `codex-orchestrator review` / `npm run review`, not raw `codex review`, for that closeout review.
- To force execution in those environments: `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 CODEX_REVIEW_AUTHORITATIVE_GATE=1 TASK=<task-id> NOTES="..." MANIFEST=<path> codex-orchestrator review --manifest <path>`.
- `codex-orchestrator review` keeps delegation MCP enabled by default; disable when needed with `CODEX_REVIEW_DISABLE_DELEGATION_MCP=1` or `--disable-delegation-mcp` (legacy control remains supported: `CODEX_REVIEW_ENABLE_DELEGATION_MCP=0` or `--enable-delegation-mcp=false`).
- `codex-orchestrator review` does not enforce runtime limits by default (reviews can run as long as needed).
- `codex-orchestrator review` uses bounded review guidance by default (default `diff` reviews stay on changed files, `audit` reviews stay on the requested evidence surfaces, and `architecture` reviews stay on the requested task-doc and architecture surfaces; all avoid full-suite validation commands).
- `codex-orchestrator review` now defaults to the `diff` review surface, which keeps the prompt focused on changed code and nearby dependencies instead of checklist/docs/evidence audit surfaces.
- Explicit wrapper scope flags (`--uncommitted`, `--base`, `--commit`) keep the full saved prompt/context in `review/prompt.txt`, launch `codex review` without any prompt argument because current Codex CLI still treats stdin (`-`) as `[PROMPT]` and rejects it with scope flags, and first use bounded `--title` transport for reviewer-visible scoped context. Bounded scoped titles include the no-validation contract (`Bounded: no validation; list follow-up commands only`) so the critical constraint is visible at the actual review launch boundary instead of only in `review/prompt.txt`. If Codex rejects a synthesized scoped `--title`, the wrapper retries the same explicit scope without `--title` and falls back to artifact-only reviewer-visible context. Unscoped wrapper runs still pass the saved prompt/context inline.
- Because those explicit scoped launches only have bounded `--title` transport, they support only the default `diff` surface at the actual Codex layer. `--surface audit` and `--surface architecture` must be rerun without explicit scope flags.
- Prompt-side scope notes now stay path-only; the wrapper no longer injects raw branch-history / commit-metadata git summaries into the review prompt.
- Use `--surface audit` (or `CODEX_REVIEW_SURFACE=audit`) when you explicitly want checklist/manifest/canonical task-doc path/evidence validation in the prompt.
- Use `--surface architecture` (or `CODEX_REVIEW_SURFACE=architecture`) when you explicitly want broader design/context review against the canonical docs-first inputs: task checklist, PRD, TECH_SPEC, ACTION_PLAN, and `.agent/system/architecture.md`. This surface does not add manifest/runner-log evidence lines by default.
- In that default bounded path, an immediate command-intent boundary now fails closed on explicit package-manager validation suites (`npm` / `pnpm` / `yarn` / `bun` `run test|lint|build|docs:check|docs:freshness`), direct `vitest`/`jest`-style launches, nested `codex review` / `codex-orchestrator review` / `codex-orchestrator start docs-review|implementation-gate|diagnostics`, and mutating `delegation.delegate.spawn|pause|cancel` tool calls; help-only lookups such as `codex review --help` remain read-only inspection, and `delegation.delegate.status` is not an immediate boundary violation, but repeated status-only meta inspection can still contribute to the sustained meta-surface guard. For explicit scoped bounded runs, a command-intent boundary triggers exactly one stricter retry before the wrapper reports failure; that retry moves the original `--uncommitted`, `--base`, or `--commit` scope into a reviewer-visible inline prompt, names the blocked attempt as follow-up-only, and adds `default_permissions=":read-only"` as the 0.128 read-only permission-profile override, with a legacy `sandbox_mode="read-only"` retry only when the active Codex CLI rejects `default_permissions`. A successful retry records `review_outcome: bounded-success` with the preserved `termination_boundary.kind: command-intent` and carries the original command-intent aggregate counts into the success telemetry summary.
- In that default non-heavy path, a low-signal drift guard can fail closed when the review stays on repetitive nearby inspection for too long; disable it with `CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS=0` or shorten/extend it with an explicit seconds value.
- In that same bounded path, a verdict-stability guard can fail closed when the review keeps emitting repeated speculative no-progress output, including repeated targetless narrative loops, without introducing new concrete progress signals; disable it with `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=0` or shorten/extend it with an explicit seconds value.
- In that same bounded `diff` path, explicit touched-path citations with locations (`path:line`, `path:line:col`, `path#Lline`, `path#LlineCcol`) are already sufficient concrete same-diff progress; the reviewer should not widen into repo-wide example hunts just to prove that rendering shape.
- In that same bounded path, one direct shell-probe verification command is tolerated when the reviewer genuinely needs to confirm env or shell semantics, but repeated shell-probe commands now fail closed instead of allowing open-ended shell experimentation.
- In that same default `diff` path, a meta-surface expansion guard can fail closed when the review persistently broadens into off-task review-orchestration surfaces such as global skills/memory, run manifests/logs, or adjacent review-system docs/artifacts/helpers that are not part of the touched diff; disable it with `CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS=0` or shorten/extend it with an explicit seconds value.
- In that same default `diff` path, the current task's active closeout bundle under `out/<task>/manual/*-closeout/` now counts as a self-referential review surface; pure repo-wide search drift focused on those paths uses `meta-surface-expansion` with active-closeout-specific provenance, mixed broader meta-surface drift stays on generic `meta-surface-kinds`, and post-anchor repeated direct rereads of that bundle fail closed as the first-class `active-closeout-bundle-reread` boundary.
- When the wrapper can already resolve those active closeout root paths, the diff-mode handoff may surface them explicitly as already-resolved self-referential review surfaces so the reviewer does not need to rediscover or re-enumerate them.
- In that same default `diff` path, untouched adjacent standalone-review-specific helper files such as `scripts/lib/review-scope-paths.ts` and `tests/review-scope-paths.spec.ts` count as the `review-support` meta-surface family. Cross-cutting shared helpers such as `scripts/lib/docs-helpers.js` stay ordinary nearby dependency reads instead of being elevated into `review-support`.
- In `audit` mode, the wrapper keeps the meta-surface expansion guard active for unrelated drift but treats the explicit audit evidence surfaces (`run-manifest` and `run-runner-log`) as in-scope.
- In that same bounded `audit` path, a startup-anchor boundary now fails closed only when repeated memory/skills/review-doc reads happen before the review first anchors on the active evidence manifest or active runner log; it does not fail merely because no audit anchor has been observed yet.
- That audit startup anchor can arrive either through the explicit active manifest/runner-log path itself or through an exported review-shell env var that still resolves to that same active evidence path.
- Heavy-command policy toggles:
  - Allow unrestricted heavy command execution (including explicit validation suites and direct validation-runner launches): `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1`
  - Enforce bounded mode (hard-stop on remaining heavy command starts outside the default command-intent boundary): `CODEX_REVIEW_ENFORCE_BOUNDED_MODE=1`
- `codex-orchestrator review` emits patience-first runtime checkpoints every 60s by default (`elapsed` + `idle` visibility while waiting).
- The review wrapper's diff-budget preflight now hard-gates the current working tree relative to `HEAD` by default for local runs; explicit `--base`, explicit `--commit`, and CI `BASE_SHA` / `DIFF_BUDGET_BASE` remain the hard PR/base surfaces, and broader `origin/main` stacked history is advisory-only in local auto mode. If an explicit base ref is requested but cannot be resolved, the wrapper fails instead of silently downgrading scope or falling through to a lower-priority base source.
- Large uncommitted review scope is now explicit and auditable: when thresholds trip, rerun with `--base` / `--commit` or set `CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON="<reason>"`. Accepted overrides are logged and copied into the review prompt.
- If the CLI rejects an explicitly requested scope flag (`--uncommitted`, `--base`, or `--commit`), the wrapper now fails instead of silently dropping that explicit scope; this keeps the review surface and audit trail truthful.
- CO-395 fallback-expiry status for review-wrapper fallbacks:
  - `remove fallback`: scope-dropping retries are removed. The wrapper may not retry by dropping `--uncommitted`, `--base`, or `--commit`, and unscoped prompt launch failures remain real launch failures rather than changing the review contract.
  - `expire fallback`: synthesized scoped-title fallback to artifact-only context is retained temporarily. Owner: review wrapper / CO-395. Trigger: Codex rejects synthesized scoped `--title` transport. Introduced: CO-43 on 2026-03-30. Review by: 2026-05-10. Maximum lifetime: 2026-05-26. Removal condition: the audited Codex target accepts synthesized scoped titles for `--base`, `--commit`, and `--uncommitted`, or prompt transport is consolidated by a larger review-wrapper refactor.
  - `justify retaining fallback`: generated fallback notes stay only as a non-authoritative no-empty-context guard, command-intent retry stays as a durable bounded-review safety contract, and telemetry classification stays as the audit surface for `clean-success`, `bounded-success`, `failed-boundary`, and `failed-other`.
- In the default bounded `diff` path, repeated post-startup-anchor relevant rereads now terminate as a successful bounded completion instead of drifting toward a late failure; the success-side `termination_boundary` is preserved in `review/telemetry.json`.
- Operator interpretation for `review/telemetry.json`:
  - `review_outcome: clean-success` means review completed successfully without any preserved termination boundary.
  - `review_outcome: bounded-success` means review completed successfully with a preserved bounded stop. Treat it as successful review completion, not as a blocker or generic quiet-tail failure.
  - `review_outcome: failed-boundary` means the review wrapper failed on an explicit machine-checkable boundary family (for example `command-intent`, `startup-loop`, `timeout`, or `stall`).
  - `review_outcome: failed-other` means the review command failed without a classified termination boundary. Treat it as a failed review outcome that still needs inspection, but not as proof that the wrapper itself hit a first-class boundary failure.
  - Older telemetry may not have `review_outcome`; when absent, interpret succeeded + null `termination_boundary` as clean success, succeeded + non-null `termination_boundary` as bounded success, failed + non-null `termination_boundary` as failed boundary, and failed + null `termination_boundary` as failed-other.
- Provider-worker workpads should copy the review outcome and command-intent counts from `review/telemetry.json` (`summary.commandIntentViolationCount`, `summary.commandIntentViolationKinds`, and `termination_boundary.provenance`) so reviewer-command fallbacks stay separate from product findings or unrelated validation failures.
- Pipeline-owned review gates can require terminal review-evidence consistency by setting `CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY=1`; an explicit waiver can be recorded with `CODEX_REVIEW_EVIDENCE_WAIVER_REASON="<reason>"`.
- Optional timeout/stall/startup-loop guards:
  - `CODEX_REVIEW_TIMEOUT_SECONDS=<seconds>` (`0` disables when set); when this guard fires, runtime telemetry records a first-class `timeout` termination boundary
  - `CODEX_REVIEW_STALL_TIMEOUT_SECONDS=<seconds>` (`0` disables when set); when this guard fires, runtime telemetry records a first-class `stall` termination boundary
  - `CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS=<seconds>` with optional `CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS` (default `8` when startup-loop timeout is set); when this guard fires, runtime telemetry records a first-class `startup-loop` termination boundary
  - Those timeout-adjacent families continue to print `Review output log (partial)`; other first-class boundary violations do not.
  - `CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS=<seconds>` (`0` disables the bounded low-signal drift guard; default `180`)
  - `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=<seconds>` (`0` disables the bounded verdict-stability guard; default `180`)
  - `CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS=<seconds>` (`0` disables the bounded meta-surface expansion guard; default `180`)
- Optional monitor tuning:
  - `CODEX_REVIEW_MONITOR_INTERVAL_SECONDS=<seconds>` (`0` disables checkpoints)
- Optional large-scope thresholds:
  - `CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD=<count>` (default `25`)
  - `CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD=<count>` (default `1200`)
  - `CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON="<reason>"` (required when large uncommitted scope is intentional and you are not using `--base` / `--commit`)
- `codex-orchestrator review` writes artifacts under `<runDir>/review/`, where `<runDir>` tracks the resolved manifest lineage: it uses `CODEX_ORCHESTRATOR_RUN_DIR` only when that directory contains the resolved manifest, otherwise it falls back to `dirname(manifestPath)`.
- Prompt artifact: `<runDir>/review/prompt.txt` (always).
- Review transcript: `<runDir>/review/output.log` (when `codex review` runs, for example with `FORCE_CODEX_REVIEW=1`).
- Runtime telemetry artifact: `<runDir>/review/telemetry.json` (best-effort summary of observed command activity, startup events, output tail, an explicit `review_outcome` disposition, plus a first-class `termination_boundary` record when the current timeout, stall, bounded command-intent, shell-probe, active-closeout-bundle-reread, startup-anchor, startup-loop, meta-surface expansion, verdict-stability, or relevant-reinspection dwell guard fires).

## Expected outputs
- `codex review`: prioritized findings; no working tree edits.
- `codex-orchestrator review`: writes task-scoped manifest evidence into the saved review prompt artifact, applies diff-budget checks when `scripts/diff-budget.mjs` exists in the target repo root (auto-skips in downstream npm installs that do not ship that helper), passes that prompt inline for unscoped launches, swaps explicit scoped launches to bounded `--title` context while leaving the full prompt in `review/prompt.txt`, and fails fast if explicit scoped review also requests `--surface audit|architecture`, since those surfaces require full prompt context. It may emit a handoff prompt in non-interactive mode (see above).
