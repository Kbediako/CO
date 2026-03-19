# 1148 Deliberation - Control Oversight Read Service Boundary Extraction

- Date: 2026-03-13
- Result: approved

## Why this seam

- `1147` already established the right public coordinator boundary, so the remaining mismatch is ownership/naming under that facade rather than another Telegram behavior seam.
- Replacing the Telegram-named read adapter with a coordinator-owned read service keeps the slice small while completing the boundary alignment that `1147` intentionally stopped short of.
- The slice stays bounded because dispatch/question behavior and Telegram runtime lifecycle remain unchanged.

## Review posture

- Local read-only approval: yes
- Delegated scout requested to verify that the smallest truthful follow-on is read-service ownership alignment rather than a broader Telegram or controller refactor.
