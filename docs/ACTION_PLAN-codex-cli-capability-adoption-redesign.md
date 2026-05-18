# ACTION_PLAN - Codex CLI Capability Adoption + Low-Friction Downstream Reliability (0975)

## Summary
- Goal: improve real downstream adoption reliability with minimal additive changes.
- Scope: bootstrap/config packaging, help UX, delegation repo pinning, explicit fallback visibility, downstream issue logging, scenario-based user-flow validation, and observability contract checks.
- Assumptions: managed Codex CLI remains optional; MCP-first remains default; bootstrap-first behavior is preferred over fallback dependence.

## Milestones & Sequencing
1) Docs-first scaffolding + task/spec registration/mirrors.
2) Capture docs-review manifest and delegated evidence references.
3) Implement minimal CLI/template/packaging fixes.
4) Update docs and tests to match behavior.
5) Run required checks + manual downstream smoke + standalone/elegance review.
6) Follow-up intake from active downstream repo (`tower-defence`) and triage into this task.
7) Address imported open items (CO-002..CO-004) and close remaining resilience gaps.
8) Deliberated mandate slice: fallback visibility + issue logging + scenario/observability enforcement.
9) Approved next-action slice: auto failure issue logging + strict config no-fallback mode + quote-helper centralization.
10) Final resilience slice: standalone review startup-loop fail-fast + task-scoped manifest selection + failure issue-log automation.
11) Runtime/operability slice: validate direct long-run review behavior and apply interim wrapper reliability policy (later superseded by scope-first root-cause mitigation).
12) Monitoring/repro validation slice: add patience-first long-run review checkpoints and re-test direct `codex review --uncommitted` in a mock repo before final residual-risk classification.
13) Root-cause mitigation slice: add large-scope uncommitted review preflight/advisory so CO-scale diffs are treated as high-latency scope rather than delegation-startup failures.
14) Capability-aligned review defaults slice: remove delegation-off-by-default reliance and keep delegation available by default with explicit disable controls.

## Dependencies
- Existing pipeline config loading (`repo -> package fallback`) behavior.
- Delegation setup wiring.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Manual smoke:
  - downstream fixture copy under `/tmp` with `init codex`, `setup --yes`, `doctor --format json`, `flow --task <id>`/`start diagnostics` checks.
  - issue-bundle generation from a simulated downstream failure (`doctor --issue-log`).
  - nested-cwd run failure with auto issue logging enabled to verify repo-scoped artifact routing.

## Risks & Mitigations
- Risk: behavior drift across packaged vs repo-local config.
  - Mitigation: make bootstrap-first the explicit recommended path; keep fallback compatibility covered but non-primary.
- Risk: help-path fixes regress argument parsing.
  - Mitigation: add command-surface tests for `start --help`, `init --help`, and `plan --help`.
- Risk: cloud preflight/runtime source mismatch creates false negatives.
  - Mitigation: align preflight env-id resolution with runtime metadata chain and add focused tests.
- Risk: operator blind spots during long cloud runs.
  - Mitigation: surface `cloud_execution` metadata early and keep status/watch pointers in manifest output.
- Risk: compatibility fallbacks remain invisible and become accidental defaults.
  - Mitigation: emit explicit fallback markers in run outputs/manifests and test for them.
- Risk: downstream bug reports lack reproducible evidence.
  - Mitigation: add one-command issue bundle generation with run + environment context.
- Risk: failure logging remains manual and gets skipped in real workflows.
  - Mitigation: add opt-in automatic failure issue logging for `start`/`flow`.
- Risk: packaged compatibility fallback remains accidental steady-state in advanced lanes.
  - Mitigation: add strict config fallback policy for fail-fast lanes.
- Risk: command preview quoting diverges across setup surfaces.
  - Mitigation: centralize shell-quoting helper and add targeted tests.
- Risk: regression coverage misses real-user workflows.
  - Mitigation: require scenario-style fixture tests and observability contract assertions.
- Risk: standalone `codex review` can hang in delegation startup loops while still emitting output.
  - Mitigation: harden wrapper with delegation-startup loop detection and bounded termination (separate from no-output stall timeout).
- Risk: review evidence can bind to stale manifests from unrelated task IDs when `--task` is omitted.
  - Mitigation: default review manifest filtering to active task env (`MCP_RUNNER_TASK_ID`/`TASK`) and add regression coverage.
- Risk: bounded timeout defaults can prematurely terminate legitimate long-running reviews.
  - Mitigation: make wrapper timeout/stall/startup-loop guards opt-in via env configuration.
- Risk: delegation MCP startup path can degrade review reliability in specific environments.
  - Mitigation: keep delegation available by default and provide explicit disable controls for targeted troubleshooting.
- Risk: unbounded review runs can appear stalled with low operator visibility.
  - Mitigation: add non-intrusive patience-first monitor checkpoints (elapsed/idle) without forcing default termination caps.
- Risk: startup-loop findings may be CO-repo-specific and overgeneralized.
  - Mitigation: run and archive simulated/mock-repo reproduction evidence for direct `codex review --uncommitted`.
- Risk: CO-scale uncommitted diffs trigger very long review traversals and get mistaken for startup-loop failures.
  - Mitigation: add explicit wrapper scope detection + advisory prompt shaping to prioritize high-signal findings earlier.
- Risk: keeping delegation disabled by default suppresses capability adoption despite scope-first root cause.
  - Mitigation: re-enable delegation-by-default for wrapper review path and document explicit disable controls for troubleshooting.

## Deliberation Outcome (2026-02-19)
- Delegate evidence stream: `019c74b5-d70a-7422-83c0-fd229c0b771f`.
- Recommended execution order:
  1. CO-004 logging clarity (lowest risk, immediate diagnostics value).
  2. CO-002 cloud preflight/runtime env-id parity (correctness fix).
  3. CO-003 early `cloud_execution` population during in-progress runs (highest complexity).
- Fallback policy:
  - Keep package fallback for compatibility.
  - Treat bootstrap-first (`init/setup`) as primary path and make fallback usage explicit in diagnostics/guidance.

## Deliberation Outcome (Post-Approval Mandates, 2026-02-19)
- Delegate evidence stream: `019c772e-615c-7100-b26a-bf65afed174c`.
- Chosen implementation option:
  - Minimal additive slice (recommended): fallback visibility + issue bundle logging + scenario fixture tests + observability contract tests.
- Deferred by design:
  - New profile/policy CLI surface.
  - Remote sink integrations for issue bundles.

## Approvals
- Reviewer: user
- Date: 2026-02-19
