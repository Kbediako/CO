# ACTION_PLAN - CO workflow: preflight provider helper constraints before worker retries

## Summary
- Goal: define and later implement provider-worker preflight and retry truth so deterministic child-lane and follow-up helper failures are avoided or corrected before they burn turns, Linear/GitHub budget, or parent acceptance time.
- Scope: docs-first packet, parent-owned registry mirrors, provider worker guidance/preflight, child-lane launch feedback, provider truth/retry suppression, zero-byte read-only child-lane classification, and focused regression/eval evidence based on the `CO-184` trace.
- Assumptions:
  - The parent lane owns the authoritative issue workspace, Linear state, workpad, PR lifecycle, registry updates, and implementation.
  - This child lane is docs-only and leaves implementation/test/eval files untouched.
  - Existing guardrails remain valid: phase-scoped child-lane validation, clean-parent checks, parity matrix enforcement, and parent acceptance authority.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `provider_worker_child_lane_scope_missing`, `provider_worker_child_lane_parent_dirty`, `provider_worker_child_lane_scope_conflict`, `linear_follow_up_parity_matrix_missing`, `classification`, `analysis`, `docs`, `implementation`, `tests`, `.tmp/workpad.md`, zero-byte child-lane patch handling, `provider-linear-worker-linear-audit.jsonl`, and `provider-linear-worker-proof.json`.
- Not done if: unsupported `classification,analysis` child-lane phase calls, parent-dirty launch failures, deterministic parity-matrix follow-up retries, or zero-byte child-lane output can still pass without useful preflight, changed inputs, retry suppression, or parent evidence.
- Pre-implementation issue-quality review: approved from the `CO-185` issue body on 2026-04-15. The packet is not narrower than the request because it includes helper constraint preflight, deterministic retry handling, zero-byte read-only lane proof, target surfaces, regression/eval evidence, and explicit non-goals.

## Non-goals
- Do not weaken child-lane phase validation, clean-parent enforcement, parity matrix enforcement, or parent-owned child-lane acceptance authority.
- Do not silently add `classification` or `analysis` as supported child-lane phases; supported phases remain `docs`, `implementation`, and `tests` unless a separate phase-to-path contract update lands.
- Do not broaden `CO-184`, `CO-183`, scheduler accounting, active-worker accounting, or Linear dispatch lifecycle scope.
- Do not mask `provider_worker_child_lane_scope_missing`, `provider_worker_child_lane_parent_dirty`, `provider_worker_child_lane_scope_conflict`, `linear_follow_up_parity_matrix_missing`, `.tmp/workpad.md`, zero-byte child-lane patch handling, `provider-linear-worker-linear-audit.jsonl`, or `provider-linear-worker-proof.json` as successful hidden outcomes.

## Parity Matrix
| Criterion | Current | Reference | Target |
| --- | --- | --- | --- |
| Child-lane phase contract | Workers can still attempt unsupported `classification,analysis` before helper constraints are surfaced. | Supported phases are `docs`, `implementation`, and `tests`; unsupported phases fail closed. | First-turn/continuation guidance exposes the supported set and routes classification or analysis needs through serial parent evidence or a supported phase. |
| Parent-dirty recovery | `.tmp/workpad.md` can dirty the parent and burn a child-lane launch. | Clean-parent checks remain authoritative, with scratch artifacts handled explicitly. | Workpad scratch state has deterministic recovery guidance and only the explicit `.tmp/workpad.md` scratch path is ignored. |
| Follow-up retry truth | `linear_follow_up_parity_matrix_missing` can be retried in the same attempt without changed inputs. | Parity/alignment follow-ups require a parity matrix. | Duplicate retries are suppressed unless a matrix is supplied or the follow-up is reclassified as non-parity/alignment. |
| Zero-byte advisory output | A zero-byte child-lane patch can be treated as successful proof. | Parent accepts only useful patches or explicit advisory evidence. | Zero-byte read-only lanes produce usable summary/artifact evidence or are rejected as no-output advisory with a parent-owned path. |

## Milestones & Sequencing
1. Create the docs-first packet and child-lane task mirrors for `20260415-linear-9a54c7d8-518f-4452-95aa-c5852008b38d`.
2. Parent imports the patch and updates parent-owned registry mirrors: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Parent runs docs-review or records an explicit parent-owned review path before implementation.
4. Implement supported child-lane phase preflight in provider guidance, helper output, or both.
5. Implement deterministic parent-dirty and scope-conflict recovery guidance before child-lane retry.
6. Implement same-attempt truth to suppress duplicate `create-follow-up` retries after `linear_follow_up_parity_matrix_missing` unless inputs change correctly.
7. Implement zero-byte read-only child-lane output classification so parent evidence remains useful.
8. Add focused regression/eval coverage based on the `CO-184` trace and run parent validation gates.

## Dependencies
- `CO-184` source trace artifacts:
  - `.runs/linear-237c874c-c05f-4947-949a-573043fc575f/cli/2026-04-15T00-07-01-311Z-7ee89ac0/provider-linear-worker-linear-audit.jsonl`
  - `.runs/linear-237c874c-c05f-4947-949a-573043fc575f/cli/2026-04-15T00-07-01-311Z-7ee89ac0/provider-linear-worker-proof.json`
- Existing supported child-lane phase contract: `docs`, `implementation`, `tests`.
- Existing follow-up parity/alignment contract requiring a parity matrix.
- Existing parent-owned child-lane acceptance/reject/invalidate lifecycle.

## Validation
- Child lane checks:
  - `git diff --check -- docs/PRD-linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md docs/TECH_SPEC-linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md docs/ACTION_PLAN-linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md tasks/specs/linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md tasks/tasks-linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md .agent/task/linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Parent implementation checks:
  - Focused tests for provider worker guidance/preflight and retry truth.
  - Focused child-lane shell/phase-contract tests.
  - Focused follow-up helper or provider truth tests.
  - Provider adoption/eval fixture proving preflight, intentional child-lane launch or serial fallback, no duplicate deterministic mutation failures, and useful parent evidence.
  - Normal parent-owned validation and review gates for touched implementation surfaces.
- Rollback plan:
  - Revert the implementation and this packet together if the issue-shaping contract is wrong. Do not weaken existing helper validation or parity enforcement as rollback.

## Risks & Mitigations
- Risk: preflight guidance hides real helper failures instead of preventing them.
  - Mitigation: keep failed helper calls visible in audit/proof while suppressing duplicate deterministic retries only after unchanged inputs are proven.
- Risk: adding `classification` or `analysis` as phases silently weakens scope semantics.
  - Mitigation: require phase-to-path contract, docs, and tests together before adding phases.
- Risk: parent-dirty recovery weakens clean-parent checks.
  - Mitigation: preserve clean-parent validation and provide sequencing/recovery guidance rather than broad bypasses.
- Risk: zero-byte output is reclassified too leniently.
  - Mitigation: require a usable summary/artifact or explicit no-output advisory plus parent-owned evidence path.

## Approvals
- Reviewer: pending parent review and docs-review.
- Date: pending.
