import { describe, expect, it } from 'vitest';

import { evaluateDynamicToolBridgeRequest } from '../src/cli/control/dynamicToolBridgePolicy.js';

describe('DynamicToolBridgePolicy', () => {
  it('fails closed by default when policy is missing', () => {
    const evaluation = evaluateDynamicToolBridgeRequest({
      featureToggles: null,
      action: 'status',
      args: { source_id: 'appserver_dynamic_tool' }
    });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.error).toBe('dynamic_tool_bridge_disabled');
  });

  it('allows enabled requests with canonical source context', () => {
    const evaluation = evaluateDynamicToolBridgeRequest({
      featureToggles: {
        dynamic_tool_bridge: {
          enabled: true
        }
      },
      action: 'pause',
      args: {
        source: {
          source_id: 'appserver_dynamic_tool'
        }
      }
    });

    expect(evaluation.ok).toBe(true);
    expect(evaluation.error).toBeUndefined();
    expect(evaluation.sourceId).toBe('appserver_dynamic_tool');
  });

  it('rejects enabled policy when kill switch is set', () => {
    const evaluation = evaluateDynamicToolBridgeRequest({
      featureToggles: {
        coordinator: {
          dynamic_tool_bridge: {
            enabled: true,
            kill_switch: true
          }
        }
      },
      action: 'status',
      args: { source_id: 'appserver_dynamic_tool' }
    });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.error).toBe('dynamic_tool_bridge_kill_switched');
  });

  it('rejects malformed source contexts', () => {
    const evaluation = evaluateDynamicToolBridgeRequest({
      featureToggles: {
        dynamic_tool_bridge: {
          enabled: true
        }
      },
      action: 'status',
      args: {
        source: {
          source_id: ''
        }
      }
    });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.error).toBe('dynamic_tool_bridge_source_invalid');
  });

  it('rejects source ids outside the allowlist', () => {
    const evaluation = evaluateDynamicToolBridgeRequest({
      featureToggles: {
        dynamic_tool_bridge: {
          enabled: true,
          allowed_sources: ['trusted_dynamic_source']
        }
      },
      action: 'status',
      args: { source_id: 'appserver_dynamic_tool' }
    });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.error).toBe('dynamic_tool_bridge_source_not_allowed');
  });

  it('rejects actions outside the allowlist', () => {
    const evaluation = evaluateDynamicToolBridgeRequest({
      featureToggles: {
        dynamic_tool_bridge: {
          enabled: true,
          allowed_actions: ['status']
        }
      },
      action: 'cancel',
      args: { source_id: 'appserver_dynamic_tool' }
    });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.error).toBe('dynamic_tool_bridge_action_not_allowed');
  });
});
