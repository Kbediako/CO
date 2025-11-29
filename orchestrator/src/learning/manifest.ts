import { isoTimestamp } from '../cli/utils/time.js';
import type {
  CliManifest,
  LearningAlertRecord,
  LearningApprovalRecord,
  LearningManifestSection,
  LearningValidationStatus
} from '../cli/types.js';

const DEFAULT_LEARNING_SECTION: LearningManifestSection = {
  validation: {
    mode: 'per-task',
    grouping: null,
    status: 'pending'
  },
  alerts: [],
  approvals: []
};

export function ensureLearningSection(manifest: CliManifest): LearningManifestSection {
  if (!manifest.learning) {
    manifest.learning = { ...DEFAULT_LEARNING_SECTION };
    return manifest.learning;
  }
  if (!manifest.learning.validation) {
    manifest.learning.validation = { ...DEFAULT_LEARNING_SECTION.validation };
  } else if (!manifest.learning.validation.status) {
    manifest.learning.validation.status = 'pending';
  }
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

export function recordLearningApproval(manifest: CliManifest, approval: LearningApprovalRecord): void {
  const section = ensureLearningSection(manifest);
  section.approvals = [...(section.approvals ?? []), approval];
}

export function updateLearningValidation(
  manifest: CliManifest,
  status: LearningValidationStatus
): LearningManifestSection {
  const section = ensureLearningSection(manifest);
  section.validation = {
    mode: section.validation?.mode ?? 'per-task',
    grouping: section.validation?.grouping ?? null,
    status
  };
  return section;
}
