# ACTION PLAN - CO Codex CLI 0.121.0 Sandbox/Security Preflight Classification

## Summary
- Goal: give the parent lane a registered docs-first packet for CO-199 before implementation.
- Scope: classify Codex CLI `0.121.0` sandbox/security release deltas by local/cloud preflight policy impact and define parent-owned validation.
- Assumptions: the child lane could not access the parent source-0 payload because the local `.runs` tree was absent; the parent reconciled source-0 and found run metadata plus prompt-pack provenance only.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - CO-199
  - Codex CLI `0.121.0`
  - `rust-v0.121.0`
  - local-only
  - cloud-only
  - both
  - not applicable
  - preflight policy
  - `danger-full-access`
  - macOS sandbox
  - private DNS
  - Unix socket allowlists
  - secure devcontainer profile
  - bubblewrap
  - MCP sandbox-state metadata
  - exec-server filesystem sandbox helper
  - `thread/shellCommand`
- Not done if:
  - the classification matrix is absent
  - local-only release notes become cloud blockers without cloud evidence
  - cloud-only messages change local sandbox policy
  - sandbox defaults are weakened
  - credential/profile rotation or broad cloud runtime redesign enters scope
- Pre-implementation issue-quality review:
  - approved for docs packet drafting. The issue has protected terms, a parity matrix, non-goals, and a validation checklist.

## Milestones & Sequencing
1. Register PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Parent reviews source-0 payload plus official `rust-v0.121.0` notes and confirms the final release-delta list.
3. Parent updates the classification matrix with source-0 reconciliation, `thread/shellCommand`, and issue-listed sandbox/security rows.
4. Parent identifies the narrow policy/docs/test surfaces that consume classification.
5. Parent implements only the minimum change needed to make local/cloud preflight classification truthful: advisory-only doctor output and policy docs.
6. Parent runs scoped tests first, then repo docs gates and review gates per normal CO policy.
7. Parent records PR/workpad/Linear evidence and resolves any `docs/TASKS.md` line-budget archival need.

## Dependencies
- CO-195 docs-first packet and final hold decision.
- Official `openai/codex` `rust-v0.121.0` release notes: `https://github.com/openai/codex/releases/tag/rust-v0.121.0`.
- Parent source payload: `../../.runs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1/cli/2026-04-16T03-09-04-252Z-6d0539ae/memory/source-0/source.txt` (metadata/provenance only; no added classification rows).
- CO cloud preflight and runtime policy docs.
- Existing docs freshness registry and task index conventions.

## Validation
- Child-lane checks:
  - JSON parse for edited registries
  - target file presence
  - CO-199 registry path presence
- Parent-lane checks:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused tests for any changed preflight classifier/policy helper
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - manifest-backed docs-review and implementation-gate
- Rollback plan: remove CO-199 policy implementation changes and leave this docs packet as a classification-only artifact, preserving the reason for any hold.

## Risks & Mitigations
- Risk: local macOS sandbox or WSL notes are treated as cloud canary blockers.
  - Mitigation: keep local-only rows explicit and require cloud evidence for cloud blockers.
- Risk: parent weakens sandbox defaults to match removed `danger-full-access` behavior.
  - Mitigation: classify removal as a local default-preservation item and ban default weakening.
- Risk: devcontainer/bubblewrap support is overgeneralized.
  - Mitigation: parent must prove whether the affected path is local devcontainer, cloud container, or both.
- Risk: missing source payload hides a relevant release delta.
  - Mitigation: parent must reconcile source-0 before implementation.

## Approvals
- Docs packet child lane: pending scoped validation.
- Parent docs-review: pending.
- Date: 2026-04-16
