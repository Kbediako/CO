export type ReviewShellDialect = 'bashlike' | 'zsh' | 'other';

export type ReviewShellEnvState = {
  shellVars: Map<string, string>;
  exportedVars: Set<string>;
  blockedEnvVars: Set<string>;
};

export interface ReviewShellEnvInterpreterDependencies {
  normalizeAuditMetaSurfaceEnvVar(candidate: string): string | null;
  normalizeCommandToken(token: string): string;
  stripLeadingEnvAssignments(tokens: string[]): string[];
  unwrapEnvCommandTokens(tokens: string[]): string[];
}

export function createEmptyReviewShellEnvState(
  initialEnvVarPaths: ReadonlyMap<string, string> = new Map()
): ReviewShellEnvState {
  const shellVars = new Map<string, string>();
  for (const [envVar, envPath] of initialEnvVarPaths.entries()) {
    shellVars.set(envVar, envPath);
  }
  return {
    shellVars,
    exportedVars: new Set(shellVars.keys()),
    blockedEnvVars: new Set()
  };
}

export function buildCommandEnvAssignments(
  shellEnvState: ReviewShellEnvState,
  rawTokens: string[],
  dependencies: ReviewShellEnvInterpreterDependencies
): Map<string, string> {
  const envAssignments = commandUsesCleanEnvironment(rawTokens, dependencies)
    ? new Map<string, string>()
    : mergeEnvAssignments(shellEnvState.shellVars, new Map());
  for (const envVar of shellEnvState.blockedEnvVars) {
    envAssignments.delete(envVar);
  }
  return mergeEnvAssignments(
    envAssignments,
    collectInlineEnvAssignments(rawTokens, dependencies)
  );
}

export function buildNestedShellEnvState(
  shellEnvState: ReviewShellEnvState,
  rawTokens: string[],
  dependencies: ReviewShellEnvInterpreterDependencies
): ReviewShellEnvState {
  const blockedEnvVars = buildBlockedEnvVarSet(shellEnvState, rawTokens, dependencies);
  const usesCleanEnvironment = commandUsesCleanEnvironment(rawTokens, dependencies);
  const shellVars = new Map<string, string>();
  if (!usesCleanEnvironment) {
    for (const envVar of shellEnvState.exportedVars) {
      if (blockedEnvVars.has(envVar)) {
        continue;
      }
      const value = shellEnvState.shellVars.get(envVar);
      if (value !== undefined) {
        shellVars.set(envVar, value);
      }
    }
  }
  for (const [key, value] of collectInlineEnvAssignments(rawTokens, dependencies).entries()) {
    shellVars.set(key, value);
    blockedEnvVars.delete(key);
  }
  return {
    shellVars,
    exportedVars: new Set(shellVars.keys()),
    blockedEnvVars
  };
}

export function updateReviewShellEnvStateForSegment(
  shellEnvState: ReviewShellEnvState,
  rawTokens: string[],
  dependencies: ReviewShellEnvInterpreterDependencies,
  shellDialect: ReviewShellDialect = 'other'
): ReviewShellEnvState {
  const nextState = cloneReviewShellEnvState(shellEnvState);
  const leadingAssignments = collectLeadingShellAssignments(rawTokens);
  const strippedTokens = dependencies.stripLeadingEnvAssignments(rawTokens);

  if (strippedTokens.length === 0) {
    for (const [key, value] of leadingAssignments.entries()) {
      nextState.shellVars.set(key, value);
      nextState.blockedEnvVars.delete(key);
    }
    return nextState;
  }

  const tokens = dependencies.unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return nextState;
  }

  const command = dependencies.normalizeCommandToken(tokens[0] ?? '');
  if (command === 'export') {
    const exportTokens = tokens.slice(1);
    const bashLikeUnexportMode = shellDialect === 'bashlike' && exportTokens.includes('-n');
    if (shellDialect === 'bashlike' && !bashLikeUnexportMode) {
      applyBashLikeLeadingBareExportAssignments(nextState, exportTokens, leadingAssignments);
    }
    applyExportTokensToReviewShellEnvState(
      nextState,
      exportTokens,
      leadingAssignments,
      dependencies,
      shellDialect
    );
    return nextState;
  }

  if (command === 'unset') {
    applyUnsetTokensToReviewShellEnvState(nextState, tokens.slice(1));
    return nextState;
  }

  return nextState;
}

export function collectInlineEnvAssignments(
  tokens: string[],
  dependencies: ReviewShellEnvInterpreterDependencies
): Map<string, string> {
  const assignments = new Map<string, string>();
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    recordInlineEnvAssignment(assignments, tokens[index] ?? '');
    index += 1;
  }

  if (dependencies.normalizeCommandToken(tokens[index] ?? '') !== 'env') {
    return assignments;
  }

  index += 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();
    if (token === '--') {
      index += 1;
      break;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      recordInlineEnvAssignment(assignments, token);
      index += 1;
      continue;
    }
    if (normalized === '-u' || normalized === '--unset') {
      index += 2;
      continue;
    }
    if (normalized.startsWith('--unset=')) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      index += 1;
      continue;
    }
    break;
  }
  return assignments;
}

function cloneReviewShellEnvState(shellEnvState: ReviewShellEnvState): ReviewShellEnvState {
  return {
    shellVars: new Map(shellEnvState.shellVars),
    exportedVars: new Set(shellEnvState.exportedVars),
    blockedEnvVars: new Set(shellEnvState.blockedEnvVars)
  };
}

function buildBlockedEnvVarSet(
  shellEnvState: ReviewShellEnvState,
  rawTokens: string[],
  dependencies: ReviewShellEnvInterpreterDependencies
): Set<string> {
  const blockedEnvVars = new Set(shellEnvState.blockedEnvVars);
  for (const envVar of collectInlineEnvUnsetVars(rawTokens, dependencies)) {
    blockedEnvVars.add(envVar);
  }
  for (const envVar of collectInlineEnvAssignments(rawTokens, dependencies).keys()) {
    blockedEnvVars.delete(envVar);
  }
  return blockedEnvVars;
}

function collectLeadingShellAssignments(tokens: string[]): Map<string, string> {
  const assignments = new Map<string, string>();
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    recordInlineEnvAssignment(assignments, tokens[index] ?? '');
    index += 1;
  }
  return assignments;
}

function applyBashLikeLeadingBareExportAssignments(
  shellEnvState: ReviewShellEnvState,
  tokens: string[],
  leadingAssignments: ReadonlyMap<string, string>
): void {
  if (leadingAssignments.size === 0) {
    return;
  }

  const bareExportTargets = new Set<string>();
  for (const token of tokens) {
    if (!token || token.startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      continue;
    }
    const normalized = token.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
    if (normalized) {
      bareExportTargets.add(normalized);
    }
  }

  for (const [key, value] of leadingAssignments.entries()) {
    if (!bareExportTargets.has(key)) {
      continue;
    }
    shellEnvState.shellVars.set(key, value);
    shellEnvState.exportedVars.add(key);
    shellEnvState.blockedEnvVars.delete(key);
  }
}

function applyExportTokensToReviewShellEnvState(
  shellEnvState: ReviewShellEnvState,
  tokens: string[],
  leadingAssignments: ReadonlyMap<string, string>,
  dependencies: ReviewShellEnvInterpreterDependencies,
  shellDialect: ReviewShellDialect
): void {
  let bashLikeExportMode: 'export' | 'unexport' = 'export';
  for (const token of tokens) {
    if (!token) {
      continue;
    }
    if (shellDialect === 'bashlike' && token === '-n') {
      bashLikeExportMode = 'unexport';
      continue;
    }
    if (token === '--') {
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      if (bashLikeExportMode === 'unexport') {
        continue;
      }
      const assignments = new Map<string, string>();
      recordInlineEnvAssignment(assignments, token);
      for (const [key, value] of assignments.entries()) {
        let resolvedValue = value;
        const normalizedInlineEnvVar = dependencies.normalizeAuditMetaSurfaceEnvVar(value);
        if (normalizedInlineEnvVar) {
          const expansionEnv = new Map(shellEnvState.shellVars);
          for (const [leadingKey, leadingValue] of leadingAssignments.entries()) {
            if (leadingKey !== key) {
              expansionEnv.set(leadingKey, leadingValue);
            }
          }
          const currentValue = expansionEnv.get(normalizedInlineEnvVar);
          resolvedValue = currentValue ?? '';
        }
        shellEnvState.shellVars.set(key, resolvedValue);
        shellEnvState.exportedVars.add(key);
        shellEnvState.blockedEnvVars.delete(key);
      }
      continue;
    }
    if (token.startsWith('-')) {
      continue;
    }
    const normalized = token.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
    if (!normalized) {
      continue;
    }
    if (bashLikeExportMode === 'unexport') {
      shellEnvState.exportedVars.delete(normalized);
      continue;
    }
    if (shellEnvState.shellVars.has(normalized)) {
      shellEnvState.exportedVars.add(normalized);
      shellEnvState.blockedEnvVars.delete(normalized);
    }
  }
}

function applyUnsetTokensToReviewShellEnvState(
  shellEnvState: ReviewShellEnvState,
  tokens: string[]
): void {
  for (const token of tokens) {
    if (!token || token.startsWith('-')) {
      continue;
    }
    const normalized = token.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
    if (!normalized) {
      continue;
    }
    shellEnvState.shellVars.delete(normalized);
    shellEnvState.exportedVars.delete(normalized);
    shellEnvState.blockedEnvVars.add(normalized);
  }
}

function commandUsesCleanEnvironment(
  tokens: string[],
  dependencies: ReviewShellEnvInterpreterDependencies
): boolean {
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    index += 1;
  }

  if (dependencies.normalizeCommandToken(tokens[index] ?? '') !== 'env') {
    return false;
  }

  index += 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();
    if (token === '--') {
      return false;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      index += 1;
      continue;
    }
    if (normalized === '-i' || normalized === '--ignore-environment') {
      return true;
    }
    if ((normalized === '-u' || normalized === '--unset') && index + 1 < tokens.length) {
      index += 2;
      continue;
    }
    if (normalized.startsWith('--unset=')) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      index += 1;
      continue;
    }
    return false;
  }

  return false;
}

function collectInlineEnvUnsetVars(
  tokens: string[],
  dependencies: ReviewShellEnvInterpreterDependencies
): Set<string> {
  const unsetVars = new Set<string>();
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    index += 1;
  }

  if (dependencies.normalizeCommandToken(tokens[index] ?? '') !== 'env') {
    return unsetVars;
  }

  index += 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();
    if (token === '--') {
      index += 1;
      break;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      index += 1;
      continue;
    }
    if ((normalized === '-u' || normalized === '--unset') && index + 1 < tokens.length) {
      const envVar = tokens[index + 1]?.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
      if (envVar) {
        unsetVars.add(envVar);
      }
      index += 2;
      continue;
    }
    if (normalized.startsWith('--unset=')) {
      const envVar = normalized
        .slice('--unset='.length)
        .trim()
        .replace(/^\$/u, '')
        .replace(/[{}]/gu, '')
        .toUpperCase();
      if (envVar) {
        unsetVars.add(envVar);
      }
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      index += 1;
      continue;
    }
    break;
  }
  return unsetVars;
}

function recordInlineEnvAssignment(assignments: Map<string, string>, token: string): void {
  const separatorIndex = token.indexOf('=');
  if (separatorIndex <= 0) {
    return;
  }
  const key = token.slice(0, separatorIndex).trim().toUpperCase();
  const value = token.slice(separatorIndex + 1).trim();
  if (!key || !value) {
    return;
  }
  assignments.set(key, value);
}

function mergeEnvAssignments(
  inheritedEnvAssignments: ReadonlyMap<string, string>,
  nextEnvAssignments: ReadonlyMap<string, string>
): Map<string, string> {
  const merged = new Map(inheritedEnvAssignments);
  for (const [key, value] of nextEnvAssignments.entries()) {
    merged.set(key, value);
  }
  return merged;
}
