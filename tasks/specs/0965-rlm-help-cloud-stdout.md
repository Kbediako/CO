---
id: 20260215-0965-rlm-help-cloud-stdout
title: RLM Help + Cloud Fallback Stdout
doc_type: tech_spec
relates_to: docs/PRD-rlm-help-cloud-stdout.md
risk: low
owners:
  - Codex
last_review: 2026-02-15
---

## Summary
- Objective: make `rlm --help` always print help without running, and surface cloud preflight fallback reasons directly in `start` stdout/JSON output.
- Scope: CLI wiring, command-surface tests, doctor guidance, and support docs.
- Constraints: minimal diff; preserve existing runtime semantics; ship via npm.

## Review Notes
- Notes: this task intentionally avoids broader CLI parsing changes; it only addresses `rlm --help` correctness and cloud fallback UX.

