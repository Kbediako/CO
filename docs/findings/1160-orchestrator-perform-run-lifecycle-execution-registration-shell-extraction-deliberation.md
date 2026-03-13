# Findings - 1160 Orchestrator Perform-Run-Lifecycle Execution-Registration Shell Extraction

- Date: 2026-03-13
- Reviewer: Codex (top-level agent)
- Task: `1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction`

## Why this seam next

`1159` removed the execution-routing shell from `orchestrator.ts`, leaving `performRunLifecycle(...)` as the remaining dense orchestration-local cluster that still assembles the routed executor closure and TaskManager bridge inline. That cluster is a truthful seam because it is narrower than a general lifecycle refactor and can move without reopening control-plane, scheduler, or run-summary authority.

## Bounded scope

- `executingByKey` dedupe map
- `executePipeline` closure assembly
- `latestPipelineResult` / `getResult`
- TaskManager construction inputs that belong to the execution-registration shell

## Explicit non-goals

- no control-plane guard extraction
- no scheduler extraction
- no run-summary writer extraction
- no public `start()` / `resume()` refactor

## Pre-implementation approval

Approved for docs-first registration as the next bounded Symphony-aligned seam after `1159`.
