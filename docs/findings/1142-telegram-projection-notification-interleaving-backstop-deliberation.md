# 1142 Deliberation - Telegram Projection Notification Interleaving Backstop

## Decision

Open a bounded regression-proof lane next, not another Telegram production refactor.

## Why this is the next truthful seam

- `1141` already solved the contract-width problem.
- The remaining risk is proof of the bridge-owned interleaving semantics, not another mixed-responsibility production branch.
- A direct bridge-level backstop is lower-risk and more Symphony-aligned than forcing a new extraction without evidence.

## Slice Boundaries

- In scope: explicit bridge interleaving proof for `next_update_id` and monotonic `updated_at`.
- Out of scope: new Telegram features, lifecycle changes, queue redesign, transport work, or presenter/controller reshaping.

## Approval

Pre-implementation local read-only review approved for docs-first registration.
