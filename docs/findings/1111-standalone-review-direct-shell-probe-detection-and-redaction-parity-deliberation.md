# Findings - 1111 Standalone Review Direct Shell-Probe Detection and Redaction Parity

- `1110` closed the repeated shell-wrapped probe loop, but the live review still identified a plausible direct-command parity gap around `printenv MANIFEST` when no shell wrapper is present.
- The same `1110` review also drifted into raw shell-probe failure rendering concerns because the current boundary reason includes the full wrapper sample rather than a tighter probe-focused sample.
- Those two issues share one bounded seam: shell-probe classification/sample formatting in `scripts/lib/review-execution-state.ts`, plus focused wrapper assertions.
- Do not mix this slice with the broader self-referential review-output drift work; that remains a later follow-on.
