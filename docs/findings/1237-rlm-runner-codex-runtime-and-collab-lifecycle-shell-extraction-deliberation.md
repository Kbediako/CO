# 1237 Deliberation: RLM Runner Codex Runtime and Collab Lifecycle Shell Extraction

- Risk stays below the full-deliberation threshold because the lane is bounded to a local extraction inside the RLM runner family with focused tests already covering the critical contracts.
- The strongest reason to open this lane now is that `rlmRunner.ts` still owns a real mixed boundary while `rlm/runner.ts` and `rlm/symbolic.ts` already own their respective iterative and symbolic cores.
- The key contract cluster is runtime Codex command resolution, `codex exec` and JSONL launching, collab lifecycle parsing and validation, feature-key negotiation, and handoff into the loop cores.
- The top regression risk is symbolic multi-agent failure: a bad split could break runtime command selection or collab JSONL lifecycle handling and create false validation failures or leaked `spawn_agent -> wait -> close_agent` sequencing.
