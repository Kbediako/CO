import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from 'json-schema-to-typescript';

async function main() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const schemaPath = resolve(repoRoot, 'schemas/manifest.json');
  const rawSchema = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(rawSchema);
  const compiled = await compile(schema, 'CliManifest', {
    bannerComment: `/**
 * THIS FILE IS AUTO-GENERATED.
 * Run "npm run generate:manifest-types" after editing schemas/manifest.json.
 */
`
  });

  const aliasBlock = `
export type CliManifest = CodexOrchestratorCLIManifest;
export type CliManifestCommand = CliManifest['commands'][number];
export type RunStatus = CliManifest['status'];
export type CommandStatus = CliManifestCommand['status'];
export type CommandKind = CliManifestCommand['kind'];

export type ToolRunRecord = ToolRun;
export type ToolRunStatus = ToolRun['status'];
export type ApprovalSource = ToolRun['approvalSource'];
export type SandboxState = ToolRun['sandboxState'];
export type ToolRunEventType = ToolRunEvent['type'];
export type ToolRunManifest = Pick<
  CliManifest,
  | 'toolRuns'
  | 'design_artifacts'
  | 'design_artifacts_summary'
  | 'design_config_snapshot'
  | 'design_toolkit_artifacts'
  | 'design_toolkit_summary'
  | 'design_plan'
  | 'design_guardrail'
  | 'design_history'
  | 'design_style_profile'
  | 'design_metrics'
> &
  Record<string, unknown>;

export type DesignArtifactRecord = DesignArtifact;
export type DesignArtifactStage = DesignArtifact['stage'];
export type DesignArtifactApprovalRecord = DesignArtifactApproval;
export type DesignArtifactsSummaryStageEntry = DesignArtifactsSummary['stages'][number];

export type DesignToolkitArtifactRecord = DesignToolkitArtifact;
export type DesignToolkitStage = DesignToolkitArtifact['stage'];
export type DesignToolkitArtifactRetention = NonNullable<DesignToolkitArtifact['retention']>;
export type DesignToolkitSummaryStageEntry = DesignToolkitSummary['stages'][number];

export type DesignPlanRecord = DesignPlan;
export type DesignPipelineMode = DesignPlan['mode'];
export type DesignGuardrailRecord = DesignGuardrail;
export type DesignGateStatus = DesignGuardrail['status'];
export type DesignHistoryRecord = DesignHistory;
export type DesignStyleProfileMetadata = DesignStyleProfile;
export type DesignStyleOverlapBreakdown = DesignStyleOverlap;
export type DesignMetricRecord = DesignMetrics;
`;

  const outputPath = resolve(repoRoot, 'packages/shared/manifest/types.ts');
  const content = `${compiled.trim()}\n${aliasBlock}`;

  await writeFile(outputPath, `${content.trim()}\n`, 'utf-8');
  console.log(`[manifest-types] wrote ${outputPath}`);
}

main().catch((error) => {
  console.error('[manifest-types] generation failed');
  console.error(error);
  process.exitCode = 1;
});
