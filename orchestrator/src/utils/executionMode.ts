export interface ExecutionModeParseOptions {
  trim?: boolean;
  lowercase?: boolean;
  truthyValues: readonly string[];
  falsyValues: readonly string[];
}

export function createExecutionModeParser(options: ExecutionModeParseOptions): (value: string) => boolean | null {
  const trim = options.trim ?? false;
  const lowercase = options.lowercase ?? true;
  const truthy = new Set(options.truthyValues);
  const falsy = new Set(options.falsyValues);

  return (value: string): boolean | null => {
    const normalizedInput = trim ? value.trim() : value;
    if (!normalizedInput) {
      return null;
    }
    const normalized = lowercase ? normalizedInput.toLowerCase() : normalizedInput;
    if (truthy.has(normalized)) {
      return true;
    }
    if (falsy.has(normalized)) {
      return false;
    }
    return null;
  };
}

export const CLI_EXECUTION_MODE_PARSER = createExecutionModeParser({
  trim: false,
  lowercase: true,
  truthyValues: ['cloud'],
  falsyValues: ['mcp']
});

export const MANAGER_EXECUTION_MODE_PARSER = createExecutionModeParser({
  trim: true,
  lowercase: true,
  truthyValues: ['cloud', 'true', '1', 'yes'],
  falsyValues: ['mcp', 'false', '0', 'no']
});

export const PLANNER_EXECUTION_MODE_PARSER = createExecutionModeParser({
  trim: false,
  lowercase: true,
  truthyValues: ['cloud'],
  falsyValues: ['mcp']
});

export interface RequiresCloudResolutionOptions {
  boolFlags: Array<boolean | null | undefined>;
  metadataModes: Array<string | null | undefined>;
  parseMode: (value: string) => boolean | null;
}

export interface RequiresCloudPolicyOptions {
  boolFlags: Array<boolean | null | undefined>;
  metadata: { mode?: string | null; executionMode?: string | null };
  metadataOrder: Array<'mode' | 'executionMode'>;
  parseMode: (value: string) => boolean | null;
}

export function resolveRequiresCloudFlag(options: RequiresCloudResolutionOptions): boolean | null {
  for (const flag of options.boolFlags) {
    if (flag === true) {
      return true;
    }
    if (flag === false) {
      return false;
    }
  }

  for (const candidate of options.metadataModes) {
    if (typeof candidate !== 'string') {
      continue;
    }
    const parsed = options.parseMode(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

export function resolveRequiresCloudPolicy(options: RequiresCloudPolicyOptions): boolean | null {
  const metadataModes = options.metadataOrder.map((key) => {
    const value = options.metadata[key];
    return typeof value === 'string' ? value : null;
  });
  return resolveRequiresCloudFlag({
    boolFlags: options.boolFlags,
    metadataModes,
    parseMode: options.parseMode
  });
}
