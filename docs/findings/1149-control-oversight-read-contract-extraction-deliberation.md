# 1149 Deliberation - Control Oversight Read Contract Extraction

- Date: 2026-03-13
- Result: approved

## Why this seam

- `1148` finished read-service ownership, so the next truthful mismatch is that Telegram still owns the read contract itself.
- Moving the selected-run/dispatch/question read interface and its boundary-local payload types into a coordinator-owned module is smaller and more accurate than broadening into Telegram runtime or controller refactors.
- The slice stays bounded because Telegram remains only the consumer of the contract; runtime lifecycle and presentation behavior remain unchanged.

## Review posture

- Local read-only approval: yes
- Delegated scout requested to confirm that the next bounded follow-on is contract ownership extraction rather than a broader Telegram or controller rename.
