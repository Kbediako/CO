import type { ControlState } from './controlState.js';
import {
  summarizeTrackerDispatchPilotPolicy,
  evaluateTrackerDispatchPilotAsync,
  type DispatchPilotEvaluation,
  type DispatchPilotSummary
} from './trackerDispatchPilot.js';

interface AdvisoryRuntimeContext {
  controlStore: {
    snapshot(): ControlState;
  };
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

interface CachedDispatchEvaluation {
  issueIdentifier: string | null;
  evaluation: DispatchPilotEvaluation;
}

interface InflightDispatchEvaluation {
  issueIdentifier: string | null;
  promise: Promise<DispatchPilotEvaluation>;
}

export interface LiveLinearAdvisoryRuntime {
  readSnapshotSummary(issueIdentifier?: string | null): DispatchPilotSummary;
  readDispatchEvaluation(issueIdentifier?: string | null): Promise<DispatchPilotEvaluation>;
  invalidate(): void;
}

export function createLiveLinearAdvisoryRuntime(
  context: AdvisoryRuntimeContext
): LiveLinearAdvisoryRuntime {
  let generation = 0;
  let cachedEvaluation: CachedDispatchEvaluation | null = null;
  let inflightEvaluation: InflightDispatchEvaluation | null = null;
  let cachedSnapshotSummary: DispatchPilotSummary | null = null;

  return {
    readSnapshotSummary(issueIdentifier = null): DispatchPilotSummary {
      const normalizedIssueIdentifier = normalizeIssueIdentifier(issueIdentifier);
      if (cachedEvaluation && cachedEvaluation.issueIdentifier === normalizedIssueIdentifier) {
        return cachedEvaluation.evaluation.summary;
      }
      cachedSnapshotSummary ??= summarizeTrackerDispatchPilotPolicy({
        featureToggles: context.controlStore.snapshot().feature_toggles,
        env: context.env ?? process.env
      });
      return cachedSnapshotSummary;
    },

    readDispatchEvaluation(issueIdentifier = null): Promise<DispatchPilotEvaluation> {
      const normalizedIssueIdentifier = normalizeIssueIdentifier(issueIdentifier);

      if (cachedEvaluation && cachedEvaluation.issueIdentifier === normalizedIssueIdentifier) {
        return Promise.resolve(cachedEvaluation.evaluation);
      }

      if (inflightEvaluation && inflightEvaluation.issueIdentifier === normalizedIssueIdentifier) {
        return inflightEvaluation.promise;
      }

      const requestGeneration = generation;
      const promise = evaluateTrackerDispatchPilotAsync({
        featureToggles: context.controlStore.snapshot().feature_toggles,
        defaultIssueIdentifier: normalizedIssueIdentifier,
        env: context.env ?? process.env,
        fetchImpl: context.fetchImpl
      }).then((evaluation) => {
        if (generation === requestGeneration) {
          cachedEvaluation = {
            issueIdentifier: normalizedIssueIdentifier,
            evaluation
          };
        }
        if (inflightEvaluation?.promise === promise) {
          inflightEvaluation = null;
        }
        return evaluation;
      }, (error: unknown) => {
        if (inflightEvaluation?.promise === promise) {
          inflightEvaluation = null;
        }
        throw error;
      });

      inflightEvaluation = {
        issueIdentifier: normalizedIssueIdentifier,
        promise
      };

      return promise;
    },

    invalidate(): void {
      generation += 1;
      cachedEvaluation = null;
      inflightEvaluation = null;
      cachedSnapshotSummary = null;
    }
  };
}

function normalizeIssueIdentifier(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
