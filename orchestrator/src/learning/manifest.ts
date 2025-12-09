import { isoTimestamp } from '../cli/utils/time.js';
import type {
  CliManifest,
  LearningAlertRecord,
  LearningManifestSection,
  LearningValidationPolicy,
  LearningValidationStatus
} from '../cli/types.js';

const DEFAULT_VALIDATION: LearningValidationPolicy = {
  mode: 'per-task',
  grouping: null,
  status: 'pending',
  reason: null,
  log_path: null,
  last_error: null,
  git_status_path: null,
  git_log_path: null
};

function normalizeValidation(validation?: LearningValidationPolicy | null): LearningValidationPolicy {
  return {
    ...DEFAULT_VALIDATION,
    ...validation,
    mode: validation?.mode ?? 'per-task',
    grouping: validation?.grouping ?? null,
    status: validation?.status ?? 'pending'
  };
}

export function ensureLearningSection(manifest: CliManifest): LearningManifestSection {
  if (!manifest.learning) {
    manifest.learning = {
      validation: { ...DEFAULT_VALIDATION },
      alerts: [],
      approvals: []
    };
    return manifest.learning;
  }
  manifest.learning.validation = normalizeValidation(manifest.learning.validation);
  if (!Array.isArray(manifest.learning.alerts)) {
    manifest.learning.alerts = [];
  }
  if (!Array.isArray(manifest.learning.approvals)) {
    manifest.learning.approvals = [];
  }
  return manifest.learning;
}

export function appendLearningAlert(
  manifest: CliManifest,
  alert: Omit<LearningAlertRecord, 'created_at'> & { created_at?: string }
): LearningAlertRecord {
  const section = ensureLearningSection(manifest);
  const next: LearningAlertRecord = {
    ...alert,
    created_at: alert.created_at ?? isoTimestamp()
  };
  section.alerts = [...(section.alerts ?? []), next];
  return next;
}

export function updateLearningValidation(
  manifest: CliManifest,
  status: LearningValidationStatus,
  updates: Partial<LearningValidationPolicy> = {}
): LearningManifestSection {
  const section = ensureLearningSection(manifest);
  section.validation = {
    ...normalizeValidation(section.validation),
    ...updates,
    status
  };
  return section;
}
