# PRD - CO-379 retire stale 0.124 evidence-book residue

## Traceability
- Linear issue: `CO-379` / `f838cbde-8bb6-46de-bde2-b749f2e64422`
- Linear title: `CO: retire stale 0.124 evidence-book residue after Codex 0.125 adoption`
- Task id: `linear-f838cbde-8bb6-46de-bde2-b749f2e64422`
- Canonical spec: `tasks/specs/linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- Source anchor: `ctx:sha256:36aecdd1d31f000742d130136fe00806039121e7d92db144db5a9726604ea238#chunk:c000001`

## Summary
- Problem Statement: current `origin/main` has already adopted Codex CLI `0.125.0` plus `gpt-5.5` / `xhigh` for validated CO-local ChatGPT-auth/appserver posture, but before this lane the book still exposed the former docs/book/codex-cli-0124-adoption.md page path, which could be mistaken for current posture even though the content said it was historical.
- Desired Outcome: preserve the CO-341/CO-345 `0.124.0` evidence while moving or renaming it into an explicitly historical/archive surface and keeping current-facing docs aligned to Codex CLI `0.125.0`, `gpt-5.5` / `xhigh`, and the intentional portable `gpt-5.4` fallback boundary.

## User Request Translation
- User intent / needs: remove confusing active-book residue from the old `0.124.0` adoption page without deleting useful historical evidence, then prove the current docs still communicate the `0.125.0` posture split correctly.
- Success criteria / acceptance:
  - audit the former docs/book/codex-cli-0124-adoption.md path, book index, README links, and version-policy references
  - no current-facing book/docs path implies `0.124.0` is current CO-local posture
  - CO-341/CO-345 evidence is preserved through archive, rename, or explicit historical demotion
  - current posture remains Codex CLI `0.125.0` plus `gpt-5.5` / `xhigh` for validated local ChatGPT-auth/appserver use
  - `gpt-5.4` appears only as an intentional portable fallback
  - requested docs checks and focused docs-hygiene coverage pass
- Constraints / non-goals:
  - do not re-audit external release truth beyond current repository evidence
  - do not change runtime defaults, workflow pins, model defaults, or package versions
  - do not delete CO-341/CO-345 historical evidence

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `retire stale 0.124 evidence-book residue`
  - `Codex 0.125 adoption`
  - former docs/book/codex-cli-0124-adoption.md path
  - `CO-341/CO-345 historical evidence`
  - `Codex CLI 0.125.0 + GPT-5.5/xhigh`
  - `GPT-5.4 only as fallback/portable wording`
- Protected terms / exact artifact and surface names:
  - `docs/book/archive/codex-cli-0124-adoption.md`
  - `docs/book/README.md`
  - `README.md`
  - `docs/README.md`
  - `docs/guides/codex-version-policy.md`
  - `docs/codex-posture-matrix.json`
  - `docs/docs-catalog.json`
  - `tests/docs-hygiene.spec.ts`
- Nearby wrong interpretations to reject:
  - deleting the old evidence page instead of preserving it
  - treating cloud-only `0.124.0` candidate wording as current local posture
  - reverting current `0.125.0` / `gpt-5.5` local posture back to `0.124.0` or `gpt-5.4`
  - broadening into a new release-intake or model-posture adoption lane

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Historical 0.124 evidence page | The former docs/book/codex-cli-0124-adoption.md path existed in the book and said it was historical. | CO-341/CO-345 evidence should remain available but not look like current posture. | Page is archived at `docs/book/archive/codex-cli-0124-adoption.md` and still records the old evidence boundary. | Deleting the page or re-running CO-341 probes. |
| Book/navigation index | `docs/book/README.md` links the old filename with historical wording. | Current navigation should make public posture current and old release evidence historical/archive-only. | Book index uses explicit historical/archive link text and target path. | Broad book restructure. |
| Current posture docs | README, docs README, public posture, and version policy already describe `0.125.0` / `gpt-5.5` local posture and portable fallback boundaries. | Current-facing docs should agree with the posture matrix. | No current-facing path or prose implies `0.124.0` is current local posture. | Changing workflow pins, cloud candidate, package version, or provider supervision policy. |
| Docs-hygiene coverage | Matrix/hygiene already enforces historical release evidence status. | Stale active release evidence should fail; explicit historical/archive status should pass. | Focused coverage is adjusted for the new historical/archive path so the stale `0.124` residue cannot return. | Replacing the posture matrix system. |

## Not Done If
- Any current-facing README, book index, or version-policy prose presents `0.124.0` as current CO-local posture.
- CO-341/CO-345 evidence is removed rather than preserved.
- `gpt-5.4` fallback wording is broadened into current local posture.
- The posture matrix or docs catalog still points at the stale active-book filename.
- Requested docs validation or focused docs-hygiene coverage is not run or has unresolved failures.

## Goals
- Move or rename the `0.124.0` evidence surface into a clearly historical/archive path.
- Keep index/catalog/matrix references coherent after the path change.
- Preserve current `0.125.0` / `gpt-5.5` posture wording and intentional fallback boundaries.
- Prove the cleanup through focused docs-hygiene coverage plus requested docs gates.

## Non-Goals
- No package, workflow, or runtime target changes.
- No new external release audit.
- No deletion of historical CO-341/CO-345 evidence.
- No broad docs freshness cleanup outside CO-379 packet registration.

## Stakeholders
- Product: CO maintainers and operators reading current posture docs.
- Engineering: docs-hygiene, docs-catalog, posture-matrix, and release-intake owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - current-facing docs mention `0.125.0` / `gpt-5.5` as current local posture where relevant
  - historical `0.124.0` evidence remains linked under explicit historical/archive status
  - `npm run docs:check`, `npm run docs:freshness`, focused docs-hygiene coverage, and diff budget pass or have explicit evidence-backed blockers
- Guardrails / Error Budgets:
  - zero deletion-only cleanup
  - zero model/runtime/workflow target movement
  - zero stale active `0.124.0` navigation references

## Technical Considerations
- Architectural Notes: this is a docs/catalog/test alignment change over existing posture-matrix and docs-hygiene surfaces.
- Dependencies / Integrations: Linear issue context, current `origin/main`, existing posture matrix, docs catalog, docs-hygiene tests.

## Open Questions
- None blocking; the implementation can choose archive versus historical rename based on the smallest coherent docs/catalog diff.

## Approvals
- Product: Linear CO-379 acceptance criteria
- Engineering: Codex provider worker
- Design: N/A
