import type { Rewarder, RewarderId } from '../types.js';
import { createGtRewarder } from './gtRewarder.js';
import { createRelativeRankingRewarder } from './relativeRankRewarder.js';

const factoryMap: Record<RewarderId, () => Rewarder> = {
  gt: createGtRewarder,
  relative: createRelativeRankingRewarder
};

export function buildRewarders(ids: RewarderId[]): Rewarder[] {
  const unique: RewarderId[] = [];
  for (const id of ids) {
    if (factoryMap[id] && !unique.includes(id)) {
      unique.push(id);
    }
  }
  return unique.map((id) => factoryMap[id]!());
}
