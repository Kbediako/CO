import { describe, expect, it } from 'vitest';

import { sanitizeProviderOverrideEnv } from '../src/cli/utils/providerOverrideEnv.js';

describe('sanitizeProviderOverrideEnv', () => {
  it('derives provider-owned repo config from the provider package-root marker before the current package root', () => {
    const sanitized = sanitizeProviderOverrideEnv({
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host',
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
      CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT: '/tmp/provider-package-root',
      CODEX_ORCHESTRATOR_REPO_CONFIG_PATH:
        '/tmp/provider-package-root/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
      CODEX_ORCHESTRATOR_PACKAGE_ROOT: '/tmp/child-package-root',
      CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
    });

    expect(sanitized.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBeUndefined();
    expect(sanitized.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED).toBeUndefined();
    expect(sanitized.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBe('/tmp/child-package-root');
  });
});
