# **Technical Spec — Derived Snapshot**

> **Source of truth:** tasks/specs/tech-spec-0001-codex-orchestrator.md
>
> This snapshot highlights key points from the canonical spec. Append dated updates when approvals change or revisions land.

## Added by Orchestrator 2025-10-16

- **Scope:** Agents SDK manager with planner/builder/tester/reviewer peers; dual execution modes via Codex MCP and Codex Cloud.
- **Data & Persistence:** Task state manifests under `/out/`, run artifacts in `.runs/`, advisory lock files to prevent parallel collisions; run manifests mirrored to Codex Cloud via `cloud-sync` worker using manifest hashes for idempotency.
- **Mode Policy:** Default to MCP mode unless task metadata signals `execution.parallel=true`; selected mode recorded in manifest and guardrail logged.
- **Learning Library:** Codemods, linters, templates tracked in `patterns/` with versioned index; adapters + evaluation harness ensure portability.
- **Security:** Safe approval defaults, spec guard enforcement, Vault-backed credential broker keeps MCP/Cloud tokens ephemeral and memory only.
- **Approvals:** Architecture, Security, and DX reviewers signed off on 2025-10-16.

## Update — 2025-10-16 Learning Library Ingestion Flow

1. **Authoring & Tests**
   - Builders add new codemods, lint rules, or templates under `patterns/` and register them in `patterns/index.json` with semantic version bumps.
   - `npm run build:patterns` emits compiled artifacts into `dist/patterns/**`; `npm test -- patterns` must pass before ingestion.
2. **Manifest & Spec Gate**
   - The implementation agent records assets and validation logs inside `.runs/<task>/<run>/manifest.json`, referencing the learning-library mini-spec (`tasks/specs/0003-learning-library.md`).
   - Spec guard verifies the mini-spec `last_review` date ≤30 days prior to accepting new assets.
3. **Sync to Codex Cloud**
   - When `cloud-sync` processes the run manifest it uploads asset metadata to the Codex Cloud learning catalog using the manifest hash for idempotency.
   - Sync receipts append to `/out/audit.log`; failures trigger reviewer follow-up with the run checklist template (`patterns/templates/run-manifest-checklist.md`).
4. **Consumption**
   - Agents read `patterns/index.json` to discover the latest assets and wire them into adapters/evaluation harness flows during subsequent tasks.

## Update — 2025-10-16 Adapters Evaluation Harness

- **Adapter Schema:** Commands gain optional `evaluation` overrides (cwd/env/guard tags) so scenarios run deterministically without mutating source assets; planner helpers validate adapter + goal combinations before execution.
- **Harness Workflow:** `evaluation/harness/index.ts` exposes `runScenario`/`runAllScenarios` that read JSON scenario manifests, spawn adapter commands with timeouts, and persist structured results under `.runs/<task>/<run>/evaluation/`.
- **Fixtures & Patterns:** Fixtures (e.g., TypeScript smoke, Python lint) live in `evaluation/fixtures/**` with README guidance and optional pattern assertions referencing learning library assets.
- **Validation:** `npm run eval:test` executes Vitest suites covering planner, reporter, and scenario smoke tests so evaluation joins the standard build/lint/test gating.
- **Guardrails:** Harness defaults to MCP-safe mode, redacts sensitive env vars before logging, and enforces spec guard freshness (`last_review ≤30 days`) prior to syncing results to Codex Cloud.

## Update — 2025-10-16 Guardrails & Approvals
- `scripts/spec-guard.sh` now validates mini-spec freshness (≤30 days) and provides a dry-run mode for local testing.
- `.github/workflows/spec-guard.example.yml` documents how to enable CI enforcement, including fetching the full git history and exporting `BASE_SHA` for pull requests.
- Approval metadata (mode, reviewer decisions) must be recorded inside `.runs/<task>/<timestamp>/manifest.json`; see `.runs/6/2025-10-16T18-19-14Z/manifest.json` for Task 6 evidence.
- Mirrors (`AGENTS.md`, `.agent/readme.md`, `.agent/SOPs/specs-and-research.md`) describe build/test commands, execution mode policy, and MCP registration steps aligned with the canonical spec.
