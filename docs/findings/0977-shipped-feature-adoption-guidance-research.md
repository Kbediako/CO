# Findings - 0977 Shipped Feature Adoption Guidance Research

## Inputs
- Delegated research stream: agent `019c7e47-5554-7e81-9199-e79db5921878`.
- Delegated review stream: agent `019c7e47-5aad-7471-b730-64575a612ebb`.

## Key Evidence
- Guidance already exists but is fragmented: `setup`, `doctor --usage`, and interactive `exec` hint path.
- Main regression risk for expansion is JSON output contamination in command-surface tests.
- Top-level help surface lacks explicit quickstart routing for adoption-focused commands.

## Option Analysis
1. Help quickstart guidance (top-level/start/flow)
- Impact: high discoverability, low risk.

2. Runtime hint extension to `start`/`flow` text mode
- Impact: medium-high; risk: medium (noise + contract leakage if mishandled).

3. `doctor --usage` recommendation dedupe
- Impact: medium; risk: low-medium; improves hint quality.

4. Skills guidance snippet alignment
- Impact: medium for agent users; low risk.

## Decision
- Ship 1+2+3+4 in one minimal additive slice with strict safeguards:
  - text-only runtime hinting,
  - max one hint per run,
  - fail-open behavior,
  - explicit JSON no-leak tests.

## Test Focus
- Root/subcommand help coverage.
- JSON contract safety for start/flow/exec.
- Runtime hint emission in eligible text-mode paths.
- Recommendation dedupe logic for cloud-related suggestions.
