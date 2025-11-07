import type { DesignToolkitPipelineConfig } from '../../../../packages/shared/config/index.js';

export interface ToolkitPublishActions {
  updateTokens: boolean;
  updateComponents: boolean;
  runVisualRegression: boolean;
}

export function resolveToolkitPublishActions(
  pipeline: DesignToolkitPipelineConfig
): ToolkitPublishActions {
  const publish = pipeline.publish ?? {
    updateTokens: true,
    updateComponents: true,
    runVisualRegression: true
  };
  return {
    updateTokens: publish.updateTokens !== false,
    updateComponents: publish.updateComponents !== false,
    runVisualRegression: publish.runVisualRegression !== false
  };
}
