# PRD - CO-488 Plugin Hook, Cache, and External Config Import Governance

## Summary
- Problem Statement: Codex CLI 0.128.0 expands plugin behavior through plugin-bundled hooks, hook enablement state, remote plugin bundle cache handling, remote uninstall, and external-agent config import. CO has rebaselined marketplace install flows, but these new surfaces still need a governed implementation contract before the issue can move to review.
- Desired Outcome: CO-488 captures live 0.128 evidence and hardens packaged-plugin docs plus pack-smoke so plugin-bundled hooks, hook enablement state, remote plugin bundle cache/uninstall behavior, and external-agent config import cannot silently bypass downstream packaged plugin governance.

## User Request Translation (Context Anchor)
- User intent / needs: Complete the active provider-worker lane for CO-488 without duplicating marketplace command rebaseline work, absorbing CO-450 binary provenance, or trusting imported hooks/config without an explicit safety contract.
- Success criteria / acceptance: Live 0.128 command or release-note evidence is recorded; packaged-plugin docs and pack-smoke expectations cover hook/cache/import surfaces; concrete gaps are implemented with focused tests; hook/import behavior is classified as allowed, blocked, or out of scope.
- Constraints / non-goals: Do not rewrite marketplace command support, do not broaden into CO-450 binary provenance, do not blanket-disable plugins, and do not adopt arbitrary imported hook/config behavior without validation.

## Intent Checksum
- Exact user wording / phrases to preserve: "issues are labelled properly"; "related issues are linked"; "we shouldn't just patch then over"; "dive deep get to the root cause and fix it".
- Protected terms / exact artifact and surface names: plugin-bundled hooks, hook enablement state, remote plugin bundle cache, remote uninstall, external-agent config import, marketplace install flow, pack-smoke, downstream packaged plugin governance, `codex-orchestrator:canonical-owner-key=codex-cli-0128:plugin-hook-import-governance`, `backlog_head_follow_up_traceability_pending`.
- Nearby wrong interpretations to reject: Do not duplicate marketplace command rebaseline work. Do not fold in CO-450 binary provenance. Do not trust imported hooks or config without a safety contract. Do not treat a packet-only branch as implementation completion.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Marketplace install flow | CO already rebaselined marketplace add/upgrade/remove smoke paths. | Packaged downstream users need marketplace behavior to stay covered by pack-smoke. | CO-488 reuses that baseline while adding hook/cache/import governance expectations. | Rewriting marketplace command support. |
| Plugin-bundled hooks | CLI 0.128.0 can carry hooks with plugin bundles and preserve hook enablement state. | CO packaging must not let plugin-provided hooks bypass hook safety or operator visibility. | Pack-smoke fails closed if the packaged or cached plugin declares plugin-bundled hooks or hook enablement state without explicit CO hook governance. | Blanket disabling plugins. |
| Remote bundle cache / uninstall | Remote bundle cache and remote uninstall affect what packaged users may execute or retain. | Pack-smoke should catch stale cache/uninstall assumptions that change packaged behavior. | Pack-smoke keeps cache-shape coverage and docs classify remote cache/uninstall as downstream packaged behavior, not CO-450 binary provenance. | Binary provenance, owned by CO-450. |
| External-agent config import | Imported external-agent config may alter CO behavior if accepted uncritically. | CO config/import behavior needs explicit boundaries and validation. | Pack-smoke fails closed if packaged/cached plugin artifacts include external-agent import outputs; docs require ungoverned imports to stay disabled or fail closed. | Arbitrary external-agent adoption. |

## Not Done If
- CO-488 leaves Backlog without the six packet files and registry mirrors.
- Plugin-bundled hooks or imported external-agent config can change CO behavior without an explicit governance contract.
- Pack-smoke ignores hook/cache/import surfaces that affect packaged downstream users.
- The lane duplicates marketplace command rebaseline work instead of focusing on hooks, cache, uninstall, and import governance.
- The lane absorbs CO-450 binary provenance or trusts imported hook/config behavior without validation.

## Goals
- Keep the CO-488 docs-first packet and mirrors current with the active implementation.
- Preserve the canonical owner key and protected plugin governance terms.
- Add the smallest pack-smoke guardrail for hook/cache/import surfaces that affect packaged downstream users.
- Document the allowed, blocked, and explicitly out-of-scope hook/import/cache behavior.

## Non-Goals
- No broad plugin marketplace command rewrite.
- No binary provenance work owned by CO-450.
- No blanket plugin disabling.
- No adoption of arbitrary imported hook behavior without explicit governance and validation expectations.

## Stakeholders
- Product: CO operator workflow and downstream packaged users.
- Engineering: Codex Orchestrator provider-worker, plugin packaging, hook safety, and pack-smoke maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: CO-488 has registered packet files, task index entry, docs/TASKS snapshot, docs freshness rows, live 0.128 evidence, focused pack-smoke tests, and package docs that expose the hook/cache/import governance contract.
- Guardrails / Error Budgets: Implementation must fail closed on ungoverned packaged hooks/imported config and must keep CO-450 binary provenance separate.

## User Experience
- Personas: CO operator, provider worker, downstream packaged CO user.
- User Journeys: The operator can hand the existing PR to review knowing the packet, docs, and pack-smoke now make packaged plugin hook/cache/import behavior explicit rather than silently trusted.

## Technical Considerations
- Architectural Notes: The implementation should extend existing plugin/pack-smoke governance and hook/config import boundaries instead of creating an out-of-band cleanup path.
- Dependencies / Integrations: Codex CLI 0.128 plugin behavior, plugin marketplace install flow, pack-smoke, hook enablement state, external-agent config import, CO-450 binary provenance boundary.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the silent-trust seam for imported plugin hooks/config; implementation must either govern and validate these surfaces or fail closed.
- Owner: CO-488.
- Trigger: Plugin-bundled hook, hook enablement, remote bundle cache/uninstall, or external-agent config import affects packaged CO behavior.
- Introduced date: 2026-05-03, when CO-488 was created from Codex CLI 0.128.0 release-intake follow-up evidence.
- Review date: 2026-05-14.
- Maximum lifetime: No retained fallback for hook/import silent trust; remote cache/uninstall assumptions expire by 2026-06-12 unless covered by pack-smoke or focused validation.
- Removal condition: Hook/cache/import behavior has explicit governance, docs, and pack-smoke or focused validation.
- Validation: Protected-term scan, JSON registry checks, spec guard, docs checks, focused pack-smoke tests, and current-head review gates.
- Large-refactor check: A bounded implementation is acceptable if it stays inside existing plugin packaging, hook safety, config import, and pack-smoke seams; if authority is split across multiple import paths, the provider-worker lane should choose a larger consolidation rather than another minor bypass.
- Minor-seam decision: Bounded guard changes are acceptable because `pack-smoke` is already the package authority and the selected implementation removes silent trust instead of adding a second runtime path.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plugin hook/import governance | Plugin-bundled hooks or imported external-agent config can be trusted without CO safety checks. | remove fallback | CO-488 | Plugin hook/config import behavior affects packaged CO behavior. | 2026-05-03 | 2026-05-13 | N/A after implementation | Hook/import behavior is governed and validated, or fails closed. | Focused plugin/hook/import tests plus pack-smoke coverage or explicit non-applicability evidence. |
| Remote plugin bundle cache/uninstall | Cached remote plugin bundles or uninstall behavior can bypass packaged smoke expectations. | expire fallback | CO-488 | Remote plugin cache or uninstall behavior is used by packaged downstream users without deterministic CO coverage. | 2026-05-03 | 2026-05-13 | 2026-06-12 | Pack-smoke or focused validation covers cache/uninstall semantics, or the surface is documented as out of scope with fail-closed behavior. | Pack-smoke and focused cache/uninstall regression evidence. |

## Open Questions
- Should direct, non-follow-up release-intake issue creation scaffold packet files automatically, or should CO-531 extend the helper family to cover direct issue creation as a separate follow-up?

## Approvals
- Product: Active provider-worker implementation lane.
- Engineering: Packet self-approved for Backlog traceability setup on 2026-05-13; implementation refresh in progress on 2026-05-14.
- Design: Not applicable.
