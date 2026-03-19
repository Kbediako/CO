# Findings - 1112 Standalone Review Active Closeout-Root Provenance Hint

- `1111` closed direct rereads of the active closeout bundle, but its live review override still shows the reviewer re-deriving how closeout roots are chosen by inspecting helper code and repo-wide closeout-root listings.
- That remaining drift is narrower than another runtime boundary change: the wrapper already knows the active closeout roots, it just does not disclose them clearly enough in the diff-mode handoff.
- The smallest follow-on is therefore a prompt/handoff hint that surfaces the resolved active closeout roots from the existing resolver path.
- Do not mix this slice with active-closeout matching changes, shell-probe work, native review replacement, or generic helper-surface redesign.
