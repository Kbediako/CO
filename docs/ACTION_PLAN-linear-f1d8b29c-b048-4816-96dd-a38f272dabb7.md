# ACTION_PLAN - CO: Canary Codex 0.121 app-server event contracts before replacing provider JSONL/session-log truth

## Summary
- Goal: complete a docs/artifact canary that decides whether Codex CLI `0.121.0` app-server evidence can replace any CO provider JSONL/session-log truth.
- Scope: rework reset, release proof, generated schema capture, local app-server smoke, runtime canary, provider parity matrix, hold decision, validation, standalone review, elegance pass, and PR handoff.
- Boundary: no runtime switch, no authority expansion, no provider precedence change, no fallback removal.

## Sequence
1. Confirm Linear state and workpad. On `Rework`, close prior PR, delete the prior workpad, and restart on a fresh branch from current `origin/main`.
2. Record pre-turn decomposition and launch bounded child lane for app-server source evidence.
3. Accept or reject child lane output after patch review.
4. Refresh PRD, TECH_SPEC, ACTION_PLAN, task checklist, docs findings, and registry updates for the rework attempt.
5. Refresh release proof from npm, GitHub tags, and local binary.
6. Run app-server schema generation, stdio initialize smoke, thread injection smoke, and isolated runtime canary.
7. Map app-server event classes to CO provider proof fields.
8. Document hold/go. Current target is hold unless app-server covers provider proof fields without loss.
9. Run docs-review, repo gates, standalone review, elegance pass, and PR feedback drain before review-state handoff.

## Validation
- Evidence:
  - rework child lane manifest: `.runs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-docs-source-evidence-rework/cli/2026-04-16T11-30-38-094Z-926472c7/manifest.json`
  - parent finding: `docs/findings/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7-codex-0121-appserver-canary.md`
  - app-server smoke: `out/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7/manual/appserver-smoke-rework-20260416.json`
- Required gates:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `node scripts/runtime-mode-canary.mjs`
  - `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`
  - `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`
  - manifest-backed standalone review
  - explicit elegance/minimality pass

## Risks
- False parity: avoid treating schema availability as replacement proof for provider owner/status/audit fields.
- Privacy spill: do not commit raw app-server response items that can include prompt or instruction text.
- Contract instability: Guardian review payloads are generated with unstable warnings, so they cannot be provider-authoritative.
- Scope drift: do not add remote control or precedence changes in this lane.

## Rollback
- Revert docs/artifact changes if release or schema evidence is wrong. No runtime rollback is needed because this lane does not change provider execution behavior.
