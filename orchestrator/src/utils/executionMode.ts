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

export interface RequiresCloudResolutionOptions {
  boolFlags: Array<boolean | null | undefined>;
  metadataModes: Array<string | null | undefined>;
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
