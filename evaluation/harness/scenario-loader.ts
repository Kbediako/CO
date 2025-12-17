import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EvaluationScenario, LoadedScenario } from './types.js';

const SCENARIOS_DIR = path.resolve(process.cwd(), 'evaluation/scenarios');

function assertScenarioShape(candidate: EvaluationScenario, sourcePath: string): void {
  if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string' || typeof candidate.adapterId !== 'string') {
    throw new Error(`Scenario at ${sourcePath} is missing required fields (id/title/adapterId).`);
  }

  if (!Array.isArray(candidate.goals) || candidate.goals.length === 0) {
    throw new Error(`Scenario '${candidate.id}' in ${sourcePath} must declare at least one goal.`);
  }

  if (!candidate.fixture || typeof candidate.fixture.path !== 'string') {
    throw new Error(`Scenario '${candidate.id}' in ${sourcePath} must declare a fixture.path.`);
  }

  for (const goal of candidate.goals) {
    if (typeof goal === 'string') {
      continue;
    }
    const goalRecord = goal as unknown as Record<string, unknown>;
    if (!goal || typeof goal !== 'object' || typeof goalRecord.goal !== 'string') {
      throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has an invalid goal entry.`);
    }
  }

  if (candidate.agentTask !== undefined) {
    const taskRecord = candidate.agentTask as unknown as Record<string, unknown>;
    const instruction = taskRecord.instruction;
    if (!candidate.agentTask || typeof candidate.agentTask !== 'object' || typeof instruction !== 'string' || !instruction.trim()) {
      throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has an invalid agentTask.instruction.`);
    }
    if (!instruction.trim().startsWith('WRITE|')) {
      throw new Error(
        `Scenario '${candidate.id}' in ${sourcePath} declares an unsupported agentTask.instruction (expected WRITE|...).`
      );
    }
  }

  if (candidate.patternAssertions !== undefined) {
    if (!Array.isArray(candidate.patternAssertions)) {
      throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has invalid patternAssertions (expected an array).`);
    }

    candidate.patternAssertions.forEach((assertion, index) => {
      if (!assertion || typeof assertion !== 'object') {
        throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has invalid patternAssertions[${index}] (expected object).`);
      }

      const record = assertion as unknown as Record<string, unknown>;
      const type = record.type;
      const pathValue = record.path;
      const scope = record.scope;
      const note = record.note;

      if (typeof type !== 'string' || !type) {
        throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has invalid patternAssertions[${index}].type.`);
      }

      if (scope !== undefined && scope !== 'fixture' && scope !== 'repo') {
        throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has invalid patternAssertions[${index}].scope.`);
      }

      if (note !== undefined && typeof note !== 'string') {
        throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has invalid patternAssertions[${index}].note.`);
      }

      if (typeof pathValue !== 'string' || !pathValue) {
        throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has invalid patternAssertions[${index}].path.`);
      }

      if (type === 'file-exists') {
        return;
      }

      if (type === 'file-contains') {
        const includes = record.includes;
        const includesArray = Array.isArray(includes) ? includes : typeof includes === 'string' ? [includes] : null;
        if (!includesArray || includesArray.length === 0 || includesArray.some((entry) => typeof entry !== 'string')) {
          throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has invalid patternAssertions[${index}].includes.`);
        }
        return;
      }

      if (type === 'diff-match') {
        const expectedDiff = record.expectedDiff;
        if (typeof expectedDiff !== 'string' || !expectedDiff.trim()) {
          throw new Error(`Scenario '${candidate.id}' in ${sourcePath} has invalid patternAssertions[${index}].expectedDiff.`);
        }
        return;
      }

      throw new Error(
        `Scenario '${candidate.id}' in ${sourcePath} declares unknown patternAssertions[${index}].type '${type}'.`
      );
    });
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
