# PRD - Coordinator Symphony-Aligned Standalone Review Direct Shell-Probe Detection and Redaction Parity

## Summary

`1110` closed repeated shell-wrapped probe drift, but the live review still highlighted one smaller residual asymmetry: direct env-probe commands such as `printenv MANIFEST` can still evade the new shell-probe counter when emitted without a shell wrapper, and shell-probe boundary failures currently surface the full raw wrapper sample instead of a tighter redacted probe sample.

## Problem

- The current shell-probe boundary is built around shell payload extraction, so non-shell-wrapped direct probe commands remain outside the classifier.
- The live `1110` review explicitly questioned this gap and then drifted into raw shell-probe failure rendering concerns.
- Those are narrower, more concrete follow-ons than the larger self-referential output-surface drift problem, so they should be handled first.

## Goals

- Teach standalone review to count direct env-probe commands as shell probes when they match the same bounded probe semantics already used inside shell payloads.
- Keep shell-probe boundary failure samples redacted and centered on the probe segment instead of the full raw wrapper/path-bearing command line.
- Preserve the allowed/non-probe behavior already landed in `1110`.

## Non-Goals

- Self-referential review-output or closeout-artifact drift.
- Broad shell-parser expansion or general command-policy redesign.
- Native review replacement or unrelated Symphony controller extraction.

## User Value

- Bounded review cannot bypass the shell-probe stop condition simply by skipping a shell wrapper.
- Failure output becomes more useful and less noisy because it shows the probe intent, not the entire wrapper/path envelope.
- CO keeps moving toward a hardened, evidence-first Symphony-like review surface with smaller, auditable stop conditions.

## Acceptance Criteria

- Direct probe commands such as `printenv MANIFEST` count as shell probes in bounded review.
- Existing shell-wrapped probe detection continues to work, including nested shell payloads and mixed probe-plus-read cases.
- Shell-probe boundary failure text uses a redacted inner probe sample rather than the full raw wrapper command line.
- Focused regressions cover direct probe detection and failure-sample redaction without reopening unrelated review drift seams.
