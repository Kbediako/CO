# ACTION_PLAN - CO: re-enforce CO-185 provider-helper preflight guarantees in live worker attempts

## Summary
- Goal: restore the live CO-185 helper-preflight guarantees without weakening fail-closed guardrails.
- Scope: docs packet, live failure reproduction from `CO-295` / `CO-299` / `CO-302`, helper-path implementation, and focused regression coverage.
- Guardrails: keep parity-matrix enforcement and clean-parent checks authoritative; do not broaden into unrelated issue-family work.

## Milestones
1. Create the docs-first packet and registry entries for `20260422-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d`.
2. Record pre-implementation docs-review or truthful fallback.
3. Isolate the live failure seam from Apr 22 audit/proof evidence.
4. Restore same-attempt parity follow-up suppression.
5. Restore deterministic parent-dirty child-lane sequencing/guidance.
6. Add focused regression coverage and run the normal validation/review gates.

## Validation
- Reproduce the current live failure shapes.
- Run focused helper-path tests for parity suppression and parent-dirty launch guidance.
- Run the normal parent-owned validation and review gates for the touched implementation surfaces.
- Roll back by reverting the implementation and packet together; do not relax guardrails as a shortcut.
