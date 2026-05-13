# PRD - CO-488 Plugin Hook, Cache, and External Config Import Governance

## Summary
- Problem Statement: Codex CLI 0.128.0 expands plugin behavior through plugin-bundled hooks, hook enablement state, remote plugin bundle cache handling, remote uninstall, and external-agent config import. CO has rebaselined marketplace install flows, but these new surfaces still need a governed implementation contract before the backlog issue can leave Backlog.
- Desired Outcome: CO-488 has a complete docs-first packet and traceability mirrors so the eventual implementation can audit and harden plugin-bundled hooks, cache/uninstall behavior, and imported external-agent config without silently bypassing packaged downstream safety or pack-smoke expectations.

## User Request Translation (Context Anchor)
- User intent / needs: Continue queue orchestration by clearing the Backlog traceability hold for CO-488 without skipping the head of queue or starting implementation from an unregistered issue.
- Success criteria / acceptance: The packet preserves the protected plugin governance terms, rejects adjacent wrong scopes, registers the six packet files plus registry mirrors, and makes CO-488 ready for a provider-worker implementation lane.
- Constraints / non-goals: This packet does not implement hook/cache/import behavior, transition Linear, attach or merge a PR for implementation, or absorb CO-450 binary provenance.

## Intent Checksum
- Exact user wording / phrases to preserve: "issues are labelled properly"; "related issues are linked"; "we shouldn't just patch then over"; "dive deep get to the root cause and fix it".
- Protected terms / exact artifact and surface names: plugin-bundled hooks, hook enablement state, remote plugin bundle cache, remote uninstall, external-agent config import, marketplace install flow, pack-smoke, downstream packaged plugin governance, `codex-orchestrator:canonical-owner-key=codex-cli-0128:plugin-hook-import-governance`, `backlog_head_follow_up_traceability_pending`.
- Nearby wrong interpretations to reject: Do not duplicate marketplace command rebaseline work. Do not fold in CO-450 binary provenance. Do not trust imported hooks or config without a safety contract. Do not treat a packet-only branch as implementation completion.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Marketplace install flow | CO already rebaselined marketplace add/upgrade/remove smoke paths. | Packaged downstream users need marketplace behavior to stay covered by pack-smoke. | CO-488 reuses that baseline while adding hook/cache/import governance expectations. | Rewriting marketplace command support. |
| Plugin-bundled hooks | CLI 0.128.0 can carry hooks with plugin bundles and preserve hook enablement state. | CO packaging must not let plugin-provided hooks bypass hook safety or operator visibility. | Implementation must classify, document, and validate hook behavior before downstream packaging trusts it. | Blanket disabling plugins. |
| Remote bundle cache / uninstall | Remote bundle cache and remote uninstall affect what packaged users may execute or retain. | Pack-smoke should catch stale cache/uninstall assumptions that change packaged behavior. | Implementation should add the smallest deterministic coverage or guardrail for cache/uninstall governance. | Binary provenance, owned by CO-450. |
| External-agent config import | Imported external-agent config may alter CO behavior if accepted uncritically. | CO config/import behavior needs explicit boundaries and validation. | Imported config is either governed with documented safety checks or rejected/fails closed. | Arbitrary external-agent adoption. |

## Not Done If
- CO-488 leaves Backlog without the six packet files and registry mirrors.
- Plugin-bundled hooks or imported external-agent config can change CO behavior without an explicit governance contract.
- Pack-smoke ignores hook/cache/import surfaces that affect packaged downstream users.
- The lane duplicates marketplace command rebaseline work instead of focusing on hooks, cache, uninstall, and import governance.
- The lane absorbs CO-450 binary provenance or trusts imported hook/config behavior without validation.

## Goals
- Create the CO-488 docs-first packet and mirrors.
- Preserve the canonical owner key and protected plugin governance terms.
- Give the provider-worker lane a bounded implementation contract for hook/cache/import surfaces.
- Keep the packet narrow enough that implementation can later parallelize source audit and focused validation.

## Non-Goals
- No implementation changes in this packet.
- No broad plugin marketplace command rewrite.
- No binary provenance work owned by CO-450.
- No blanket plugin disabling.
- No adoption of arbitrary imported hook behavior without explicit governance and validation expectations.

## Stakeholders
- Product: CO operator workflow and downstream packaged users.
- Engineering: Codex Orchestrator provider-worker, plugin packaging, hook safety, and pack-smoke maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: CO-488 has registered packet files, task index entry, docs/TASKS snapshot, and docs freshness rows; protected-term scans find the hook/cache/import governance contract.
- Guardrails / Error Budgets: Packet-only scope must not edit implementation or lifecycle state; later implementation must fail closed on ungoverned imported hooks/config.

## User Experience
- Personas: CO operator, provider worker, downstream packaged CO user.
- User Journeys: The operator clears the queue admission hold with a truthful packet; the provider worker later implements the smallest governance changes and validates that packaged plugin behavior is not silently unsafe.

## Technical Considerations
- Architectural Notes: The implementation should extend existing plugin/pack-smoke governance and hook/config import boundaries instead of creating an out-of-band cleanup path.
- Dependencies / Integrations: Codex CLI 0.128 plugin behavior, plugin marketplace install flow, pack-smoke, hook enablement state, external-agent config import, CO-450 binary provenance boundary.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the silent-trust seam for imported plugin hooks/config; implementation must either govern and validate these surfaces or fail closed.
- Owner: CO-488.
- Trigger: Plugin-bundled hook, hook enablement, remote bundle cache/uninstall, or external-agent config import affects packaged CO behavior.
- Introduced date: 2026-05-03, when CO-488 was created from Codex CLI 0.128.0 release-intake follow-up evidence.
- Review date: 2026-05-13.
- Maximum lifetime: No retained fallback in the target design; the current packet only records the missing governance work.
- Removal condition: Hook/cache/import behavior has explicit governance, docs, and pack-smoke or focused validation.
- Validation: Protected-term scan, JSON registry checks, spec guard, docs checks, and later focused plugin/pack-smoke tests.
- Large-refactor check: A bounded implementation is acceptable if it stays inside existing plugin packaging, hook safety, config import, and pack-smoke seams; if authority is split across multiple import paths, the provider-worker lane should choose a larger consolidation rather than another minor bypass.

## Open Questions
- Should direct, non-follow-up release-intake issue creation scaffold packet files automatically, or should CO-531 extend the helper family to cover direct issue creation as a separate follow-up?

## Approvals
- Product: Pending provider-worker implementation lane.
- Engineering: Packet self-approved for Backlog traceability setup on 2026-05-13.
- Design: Not applicable.
