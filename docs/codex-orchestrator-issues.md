# Codex Orchestrator Issues Log

Purpose:
- Track concrete Codex Orchestrator (CO) friction points observed in this repo so they can be addressed upstream.

## Current status (2026-02-23 follow-up)
- `nested` and `git-boundary` issue-log routing friction is addressed in `orchestrator/src/cli/doctorIssueLog.ts`.
- Coverage is locked by `orchestrator/tests/_reproIssueLogTask.test.ts` (including ambient `CODEX_ORCHESTRATOR_ROOT` conflict cases).
- Remaining historical entries below are retained as capture history.
- Open issues: `<none>`.

## 2026-02-19

### CO-20260219-000000: Template entry
- Logged via: `codex-orchestrator doctor --issue-log`
- Captured at: 2026-02-19T00:00:00.000Z
- Repo root: `.`
- Task filter: `<none>`
- Doctor status: `ok`
- Cloud preflight: `not-run`
- Latest run context: `<none found under .runs>`
- Notes: Replace this template entry with real issue captures.
- Bundle JSON: `out/<resolved-task>/doctor/issue-bundles/<timestamp>.json`
- Resolution: closed as placeholder/template-only (non-runtime issue).

## 2026-02-20

### CO-20260220-165425: nested
- Logged via: `codex-orchestrator doctor --issue-log`
- Captured at: 2026-02-20T16:54:25.284Z
- Repo root: `/Users/kbediako/Code/CO`
- Task filter: `<none>`
- Doctor status: `ok`
- Cloud preflight: `not-run`
- Latest run id: `2026-02-20T16-54-01-881Z-2a5f9878`
- Latest run status: `in_progress`
- Latest run pipeline: `diagnostics`
- Latest run manifest: `.runs/0976-context-alignment-checker-option2-scout/cli/2026-02-20T16-54-01-881Z-2a5f9878/manifest.json`
- Bundle JSON: `/Users/kbediako/Code/CO/out/0976-context-alignment-checker-option2-scout/doctor/issue-bundles/20260220T165425284Z-nested.json`
- Resolution: addressed by repo-root selection hardening in `orchestrator/src/cli/doctorIssueLog.ts`; regression coverage in `orchestrator/tests/_reproIssueLogTask.test.ts`.

### CO-20260220-165427: git-boundary
- Logged via: `codex-orchestrator doctor --issue-log`
- Captured at: 2026-02-20T16:54:27.798Z
- Repo root: `/Users/kbediako/Code/CO`
- Task filter: `<none>`
- Doctor status: `ok`
- Cloud preflight: `not-run`
- Latest run id: `2026-02-20T16-54-01-881Z-2a5f9878`
- Latest run status: `in_progress`
- Latest run pipeline: `diagnostics`
- Latest run manifest: `.runs/0976-context-alignment-checker-option2-scout/cli/2026-02-20T16-54-01-881Z-2a5f9878/manifest.json`
- Bundle JSON: `/Users/kbediako/Code/CO/out/0976-context-alignment-checker-option2-scout/doctor/issue-bundles/20260220T165427798Z-git-boundary.json`
- Resolution: addressed by repo-root selection hardening in `orchestrator/src/cli/doctorIssueLog.ts`; regression coverage in `orchestrator/tests/_reproIssueLogTask.test.ts`.

## 2026-02-21

### CO-20260221-034905: nested
- Logged via: `codex-orchestrator doctor --issue-log`
- Captured at: 2026-02-21T03:49:05.903Z
- Repo root: `/Users/kbediako/Code/CO`
- Task filter: `<none>`
- Doctor status: `ok`
- Cloud preflight: `not-run`
- Latest run id: `2026-02-21T03-48-43-429Z-1baef3af`
- Latest run status: `failed`
- Latest run pipeline: `docs-review`
- Latest run manifest: `.runs/0977-shipped-feature-adoption-guidance/cli/2026-02-21T03-48-43-429Z-1baef3af/manifest.json`
- Bundle JSON: `/Users/kbediako/Code/CO/out/0977-shipped-feature-adoption-guidance/doctor/issue-bundles/20260221T034905903Z-nested.json`
- Resolution: addressed by repo-root selection hardening in `orchestrator/src/cli/doctorIssueLog.ts`; regression coverage in `orchestrator/tests/_reproIssueLogTask.test.ts`.

### CO-20260221-034908: git-boundary
- Logged via: `codex-orchestrator doctor --issue-log`
- Captured at: 2026-02-21T03:49:08.326Z
- Repo root: `/Users/kbediako/Code/CO`
- Task filter: `<none>`
- Doctor status: `ok`
- Cloud preflight: `not-run`
- Latest run id: `2026-02-21T03-48-43-429Z-1baef3af`
- Latest run status: `failed`
- Latest run pipeline: `docs-review`
- Latest run manifest: `.runs/0977-shipped-feature-adoption-guidance/cli/2026-02-21T03-48-43-429Z-1baef3af/manifest.json`
- Bundle JSON: `/Users/kbediako/Code/CO/out/0977-shipped-feature-adoption-guidance/doctor/issue-bundles/20260221T034908326Z-git-boundary.json`
- Resolution: addressed by repo-root selection hardening in `orchestrator/src/cli/doctorIssueLog.ts`; regression coverage in `orchestrator/tests/_reproIssueLogTask.test.ts`.
