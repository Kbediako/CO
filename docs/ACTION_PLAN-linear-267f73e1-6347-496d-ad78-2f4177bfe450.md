# ACTION_PLAN - CO-351 Codex CLI 0.125.0 App-Server Control Seam Validation

## Added by Bootstrap 2026-04-24

## Summary
- Goal: create the docs-first packet and mirrors for CO-351 so the parent lane can validate Codex CLI 0.125.0 app-server control seam behavior using CO-relevant canaries and record an adoption-boundary decision.
- Scope: docs packet, canonical task spec, registry entry, task checklist, `.agent` mirror, and `docs/TASKS.md` snapshot only.
- Assumptions: the parent-provided source anchor and protected terms are authoritative; the docs child lane created the initial packet, and the parent lane owns source reconciliation, canary execution, and downstream state changes.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: Codex CLI 0.125.0, app-server control seam, `codex app-server --listen unix://...`, `app-server proxy --sock`, schema generation, remote thread store/config, sticky environments, resume/fork pagination, permission-profile round-trip, explicit untrusted project config, bursty WebSocket tool-output handling, `codex exec / codex exec resume`, official-doc/local-help mismatch for unix://.
- Not done if: the packet can be satisfied by release-note summarization; any protected surface is missing; parent-owned canaries or adoption-boundary decision are optional; or this child lane edits implementation, version policy, findings docs, validation artifacts, Linear/workpad state, or PR state.
- Pre-implementation issue-quality review: self-approved for docs-only packet work. The issue is not eligible for a micro-task shortcut because correctness depends on exact wording, exact control surfaces, and an explicit current/reference/target parity matrix.

## Milestones & Sequencing
1. Create the CO-351 PRD, docs TECH_SPEC, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register the canonical task spec in `tasks/index.json` under `items[]` and add the CO-351 `docs/TASKS.md` snapshot.
3. Self-review the packet for protected terms, current/reference/target parity, wrong interpretations, non-goals, Not Done If, and parent-owned canary/adoption-boundary criteria.
4. Leave parent-owned work pending: canary execution, version-policy edits, findings docs, validation, review, PR lifecycle, Linear state, and workpad updates.

## Dependencies
- Parent-provided source anchor: `ctx:sha256:57e3788049ac55221b4dd437196096c5dd036790ab40746609e075f7b776202f#chunk:c000001`.
- Docs child-lane manifest path: `.runs/linear-267f73e1-6347-496d-ad78-2f4177bfe450-docs-packet/cli/2026-04-24T20-46-46-959Z-a7f3b702/manifest.json`.
- Parent source payload path: `.runs/linear-267f73e1-6347-496d-ad78-2f4177bfe450/cli/2026-04-24T20-42-05-147Z-c64686a5/memory/source-0/source.txt`.
- Parent-owned local Codex CLI `0.125.0` help and command evidence.
- Parent-owned official documentation check for `unix://`.
- Existing CO fallback posture through `codex exec / codex exec resume`.

## Validation
- Child checks:
  - protected-term scan across the touched docs/checklist files
  - `node -e` JSON parse of `tasks/index.json`
  - `git diff --check --` scoped to the touched files
- Parent checks:
  - `codex app-server --listen unix://...` local canary with official-doc/local-help mismatch resolution
  - `app-server proxy --sock` local canary
  - schema generation canary
  - remote thread store/config canary
  - sticky environments canary
  - resume/fork pagination canary
  - permission-profile round-trip canary
  - explicit untrusted project config canary
  - bursty WebSocket tool-output handling canary
  - `codex exec / codex exec resume` fallback comparison
  - final adoption-boundary decision with evidence paths
- Parent canary result:
  - adopt the 0.125 app-server seam for explicit control-host/proof usage because socket/proxy/schema/config/permission/synthetic resume-fork/WebSocket checks passed; keep provider-supervision and provider-runtime fallback constraints because sticky environment use is blocked by missing worker environment configuration, real turn-backed pagination is still unproven, and normal promotion gates have not been completed for `0.125.0`.
  - evidence: `out/linear-267f73e1-6347-496d-ad78-2f4177bfe450/manual/codex-0125-appserver-canary/runtime-canary-summary.json`, `docs/findings/linear-267f73e1-6347-496d-ad78-2f4177bfe450-codex-0125-appserver-control-seam.md`, and `docs/guides/codex-version-policy.md`.
- Rollback plan: parent can discard this packet or narrow CO-351 if the canary scope proves too broad; no runtime state is changed by this child lane.

## Risks & Mitigations
- Risk: release-note prose is mistaken for adoption evidence.
  - Mitigation: every acceptance surface requires a parent-owned canary and adoption-boundary decision.
- Risk: `unix://` behavior is assumed from either docs or local help alone.
  - Mitigation: packet requires explicit reconciliation of the official-doc/local-help mismatch for unix://.
- Risk: app-server adoption weakens the current provider-worker path.
  - Mitigation: packet keeps `codex exec / codex exec resume` fallback as current truth until sticky environment and real turn-backed pagination evidence says otherwise.
- Risk: child lane accidentally widens into implementation or validation.
  - Mitigation: action plan and checklists mark those items as parent-owned pending work.

## Approvals
- Reviewer: docs child lane self-review complete; parent docs-review reran after current-main reconciliation and passed with `review_outcome=clean-success` at `.runs/linear-267f73e1-6347-496d-ad78-2f4177bfe450-docs-review/cli/2026-04-24T21-41-26-157Z-b91030b3/review/telemetry.json`.
- Date: 2026-04-24
