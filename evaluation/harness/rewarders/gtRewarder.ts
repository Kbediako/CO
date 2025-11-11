import type { EvaluationScenarioResult, RewardScore, Rewarder } from '../types.js';

function computeGtScore(result: EvaluationScenarioResult): { score: number; evidence: string } {
  const total = result.goals.length;
  if (total === 0) {
    return { score: 0, evidence: 'no goals executed' };
  }
  const passed = result.goals.filter((goal) => goal.status === 'passed').length;
  const score = Number((passed / total).toFixed(4));
  const evidence = `passed ${passed}/${total}`;
  return { score, evidence };
}

export function createGtRewarder(): Rewarder {
  return {
    id: 'gt',
    evaluate(cohort: EvaluationScenarioResult[]): Map<EvaluationScenarioResult, RewardScore> {
      const map = new Map<EvaluationScenarioResult, RewardScore>();
      for (const result of cohort) {
        const { score, evidence } = computeGtScore(result);
        map.set(result, {
          rewarderId: 'gt',
          score,
          evidence
        });
      }
      return map;
    }
  } satisfies Rewarder;
}

export function deriveGtScore(result: EvaluationScenarioResult): number {
  const total = result.goals.length;
  if (total === 0) {
    return 0;
  }
  const passed = result.goals.filter((goal) => goal.status === 'passed').length;
  return passed / total;
}
