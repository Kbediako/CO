# Findings - 1068 Question Queue Child-Resolution Adapter Extraction Deliberation

## Decision

Proceed with a bounded Symphony-aligned extraction that moves the question/delegation child-resolution helper cluster out of `controlServer.ts` into a dedicated control-local adapter.

## Why this seam next

- `1065`-`1067` confirmed that the standalone-review work was a useful reliability detour, but not the mainline Symphony decomposition target.
- The question route itself is already controllerized, so the remaining concentration is now the support cluster behind its callbacks.
- The helper cluster is cohesive enough to move without widening into unrelated authenticated-route or control-action logic.

## Boundaries to keep

- Do not widen into a shared helper between `controlServer.ts` and `delegationServer.ts` unless the sharing is obviously smaller and does not expand the validation surface.
- Do not change route contracts or question persistence semantics.
- Keep failure behavior non-fatal and auditable for child-resolution fallback paths.

## Approval

- 2026-03-08: Approved for implementation as the next bounded Symphony-aligned slice after `1067`. The preferred scope is a dedicated question child-resolution adapter extraction, not another review-wrapper expansion and not a cross-subsystem helper merge.
