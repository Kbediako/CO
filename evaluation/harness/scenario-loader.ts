import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EvaluationScenario, LoadedScenario } from './types.js';

const SCENARIOS_DIR = path.resolve(process.cwd(), 'evaluation/scenarios');

function assertScenarioShape(candidate: EvaluationScenario, sourcePath: string): void {
  if (!candidate.id || !candidate.title || !candidate.adapterId) {
    throw new Error(`Scenario at ${sourcePath} is missing required fields (id/title/adapterId).`);
  }

  if (!Array.isArray(candidate.goals) || candidate.goals.length === 0) {
    throw new Error(`Scenario '${candidate.id}' must declare at least one goal.`);
  }

  if (!candidate.fixture || typeof candidate.fixture.path !== 'string') {
    throw new Error(`Scenario '${candidate.id}' must declare a fixture.path.`);
  }

  for (const goal of candidate.goals) {
    if (typeof goal === 'string') {
      continue;
    }
    const goalRecord = goal as unknown as Record<string, unknown>;
    if (!goal || typeof goal !== 'object' || typeof goalRecord.goal !== 'string') {
      throw new Error(`Scenario '${candidate.id}' has an invalid goal entry in ${sourcePath}.`);
    }
  }
}

export async function loadScenarios(): Promise<LoadedScenario[]> {
  const entries = await fs.readdir(SCENARIOS_DIR);
  const scenarios: LoadedScenario[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) {
      continue;
    }

    const fullPath = path.join(SCENARIOS_DIR, entry);
    const raw = await fs.readFile(fullPath, 'utf8');
    const parsed = JSON.parse(raw) as EvaluationScenario;
    assertScenarioShape(parsed, fullPath);
    scenarios.push({ ...parsed, sourcePath: fullPath });
  }

  scenarios.sort((a, b) => a.id.localeCompare(b.id));
  return scenarios;
}

export async function loadScenarioById(id: string): Promise<LoadedScenario> {
  const scenarios = await loadScenarios();
  const scenario = scenarios.find((item) => item.id === id);
  if (!scenario) {
    throw new Error(`Unknown evaluation scenario '${id}'.`);
  }
  return scenario;
}
