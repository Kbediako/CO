# TECH_SPEC: Coordinator Linear and Telegram Provider Setup and Smoke Testing

## Context

The remaining Symphony-alignment wrapper work is exhausted after the frontend-test freeze. The next valuable work is provider setup and smoke validation for Linear and Telegram.

## Scope

- verify required Linear and Telegram configuration inputs
- perform bounded setup and smoke checks against the current provider-adjacent runtime surfaces
- capture explicit setup/testing evidence for operator handoff

## Requirements

1. Confirm the exact env/config/bootstrap prerequisites for Linear and Telegram.
2. Run setup and smoke validation with explicit evidence and honest stop/go outcomes.
3. Keep the first provider turn bounded to setup/testing; do not widen into unrelated refactors unless setup/testing exposes a concrete defect.
4. Preserve machine-checkable artifacts in `.runs/<task-id>/` and `out/<task-id>/`.

## Validation Plan

- provider-specific setup preflight checks
- targeted Linear smoke validation
- targeted Telegram smoke validation
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
