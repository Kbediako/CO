# Research Findings - Context Alignment Checker (0976)

## Purpose
Translate research into concrete implementation choices for Option 2 context alignment.

## Sources and Applied Decisions
1. Calibration and reliability
- Source: Guo et al., "On Calibration of Modern Neural Networks" (ICML 2017) - https://proceedings.mlr.press/v70/guo17a.html
- Applied decision: calibrate drift confidence before enforcing strict autonomy thresholds; treat uncalibrated confidence as advisory.

2. Multiple-testing control for drift alerts
- Source: Benjamini-Hochberg FDR (JRSS-B 1995) - https://academic.oup.com/jrsssb/article/57/1/289/7035855
- Applied decision: use FDR control when evaluating many drift signals at once to reduce false positives.

3. Streaming drift adaptation
- Source: ADWIN paper (SDM 2007) - https://www.siam.org/publications/siam-news/articles/research-learning-from-time-changing-data-with-adaptive-windowing/
- Applied decision: detect sustained drift via windowed behavior, not single-turn spikes.

4. Consensus and arbitration limits
- Source: self-consistency prompting (2022) - https://arxiv.org/abs/2203.11171
- Source: multi-agent debate (2023) - https://arxiv.org/abs/2305.14325
- Source: Byzantine Generals problem - https://lamport.azurewebsites.net/pubs/byz.pdf
- Applied decision: require margin + veto checks for 3-evaluator consensus; treat consensus as confidence signal, not proof.

5. Manifest-first persistence patterns
- Source: Fowler Event Sourcing - https://martinfowler.com/eaaDev/EventSourcing.html
- Source: AWS Event Sourcing pattern - https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-sourcing.html
- Source: Azure CQRS pattern - https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- Applied decision: append-only ledger as canonical; projections are rebuildable read-models.

6. Safety and governance baseline
- Source: NIST AI RMF 1.0 (2023) - https://doi.org/10.6028/NIST.AI.100-1
- Applied decision: explicit monitoring/rollback triggers and documented risk controls are required before autonomy expansion.

7. LLM-judge and anti-gaming risks
- Source: LLM-as-a-judge limitations (2023) - https://arxiv.org/abs/2306.05685
- Source: positional bias in LLM evaluators (ACL 2024) - https://aclanthology.org/2024.acl-long.511/
- Applied decision: evidence-linked scoring, verbosity-normalized checks, separated checker/planner roles, and anti-oscillation hysteresis.

## Design Translation
- Use weighted scoring with explicit evidence requirements per dimension.
- Gate autonomy with 20-turn snapshots and confidence + margin thresholds.
- Force conservative fallback when high-reasoning route is unavailable.
- Persist checker events in append-only ledger with idempotency and hash-chain fields.
