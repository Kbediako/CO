# 1035 Elegance Review

## Scope

- `selectedRunProjection.ts`
- `controlRuntime.ts`
- `observabilityReadModel.ts`
- focused runtime/server regressions

## Verdict

- Keep the current shape.

## Why

- The discovery widening stays bounded to local `.runs` state and does not move UI/Telegram off the selected-run seam.
- Representative collapse lives in the compatibility projection builder, which is the smallest place to preserve both:
  - one issue-level `running` / `retrying` representative,
  - full alias union across contributing runs.
- Canonical-before-alias lookup is a minimal correctness fix, not extra abstraction.
- The new tests cover the two real edge cases added by the slice:
  - same-issue running + retry contributors,
  - canonical identifier versus alias collision.

## No Further Reduction Chosen

- Pulling the compatibility aggregation helpers into another module right now would mostly move code around without reducing policy complexity.
- Leaving representative selection in runtime would force a second alias-preservation path or lose contributor run aliases.
