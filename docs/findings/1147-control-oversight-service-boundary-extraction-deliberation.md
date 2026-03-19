# 1147 Deliberation - Control Oversight Service Boundary Extraction

- Date: 2026-03-13
- Result: approved

## Why this seam

- After `1146`, there is no longer another equally truthful Telegram-only bridge seam; what remains is the coordinator contract Telegram consumes across multiple files.
- A coordinator-owned oversight facade is a better Symphony-aligned move than forcing another Telegram-only extraction because it leaves Telegram as a consumer of shared coordinator behavior rather than an owner of coordinator assembly.
- The slice stays bounded by limiting the facade to the current Telegram consumer contract and excluding broader runtime/controller rewrites.

## Review posture

- Local read-only approval: yes
- Delegated scout requested to verify that the next truthful seam is coordinator-owned rather than another Telegram-local extraction.
