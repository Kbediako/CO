---
id: 20260501-linear-7b8e48c8-3971-42ab-b779-949d810d4e6c
title: "CO-457 provider-worker resolved model provenance"
relates_to: docs/PRD-linear-7b8e48c8-3971-42ab-b779-949d810d4e6c.md
risk: medium
owners:
  - Codex
last_review: 2026-05-05
---

# TECH_SPEC - CO-457 provider-worker resolved model provenance

This mirror points to the canonical task spec at `tasks/specs/linear-7b8e48c8-3971-42ab-b779-949d810d4e6c.md`.

## Implementation Summary
- Create the CO-457 packet and registry mirrors for provider-worker resolved model provenance.
- Preserve the current local `gpt-5.5` / `xhigh` ChatGPT-auth/appserver posture when inherited.
- Preserve `gpt-5.4` as portable fallback only.
- Require structured provenance in `provider-linear-worker-proof.json` and `provider-linear-worker-session-log-hydration.json`.
- Expose provenance through `CO STATUS` and read-model surfaces.
- Prefer runtime-reported model/reasoning effort from `codex exec --json` and `codex exec resume --json` when available.
- Merge active Codex profile config over root defaults for config-derived provenance, including env/flag-selected profiles, root `profile = "..."`, and injected `-c profile=...` overrides.
- Seed proof-side provenance from matching signed session-log hydration state when older proofs predate the proof field.
- Do not preserve or re-sign hydration-state provenance when the current proof has no provenance.
- Record source/confidence/degraded reason when runtime model metadata is missing.

## Implementation Boundaries
- Packet setup edits only the CO-457 packet files, task index, task snapshot, and docs-freshness registry rows.
- Parent implementation may update provider-worker proof, hydration, CO STATUS, read-model, and focused tests.
- No model-default changes.
- No packaged/generated config migration from `gpt-5.4` to `gpt-5.5`.
- No binary provenance work beyond linking `CO-450`.
- No auth provenance work beyond linking `CO-451`.
- No broad provider-worker lifecycle refactor.
- No docs-freshness/spec-guard baseline repair.

## Provenance Contract
- A resolved-model provenance object should include:
  - model slug when known, such as `gpt-5.5` or `gpt-5.4`
  - `model_reasoning_effort` when known
  - source, such as `runtime_reported`, `command_override`, `config_default`, or `unknown`
  - confidence, such as `high`, `medium`, or `degraded`
  - degraded reason when source is not runtime authoritative
- Runtime-reported metadata wins over config inference.
- Explicit `--model` override, if supported in the parent implementation path, must be distinct from inherited default.
- Active `--profile` / `CODEX_PROFILE` config must be distinct from root config defaults; a requested missing profile must degrade rather than claim root config truth.
- Missing runtime metadata must not be recorded as authoritative model proof.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker resolved model provenance | Degraded proof path for missing runtime model or effort metadata | expire fallback | CO-457 | Codex JSONL omits runtime model metadata from provider-worker `codex exec --json` or resume output | 2026-05-05 | 2026-05-19 | 2026-06-04 | Codex runtime always emits authoritative model/reasoning metadata for provider-worker runs, or CO adopts a stronger proof source | Focused runtime-reported, inherited-config, command override, unknown/degraded, hydration, and read-model projection tests |

- Large refactor decision: no large refactor is justified; this remains a narrow proof/hydration/status projection extension under existing provider-worker authority.
- Minor seam decision: the temporary degraded-provenance seam is acceptable only with source, confidence, degraded reason, expiry metadata, and focused validation.

## Validation Contract
- Packet setup validation must show:
  - all six packet/mirror files exist
  - `tasks/index.json` parses and contains `20260501-linear-7b8e48c8-3971-42ab-b779-949d810d4e6c`
  - `docs/docs-freshness-registry.json` parses and contains six rows for the CO-457 packet/mirror docs
  - protected terms appear across packet and mirror surfaces
- Implementation validation must show:
  - no-`--model` inherited-config path records current local `gpt-5.5` truthfully without pretending runtime proof
  - active profile config merges over root defaults from env/flag selection, root `profile = "..."`, and injected `-c profile=...`, while requested missing profile config records degraded/unknown provenance
  - pre-existing signed session-log hydration state can backfill proof-side resolved model provenance while stale hydration signatures and skip-hydration re-signs are rejected
  - selected-run projection refreshes older proofs when hydration state can backfill missing model provenance
  - explicit override path records override source when supported
  - missing runtime model metadata records degraded/unknown output
  - `CO STATUS` terminal frames and read-model payloads expose provenance without hiding degraded evidence
