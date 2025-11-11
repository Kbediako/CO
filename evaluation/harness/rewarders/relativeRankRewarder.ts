import type { EvaluationScenarioResult, RewardScore, Rewarder } from '../types.js';
import { deriveGtScore } from './gtRewarder.js';

interface RankedSample {
  result: EvaluationScenarioResult;
  gtScore: number;
  durationMs: number;
  index: number;
}

function totalDuration(result: EvaluationScenarioResult): number {
  return result.goals.reduce((sum, goal) => sum + goal.durationMs, 0);
}

function formatEvidence(entry: RankedSample, rank: number, cohortSize: number): string {
  const parts = [
    `rank ${rank}/${cohortSize}`,
    `gt=${entry.gtScore.toFixed(2)}`,
    `duration=${Math.round(entry.durationMs)}ms`
  ];
  if (entry.result.tfgrpo?.temperature !== undefined) {
    parts.push(`temp=${entry.result.tfgrpo.temperature.toFixed(2)}`);
  }
  return parts.join(' | ');
}

export function createRelativeRankingRewarder(): Rewarder {
  return {
    id: 'relative',
    evaluate(cohort: EvaluationScenarioResult[]): Map<EvaluationScenarioResult, RewardScore> {
      const map = new Map<EvaluationScenarioResult, RewardScore>();
      if (cohort.length < 2) {
        return map;
      }

      const ranked: RankedSample[] = cohort.map((result, index) => ({
        result,
        gtScore: result.reward?.gtScore ?? deriveGtScore(result),
        durationMs: totalDuration(result),
        index
      }));

      ranked.sort((a, b) => {
        if (b.gtScore !== a.gtScore) {
          return b.gtScore - a.gtScore;
        }
        if (a.durationMs !== b.durationMs) {
          return a.durationMs - b.durationMs;
        }
        const scenarioCompare = a.result.scenario.id.localeCompare(b.result.scenario.id);
        if (scenarioCompare !== 0) {
          return scenarioCompare;
        }
        return a.index - b.index;
      });

      const denominator = ranked.length - 1;
      for (let position = 0; position < ranked.length; position += 1) {
        const entry = ranked[position]!;
        const score = denominator <= 0 ? 0.5 : Number(((denominator - position) / denominator).toFixed(4));
        map.set(entry.result, {
          rewarderId: 'relative',
          score,
          evidence: formatEvidence(entry, position + 1, ranked.length)
        });
      }

      return map;
    }
  } satisfies Rewarder;
}
