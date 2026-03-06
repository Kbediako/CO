# Elegance Review - 1026

## Verdict
- Keep the shipped extraction for `1026`.

## Why This Is The Smallest Viable Slice
- `ControlRuntime` now owns the selected-run seam that Telegram consumes for `/status`, `/issue`, and projection hashing, which closes the immediate HTTP-envelope dependency without reopening the broader presenter/controller refactor.
- The refresh path now swaps in a fresh advisory runtime before the new snapshot becomes current, which preserves snapshot coherence and keeps failed warmups from poisoning the previous cached snapshot.
- Focused regression coverage now pins both the refresh-time dispatch alignment and the new Telegram no-selected fallback branch.

## What To Defer
- The runtime seam is still presenter-shaped because `readSelectedRunReadModel()` returns public payload DTOs and `resolveIssueIdentifier()` is now effectively redundant.
- Moving to a transport-neutral runtime snapshot type belongs in the next slice; doing it inside `1026` would turn a bounded seam extraction into a broader presenter refactor.
