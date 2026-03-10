# Elegance Review - 1108

- The final shape stays small and justified: the audit-startup contract remains inside the existing `ReviewExecutionState` plus `run-review.ts` seams instead of introducing a new wrapper layer or reopening native-review replacement.
- Explicit active-path and env-path maps are the right complexity level here because the real `1108` failures came from over-broad kind allowlisting and name-only env handling, not from missing heuristics.
- Narrowing `run-manifest` and `run-runner-log` back to `.runs/**` evidence plus explicitly wired env vars reduced false positives and removed avoidable complexity from the classifier.
- The shell-wrapped env rebinding fallback is justified because the live review reproduced that exact escape hatch; keeping it local to nested audit payload analysis is smaller than broadening command parsing across the whole wrapper.
- The next simplification should be a separate shell-env propagation slice, not a wider `1108` rewrite.
