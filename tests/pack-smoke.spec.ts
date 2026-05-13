import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

async function readText(path: string): Promise<string> {
  return await readFile(path, 'utf8');
}

type WorkflowStep = {
  'continue-on-error'?: unknown;
  env?: unknown;
  if?: unknown;
  name?: unknown;
  run?: unknown;
  uses?: unknown;
  with?: unknown;
};

type WorkflowJob = {
  'continue-on-error'?: unknown;
  env?: unknown;
  if?: unknown;
  steps?: unknown;
};

type WorkflowFile = {
  env?: unknown;
  jobs?: Record<string, WorkflowJob>;
};

const marketplaceSkipToken = 'PACK_SMOKE_ALLOW_MARKETPLACE_SKIP';
const marketplaceCodexInstallCommand = 'npm install --global @openai/codex@0.125.0';
const cloudCanaryCodexInstallCommand = 'npm install --global @openai/codex@0.124.0';
const dedicatedCodexInstallCommands = new Set([
  marketplaceCodexInstallCommand,
  cloudCanaryCodexInstallCommand
]);
const packSmokeCommand = 'npm run pack:smoke';
const portableTemplateModel = 'gpt-5.4';
const shellIdentifierPattern = String.raw`[A-Za-z_][A-Za-z0-9_]*`;
const shellAssignmentPattern = String.raw`${shellIdentifierPattern}=(?:"[^"]*"|'[^']*'|\S+)`;
const shellCommandPrefixPattern = String.raw`(?:${shellAssignmentPattern}\s+)*(?:(?:env\s+(?:${shellAssignmentPattern}\s+)*)|(?:command\s+))?`;
const packSmokeInvocationPrefixPattern = String.raw`(?:\(\s*)*${shellCommandPrefixPattern}`;
const negatedPackSmokeInvocationPattern = new RegExp(
  String.raw`!\s+${shellCommandPrefixPattern}npm\s+run\s+pack:smoke`,
  'u'
);
const packSmokeInvocationPattern = new RegExp(
  String.raw`(?:^|[;&|(){}]\s*|\b(?:if|then|do|while|until)\s+)(?:!\s+)?${shellCommandPrefixPattern}npm\s+run\s+pack:smoke(?=$|[\s;|&)])`,
  'gu'
);
const shellFunctionDefinitionPrefixPattern = String.raw`(?:^|[;&({]\s*)`;
const shellFunctionOpenPattern = new RegExp(
  String.raw`${shellFunctionDefinitionPrefixPattern}(?:function\s+${shellIdentifierPattern}(?:\s*\(\))?|${shellIdentifierPattern}\s*\(\))\s*\{`,
  'gu'
);
const shellFunctionOpenBeforeOccurrencePattern = new RegExp(
  String.raw`${shellFunctionDefinitionPrefixPattern}(?:function\s+${shellIdentifierPattern}(?:\s*\(\))?|${shellIdentifierPattern}\s*\(\))\s*\{\s*$`,
  'u'
);
const shellFunctionSignaturePattern = new RegExp(
  String.raw`${shellFunctionDefinitionPrefixPattern}(?:function\s+${shellIdentifierPattern}(?:\s*\(\))?|${shellIdentifierPattern}\s*\(\))\s*$`,
  'u'
);
const trueShortCircuitBeforePackSmokePattern = new RegExp(
  String.raw`(?:^|[;&()]\s*)true\s*\|\|\s*${packSmokeInvocationPrefixPattern}$`,
  'u'
);
const falseShortCircuitBeforePackSmokePattern = new RegExp(
  String.raw`(?:^|[;&()]\s*)false\s*&&\s*${packSmokeInvocationPrefixPattern}$`,
  'u'
);
const andGuardBeforePackSmokePattern = new RegExp(
  String.raw`(?:^|[;&()]\s*)[^\n]*&&\s*${packSmokeInvocationPrefixPattern}$`,
  'u'
);
const fallbackShortCircuitBeforePackSmokePattern = new RegExp(
  String.raw`(?:^|[;&()]\s*)[^\n]*\|\|\s*${packSmokeInvocationPrefixPattern}$`,
  'u'
);
const nonBlockingPackSmokePattern = /\|\||\|&?|(?:^|[\s;])&(?![&>])|;[ \t]*(?:true|exit[ \t]+0)\b/u;
const heredocOperatorPattern = /(<<-?)\s*(?:"([^"]+)"|'([^']+)'|([^<>\s;&|()]+))/u;

type HeredocState = {
  allowLeadingTabs: boolean;
  delimiter: string;
};

async function readWorkflow(path: string): Promise<WorkflowFile> {
  const parsed = load(await readText(path));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${path} must parse as a workflow object`);
  }
  return parsed as WorkflowFile;
}

function getWorkflowSteps(job: WorkflowJob): WorkflowStep[] {
  return Array.isArray(job.steps) ? (job.steps as WorkflowStep[]) : [];
}

function containsMarketplaceSkipEnv(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsMarketplaceSkipEnv(entry));
  }
  return Object.entries(value as Record<string, unknown>).some(
    ([key, entry]) =>
      key.includes(marketplaceSkipToken) ||
      (typeof entry === 'string' && entry.includes(marketplaceSkipToken)) ||
      containsMarketplaceSkipEnv(entry)
  );
}

function expectNoMarketplaceSkipEnv(value: unknown, label: string): void {
  expect(containsMarketplaceSkipEnv(value), `${label} must not opt out of marketplace smoke via env`).toBe(false);
}

function getStepCondition(step: WorkflowStep): string {
  const condition = typeof step.if === 'string' ? step.if.trim() : '';
  return condition.length > 0 ? condition : 'success()';
}

function getJobCondition(job: WorkflowJob): string {
  const condition = typeof job.if === 'string' ? job.if.trim() : '';
  return condition.length > 0 ? condition : 'success()';
}

function unwrapActionsExpression(condition: string): string {
  const trimmed = condition.trim();
  const match = trimmed.match(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/u);
  return match?.[1]?.trim() ?? trimmed;
}

function combineWorkflowConditions(jobCondition: string, stepCondition: string): string {
  if (jobCondition === 'success()') {
    return stepCondition;
  }
  if (stepCondition === 'success()') {
    return jobCondition;
  }
  return `\${{ (${unwrapActionsExpression(jobCondition)}) && (${unwrapActionsExpression(stepCondition)}) }}`;
}

function hasNonSuccessStatusCheck(condition: string): boolean {
  const expression = unwrapActionsExpression(condition);
  const compactExpression = expression.replace(/\s+/gu, '').toLowerCase();
  return (
    /\b(always|cancelled|failure)\s*\(/iu.test(expression) ||
    /!\s*(?:\(\s*)*success\s*\(/iu.test(expression) ||
    /(?:^|[(!&|])\(?success\(\)\)?==(?:false|fromjson\((['"])false\1\))/iu.test(compactExpression) ||
    /(?:^|[(!&|])\(?success\(\)\)?!=(?:true|fromjson\((['"])true\1\))/iu.test(compactExpression) ||
    /(?:false|fromjson\((['"])false\1\))==\(?success\(\)\)?(?:$|[)!&|])/iu.test(compactExpression) ||
    /(?:true|fromjson\((['"])true\1\))!=\(?success\(\)\)?(?:$|[)!&|])/iu.test(compactExpression) ||
    (/\bsuccess\s*\(/iu.test(expression) && /\|\|/u.test(expression))
  );
}

function stripOuterParentheses(term: string): string {
  let expression = term.trim();
  while (expression.startsWith('(') && expression.endsWith(')')) {
    let depth = 0;
    let wrapsExpression = true;
    for (let index = 0; index < expression.length; index += 1) {
      const current = expression[index];
      if (current === '(') {
        depth += 1;
      } else if (current === ')') {
        depth -= 1;
      }
      if (depth === 0 && index < expression.length - 1) {
        wrapsExpression = false;
        break;
      }
      if (depth < 0) {
        wrapsExpression = false;
        break;
      }
    }
    if (!wrapsExpression || depth !== 0) {
      break;
    }
    expression = expression.slice(1, -1).trim();
  }
  return expression;
}

function splitTopLevelExpression(expression: string, operator: '&&' | '||'): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let partStartIndex = 0;
  for (let index = 0; index < expression.length; index += 1) {
    const current = expression[index];
    if (quote) {
      if (current === '\\') {
        index += 1;
      } else if (current === quote) {
        quote = null;
      }
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }
    if (current === '(') {
      depth += 1;
      continue;
    }
    if (current === ')' && depth > 0) {
      depth -= 1;
      continue;
    }
    if (depth === 0 && expression.slice(index, index + operator.length) === operator) {
      parts.push(expression.slice(partStartIndex, index).trim());
      index += operator.length - 1;
      partStartIndex = index + 1;
    }
  }
  parts.push(expression.slice(partStartIndex).trim());
  return parts;
}

type ConstantExpressionLiteral =
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null'; value: null }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string };

function toConstantExpressionLiteral(value: unknown): ConstantExpressionLiteral | null {
  if (typeof value === 'boolean') {
    return { kind: 'boolean', value };
  }
  if (value === null) {
    return { kind: 'null', value: null };
  }
  if (typeof value === 'number') {
    return { kind: 'number', value };
  }
  if (typeof value === 'string') {
    return { kind: 'string', value };
  }
  return null;
}

function parseConstantExpressionLiteral(term: string): ConstantExpressionLiteral | null {
  const expression = stripOuterParentheses(term);
  const fromJsonMatch = expression.match(/^fromJSON\s*\(\s*(['"])([\s\S]*)\1\s*\)$/iu);
  if (fromJsonMatch) {
    try {
      return toConstantExpressionLiteral(JSON.parse(fromJsonMatch[2] ?? ''));
    } catch {
      return null;
    }
  }
  if (/^true$/iu.test(expression)) {
    return { kind: 'boolean', value: true };
  }
  if (/^false$/iu.test(expression)) {
    return { kind: 'boolean', value: false };
  }
  if (/^null$/iu.test(expression)) {
    return { kind: 'null', value: null };
  }
  const quotedStringMatch = expression.match(/^(['"])([\s\S]*)\1$/u);
  if (quotedStringMatch) {
    return { kind: 'string', value: quotedStringMatch[2] ?? '' };
  }
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(expression)) {
    return { kind: 'number', value: Number(expression) };
  }
  return null;
}

function getConstantLiteralTruthiness(literal: ConstantExpressionLiteral): boolean {
  switch (literal.kind) {
    case 'boolean':
      return literal.value;
    case 'null':
      return false;
    case 'number':
      return literal.value !== 0;
    case 'string':
      return literal.value.length > 0;
  }
}

function getTopLevelComparison(expression: string): { left: string; operator: '==' | '!='; right: string } | null {
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < expression.length - 1; index += 1) {
    const current = expression[index];
    if (quote) {
      if (current === '\\') {
        index += 1;
      } else if (current === quote) {
        quote = null;
      }
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }
    if (current === '(') {
      depth += 1;
      continue;
    }
    if (current === ')' && depth > 0) {
      depth -= 1;
      continue;
    }
    const operator = expression.slice(index, index + 2);
    if (depth === 0 && (operator === '==' || operator === '!=')) {
      return {
        left: expression.slice(0, index).trim(),
        operator,
        right: expression.slice(index + 2).trim()
      };
    }
  }
  return null;
}

function evaluateConstantExpressionTerm(term: string): boolean | null {
  const expression = stripOuterParentheses(term);
  const comparison = getTopLevelComparison(expression);
  if (comparison) {
    const left = parseConstantExpressionLiteral(comparison.left);
    const right = parseConstantExpressionLiteral(comparison.right);
    if (!left || !right || left.kind !== right.kind) {
      return null;
    }
    const equal = left.value === right.value;
    return comparison.operator === '==' ? equal : !equal;
  }
  const literal = parseConstantExpressionLiteral(expression);
  if (literal) {
    return getConstantLiteralTruthiness(literal);
  }
  return null;
}

function isFalseExpressionTerm(term: string): boolean {
  return evaluateConstantExpressionTerm(term) === false;
}

function isTrueExpressionTerm(term: string): boolean {
  return evaluateConstantExpressionTerm(term) === true;
}

function getNegatedExpression(expression: string): string | null {
  const match = stripOuterParentheses(expression).match(/^!\s*([\s\S]+)$/u);
  return match?.[1]?.trim() ?? null;
}

function isAlwaysTrueExpression(expression: string): boolean {
  const strippedExpression = stripOuterParentheses(expression);
  const negatedExpression = getNegatedExpression(strippedExpression);
  if (negatedExpression !== null) {
    return isAlwaysFalseExpression(negatedExpression);
  }
  const orTerms = splitTopLevelExpression(strippedExpression, '||');
  if (orTerms.length > 1) {
    return orTerms.some((term) => isAlwaysTrueExpression(term));
  }
  const andTerms = splitTopLevelExpression(strippedExpression, '&&');
  if (andTerms.length > 1) {
    return andTerms.every((term) => isAlwaysTrueExpression(term));
  }
  return isTrueExpressionTerm(strippedExpression);
}

function isAlwaysFalseExpression(expression: string): boolean {
  const strippedExpression = stripOuterParentheses(expression);
  const negatedExpression = getNegatedExpression(strippedExpression);
  if (negatedExpression !== null) {
    return isAlwaysTrueExpression(negatedExpression);
  }
  const orTerms = splitTopLevelExpression(strippedExpression, '||');
  if (orTerms.length > 1) {
    return orTerms.every((term) => isAlwaysFalseExpression(term));
  }
  const andTerms = splitTopLevelExpression(strippedExpression, '&&');
  if (andTerms.length > 1) {
    return andTerms.some((term) => isAlwaysFalseExpression(term));
  }
  return isFalseExpressionTerm(strippedExpression);
}

function isAlwaysFalseCondition(condition: string): boolean {
  return isAlwaysFalseExpression(unwrapActionsExpression(condition).trim());
}

function installConditionCoversSmokeStep(installCondition: string, smokeCondition: string): boolean {
  if (isAlwaysFalseCondition(smokeCondition)) {
    return false;
  }
  if (installCondition === smokeCondition) {
    return true;
  }
  return installCondition === 'success()' && !hasNonSuccessStatusCheck(smokeCondition);
}

function normalizeShellContinuations(run: string): string {
  return run
    .replace(/\\\r?\n[ \t]*/gu, ' ')
    .replace(/(\|\||&&|\|&?)[ \t]*\r?\n(?:[ \t]*(?:#.*)?\r?\n)*[ \t]*/gu, '$1 ')
    .replace(/\r?\n[ \t]*(?=(?:\|\||&&|\|&?)(?:\s|$))/gu, ' ');
}

function getHeredocState(line: string): HeredocState | null {
  const match = line.match(heredocOperatorPattern);
  const delimiter = match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
  if (!match || !delimiter) {
    return null;
  }
  return {
    allowLeadingTabs: match[1] === '<<-',
    delimiter
  };
}

function isHeredocTerminator(line: string, state: HeredocState): boolean {
  const comparableLine = state.allowLeadingTabs ? line.replace(/^\t+/u, '') : line;
  return comparableLine === state.delimiter;
}

function stripInlineShellComment(line: string): string {
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    if (quote) {
      if (quote === '"' && current === '\\') {
        index += 1;
        continue;
      }
      if (current === quote) {
        quote = null;
      }
      continue;
    }
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }
    if (current === '#' && (index === 0 || /[\s;&|(){}]/u.test(line[index - 1] ?? ''))) {
      return line.slice(0, index).trim();
    }
  }
  return line.trim();
}

function getRunCommandLines(run: string): string[] {
  const commandLines: string[] = [];
  let heredocState: HeredocState | null = null;
  for (const rawLine of normalizeShellContinuations(run).split(/\r?\n/u)) {
    const trimmedRawLine = rawLine.trim();
    if (heredocState) {
      if (isHeredocTerminator(rawLine, heredocState)) {
        heredocState = null;
      }
      continue;
    }
    const line = stripInlineShellComment(trimmedRawLine);
    if (!line || line.startsWith('#')) {
      continue;
    }
    const nextHeredocState = getHeredocState(line);
    if (nextHeredocState) {
      const commandLine = line.replace(heredocOperatorPattern, '').trim();
      if (commandLine.length > 0) {
        commandLines.push(commandLine);
      }
      heredocState = nextHeredocState;
      continue;
    }
    commandLines.push(line);
  }
  return commandLines;
}

function hasCommandText(run: string, command: string): boolean {
  return normalizeShellContinuations(run).includes(command);
}

type PackSmokeCommandOccurrence = {
  commandStartIndex: number;
  endIndex: number;
  hasErrexitDisabled: boolean;
  isInsideControlBlock: boolean;
  isInsideFunctionBlock: boolean;
  line: string;
  matchText: string;
  startIndex: number;
};

function updateErrexitDisabled(disabled: boolean, text: string): boolean {
  let next = disabled;
  const setErrexitPattern = /(?:^|[;&|(){}]\s*)set\s+(?:([+-])[A-Za-z]*e[A-Za-z]*|([+-])o\s+errexit)(?=$|[\s;|&)])/gu;
  for (const match of text.matchAll(setErrexitPattern)) {
    next = (match[1] ?? match[2]) === '+';
  }
  return next;
}

function countMatches(text: string, pattern: RegExp): number {
  return Array.from(text.matchAll(pattern)).length;
}

function updateShellControlDepth(depth: number, line: string): number {
  const openCount = countMatches(line, /(?:^|[;&]\s*)(?:for|if|while|until|case)\b/gu);
  const closeCount = countMatches(line, /(?:^|[;&]\s*)(?:fi|done|esac)\b/gu);
  return Math.max(0, depth + openCount - closeCount);
}

function getCommandSubstitutionDepth(text: string): number {
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let nestedQuote: '"' | "'" | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (quote) {
      if (nestedQuote) {
        if (nestedQuote === '"' && current === '\\') {
          index += 1;
          continue;
        }
        if (current === nestedQuote) {
          nestedQuote = null;
        }
        continue;
      }
      if (quote === '"' && current === '\\') {
        index += 1;
        continue;
      }
      if (quote === '"' && depth > 0 && (current === '"' || current === "'")) {
        nestedQuote = current;
        continue;
      }
      if (current === quote) {
        quote = null;
        continue;
      }
      if (quote === '"' && current === '$' && text[index + 1] === '(') {
        depth += 1;
        index += 1;
        continue;
      }
      if (current === ')' && depth > 0) {
        depth -= 1;
      }
      continue;
    }
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }
    if ((current === '$' || current === '<' || current === '>') && text[index + 1] === '(') {
      depth += 1;
      index += 1;
      continue;
    }
    if (current === ')' && depth > 0) {
      depth -= 1;
    }
  }
  return depth;
}

function getShellQuoteContext(text: string): '"' | "'" | null {
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (quote) {
      if (quote === '"' && current === '\\') {
        index += 1;
        continue;
      }
      if (current === quote) {
        quote = null;
      }
      continue;
    }
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
    }
  }
  return quote;
}

function isQuotedShellLiteralOccurrence(line: string, commandStartIndex: number): boolean {
  const beforeOccurrence = line.slice(0, commandStartIndex);
  const quote = getShellQuoteContext(beforeOccurrence);
  if (!quote) {
    return false;
  }
  return quote === "'" || getCommandSubstitutionDepth(beforeOccurrence) === 0;
}

function getShellGroupingDepth(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '(') {
      depth += 1;
      continue;
    }
    if (current === ')' && depth > 0) {
      depth -= 1;
    }
  }
  return depth;
}

function getShellBraceGroupingDepth(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '{') {
      depth += 1;
      continue;
    }
    if (current === '}' && depth > 0) {
      depth -= 1;
    }
  }
  return depth;
}

function hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence: string, pattern: RegExp): boolean {
  return Array.from(beforeOccurrence.matchAll(pattern)).some((match) => {
    const matchIndex = match.index ?? 0;
    const openParenIndex = beforeOccurrence.indexOf('(', matchIndex);
    return openParenIndex >= 0 && getShellGroupingDepth(beforeOccurrence.slice(openParenIndex)) > 0;
  });
}

function hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence: string, pattern: RegExp): boolean {
  return Array.from(beforeOccurrence.matchAll(pattern)).some((match) => {
    const matchIndex = match.index ?? 0;
    const openBraceIndex = beforeOccurrence.indexOf('{', matchIndex);
    return openBraceIndex >= 0 && getShellBraceGroupingDepth(beforeOccurrence.slice(openBraceIndex)) > 0;
  });
}

type ShellFunctionState = {
  depth: number;
  pendingDefinition: boolean;
};

function getShellFunctionOpenBraceIndexes(line: string, pendingDefinition: boolean): Set<number> {
  const indexes = new Set<number>();
  if (pendingDefinition) {
    const pendingOpenMatch = line.match(/^\s*\{/u);
    if (pendingOpenMatch?.index !== undefined) {
      indexes.add(pendingOpenMatch.index + pendingOpenMatch[0].lastIndexOf('{'));
    }
  }
  for (const match of line.matchAll(shellFunctionOpenPattern)) {
    indexes.add((match.index ?? 0) + match[0].lastIndexOf('{'));
  }
  return indexes;
}

function updateShellFunctionState(depth: number, pendingDefinition: boolean, line: string): ShellFunctionState {
  const functionOpenBraceIndexes = getShellFunctionOpenBraceIndexes(line, pendingDefinition);
  let nextDepth = depth;
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    if (quote) {
      if (quote === '"' && current === '\\') {
        index += 1;
        continue;
      }
      if (current === quote) {
        quote = null;
      }
      continue;
    }
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }
    if (current === '{' && (nextDepth > 0 || functionOpenBraceIndexes.has(index))) {
      nextDepth += 1;
      continue;
    }
    if (current === '}' && nextDepth > 0) {
      nextDepth -= 1;
    }
  }
  return {
    depth: nextDepth,
    pendingDefinition: nextDepth === 0 && functionOpenBraceIndexes.size === 0 && shellFunctionSignaturePattern.test(line)
  };
}

function getPackSmokeCommandOccurrences(run: string): PackSmokeCommandOccurrence[] {
  const occurrences: PackSmokeCommandOccurrence[] = [];
  let controlDepth = 0;
  let errexitDisabled = false;
  let functionDepth = 0;
  let pendingFunctionDefinition = false;
  for (const line of getRunCommandLines(run)) {
    for (const match of line.matchAll(packSmokeInvocationPattern)) {
      const startIndex = match.index ?? 0;
      const commandOffset = match[0].search(/npm\s+run\s+pack:smoke/u);
      const commandStartIndex = startIndex + (commandOffset >= 0 ? commandOffset : 0);
      if (isQuotedShellLiteralOccurrence(line, commandStartIndex)) {
        continue;
      }
      const functionStateBeforeOccurrence = updateShellFunctionState(
        functionDepth,
        pendingFunctionDefinition,
        line.slice(0, commandStartIndex)
      );
      occurrences.push({
        startIndex,
        commandStartIndex,
        hasErrexitDisabled: updateErrexitDisabled(errexitDisabled, line.slice(0, commandStartIndex)),
        isInsideControlBlock: controlDepth > 0,
        isInsideFunctionBlock: functionStateBeforeOccurrence.depth > 0,
        line,
        matchText: match[0],
        endIndex: startIndex + match[0].length
      });
    }
    controlDepth = updateShellControlDepth(controlDepth, line);
    errexitDisabled = updateErrexitDisabled(errexitDisabled, line);
    const functionState = updateShellFunctionState(functionDepth, pendingFunctionDefinition, line);
    functionDepth = functionState.depth;
    pendingFunctionDefinition = functionState.pendingDefinition;
  }
  return occurrences;
}

function hasPackSmokeCommand(run: string): boolean {
  return getPackSmokeCommandOccurrences(run).length > 0;
}

function hasOpenShellControlBlock(beforeOccurrence: string): boolean {
  const openCount = countMatches(beforeOccurrence, /(?:^|[;&]\s*)(?:for|if|while|until|case)\b/gu);
  const closeCount = countMatches(beforeOccurrence, /(?:^|[;&]\s*)(?:fi|done|esac)\b/gu);
  return openCount > closeCount;
}

function hasConstantShortCircuitBeforeOccurrence(beforeOccurrence: string): boolean {
  return (
    trueShortCircuitBeforePackSmokePattern.test(beforeOccurrence) ||
    falseShortCircuitBeforePackSmokePattern.test(beforeOccurrence) ||
    hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence, /(?:^|[;&()]\s*)true\s*\|\|\s*\(/gu) ||
    hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence, /(?:^|[;&()]\s*)false\s*&&\s*\(/gu) ||
    hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence, /(?:^|[;&()]\s*)true\s*\|\|\s*\{/gu) ||
    hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence, /(?:^|[;&()]\s*)false\s*&&\s*\{/gu)
  );
}

function hasAndGuardBeforeOccurrence(beforeOccurrence: string): boolean {
  return (
    andGuardBeforePackSmokePattern.test(beforeOccurrence) ||
    hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence, /&&\s*\(/gu) ||
    hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence, /&&\s*\{/gu)
  );
}

function hasFallbackShortCircuitBeforeOccurrence(beforeOccurrence: string): boolean {
  return (
    fallbackShortCircuitBeforePackSmokePattern.test(beforeOccurrence) ||
    hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence, /\|\|\s*\(/gu) ||
    hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence, /\|\|\s*\{/gu)
  );
}

function hasFunctionDefinitionBeforeOccurrence(beforeOccurrence: string): boolean {
  return (
    updateShellFunctionState(0, false, beforeOccurrence).depth > 0 ||
    shellFunctionOpenBeforeOccurrencePattern.test(beforeOccurrence)
  );
}

function isConditionPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  const matchText = occurrence.matchText.trimStart();
  return (
    occurrence.isInsideControlBlock ||
    /^(?:if|while|until|then|do)\s+/u.test(matchText) ||
    hasOpenShellControlBlock(occurrence.line.slice(0, occurrence.commandStartIndex))
  );
}

function isFunctionPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return (
    occurrence.isInsideFunctionBlock ||
    hasFunctionDefinitionBeforeOccurrence(occurrence.line.slice(0, occurrence.commandStartIndex))
  );
}

function isConstantShortCircuitPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return hasConstantShortCircuitBeforeOccurrence(occurrence.line.slice(0, occurrence.commandStartIndex));
}

function isFallbackShortCircuitPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return hasFallbackShortCircuitBeforeOccurrence(occurrence.line.slice(0, occurrence.commandStartIndex));
}

function isNegatedPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return negatedPackSmokeInvocationPattern.test(occurrence.matchText);
}

function isCommandSubstitutionPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return getCommandSubstitutionDepth(occurrence.line.slice(0, occurrence.commandStartIndex)) > 0;
}

function hasNonBlockingPackSmokeCommand(run: string): boolean {
  return getPackSmokeCommandOccurrences(run).some((occurrence) =>
    (
      isConditionPackSmokeOccurrence(occurrence) ||
      isFunctionPackSmokeOccurrence(occurrence) ||
      isConstantShortCircuitPackSmokeOccurrence(occurrence) ||
      hasAndGuardBeforeOccurrence(occurrence.line.slice(0, occurrence.commandStartIndex)) ||
      isFallbackShortCircuitPackSmokeOccurrence(occurrence) ||
      isNegatedPackSmokeOccurrence(occurrence) ||
      isCommandSubstitutionPackSmokeOccurrence(occurrence) ||
      occurrence.hasErrexitDisabled ||
      nonBlockingPackSmokePattern.test(occurrence.line.slice(occurrence.endIndex))
    )
  );
}

function isDedicatedCodexInstallRun(run: string): boolean {
  const commandLines = getRunCommandLines(run);
  return commandLines.length === 1 && dedicatedCodexInstallCommands.has(commandLines[0]);
}

function isContinueOnErrorEnabled(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed === 'true') {
    return true;
  }
  return trimmed !== 'false' && !isAlwaysFalseCondition(trimmed);
}

describe('packaged codex template posture', () => {
  it('keeps repo-local template config and role files on the portable model', async () => {
    const [config, worker, awaiter] = await Promise.all([
      readText('templates/codex/.codex/config.toml'),
      readText('templates/codex/.codex/agents/worker-complex.toml'),
      readText('templates/codex/.codex/agents/awaiter-high.toml')
    ]);

    for (const content of [config, worker, awaiter]) {
      expect(content).toContain(`model = "${portableTemplateModel}"`);
      expect(content).not.toContain('model = "gpt-5.5"');
    }
    expect(config).toContain(`review_model = "${portableTemplateModel}"`);
  });
});

describe('scripts/pack-smoke env isolation', () => {
  it('strips inherited review control variables for deterministic downstream smoke runs', async () => {
    const { buildPackSmokeReviewEnv } = await import('../scripts/pack-smoke.mjs');
    const env = buildPackSmokeReviewEnv('/tmp/pack-smoke', {
      PATH: '/usr/bin',
      CUSTOM_FLAG: '1',
      FORCE_CODEX_REVIEW: '1',
      CODEX_CLI_BIN: '/tmp/custom-codex',
      CODEX_CONFIG_OVERRIDES: 'model="gpt-5.3-codex"',
      CODEX_MCP_CONFIG_OVERRIDES: 'mcp_servers.delegation.enabled=false',
      NOTES: 'wrong notes',
      SKIP_DIFF_BUDGET: '1',
      DIFF_BUDGET_STAGE: '1',
      DIFF_BUDGET_OVERRIDE_REASON: 'injected-from-parent',
      DIFF_BUDGET_BASE: 'origin/main',
      DIFF_BUDGET_MAX_FILES: '999',
      TASK: 'unexpected-task',
      MCP_RUNNER_TASK_ID: 'unexpected-task',
      CODEX_ORCHESTRATOR_ROOT: '/tmp/other-root',
      CODEX_ORCHESTRATOR_RUN_DIR: '/tmp/other-run',
      CODEX_ORCHESTRATOR_RUNS_DIR: '/tmp/other-runs',
      CODEX_ORCHESTRATOR_OUT_DIR: '/tmp/other-out',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '3'
    });

    expect(env.PATH).toBe('/usr/bin');
    expect(env.CUSTOM_FLAG).toBe('1');
    expect(env.FORCE_CODEX_REVIEW).toBeUndefined();
    expect(env.CODEX_CLI_BIN).toBeUndefined();
    expect(env.CODEX_CONFIG_OVERRIDES).toBeUndefined();
    expect(env.CODEX_MCP_CONFIG_OVERRIDES).toBeUndefined();
    expect(env.NOTES).toContain('pack smoke review coverage');
    expect(env.SKIP_DIFF_BUDGET).toBeUndefined();
    expect(env.DIFF_BUDGET_STAGE).toBeUndefined();
    expect(env.DIFF_BUDGET_OVERRIDE_REASON).toBeUndefined();
    expect(env.DIFF_BUDGET_BASE).toBeUndefined();
    expect(env.DIFF_BUDGET_MAX_FILES).toBeUndefined();
    expect(env.TASK).toBeUndefined();
    expect(env.MCP_RUNNER_TASK_ID).toBe('pack-smoke');
    expect(env.CODEX_ORCHESTRATOR_ROOT).toBe('/tmp/pack-smoke');
    expect(env.CODEX_ORCHESTRATOR_RUN_DIR).toBeUndefined();
    expect(env.CODEX_ORCHESTRATOR_RUNS_DIR).toBeUndefined();
    expect(env.CODEX_ORCHESTRATOR_OUT_DIR).toBeUndefined();
    expect(env.CODEX_REVIEW_ALLOW_HEAVY_COMMANDS).toBeUndefined();
    expect(env.CODEX_REVIEW_TIMEOUT_SECONDS).toBeUndefined();
    expect(env.CODEX_REVIEW_NON_INTERACTIVE).toBe('1');
  });
});

describe('scripts/pack-smoke packaged plugin governance', () => {
  async function withPluginRoot(
    body: (pluginRoot: string) => Promise<void>,
    pluginManifest: Record<string, unknown> = {}
  ): Promise<void> {
    const root = await mkdtemp(join(tmpdir(), 'co-pack-smoke-plugin-governance-'));
    try {
      const pluginRoot = join(root, 'plugin');
      await mkdir(join(pluginRoot, '.codex-plugin'), { recursive: true });
      await writeFile(
        join(pluginRoot, '.codex-plugin', 'plugin.json'),
        `${JSON.stringify({ name: 'codex-orchestrator', version: '0.2.1', ...pluginManifest }, null, 2)}\n`
      );
      await body(pluginRoot);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it('accepts the current packaged plugin when hook and import surfaces are absent', async () => {
    const { assertPackagedPluginGovernanceShape } = await import('../scripts/pack-smoke.mjs');

    await withPluginRoot(async (pluginRoot) => {
      await expect(assertPackagedPluginGovernanceShape(pluginRoot, 'fixture plugin')).resolves.toBeUndefined();
    });
  });

  it('fails closed when plugin-bundled hooks are declared in plugin.json', async () => {
    const { assertPackagedPluginGovernanceShape } = await import('../scripts/pack-smoke.mjs');

    await withPluginRoot(
      async (pluginRoot) => {
        await expect(assertPackagedPluginGovernanceShape(pluginRoot, 'fixture plugin')).rejects.toThrow(
          'fixture plugin plugin manifest must not declare plugin-bundled hooks without explicit CO hook governance'
        );
      },
      { hooks: [{ event: 'SessionStart', command: 'echo unsafe' }] }
    );
  });

  it('fails closed when default hook or imported external-agent config artifacts are packaged', async () => {
    const { assertPackagedPluginGovernanceShape } = await import('../scripts/pack-smoke.mjs');

    await withPluginRoot(async (pluginRoot) => {
      await mkdir(join(pluginRoot, 'hooks'), { recursive: true });
      await writeFile(join(pluginRoot, 'hooks', 'hooks.json'), '{"hooks":[]}\n');

      await expect(assertPackagedPluginGovernanceShape(pluginRoot, 'fixture plugin')).rejects.toThrow(
        'fixture plugin default plugin-bundled hooks manifest should be absent'
      );
    });

    await withPluginRoot(async (pluginRoot) => {
      await writeFile(join(pluginRoot, 'hooks.json'), '{"hooks":[]}\n');

      await expect(assertPackagedPluginGovernanceShape(pluginRoot, 'fixture plugin')).rejects.toThrow(
        'fixture plugin default plugin-bundled hooks config should be absent'
      );
    });

    await withPluginRoot(async (pluginRoot) => {
      await mkdir(join(pluginRoot, '.codex'), { recursive: true });
      await writeFile(join(pluginRoot, '.codex', 'config.toml'), '[features]\nplugin_hooks = true\n');

      await expect(assertPackagedPluginGovernanceShape(pluginRoot, 'fixture plugin')).rejects.toThrow(
        'fixture plugin imported Codex config should be absent'
      );
    });

    await withPluginRoot(async (pluginRoot) => {
      await mkdir(join(pluginRoot, '.codex'), { recursive: true });
      await writeFile(join(pluginRoot, '.codex', 'hooks.json'), '{"hooks":[]}\n');

      await expect(assertPackagedPluginGovernanceShape(pluginRoot, 'fixture plugin')).rejects.toThrow(
        'fixture plugin imported hooks config should be absent'
      );
    });

    await withPluginRoot(async (pluginRoot) => {
      await mkdir(join(pluginRoot, '.agents', 'skills', 'ordinary-skill'), { recursive: true });

      await expect(assertPackagedPluginGovernanceShape(pluginRoot, 'fixture plugin')).rejects.toThrow(
        'fixture plugin imported external-agent skills should be absent'
      );
    });

    await withPluginRoot(async (pluginRoot) => {
      await writeFile(join(pluginRoot, 'AGENTS.md'), '# Migrated guidance\n');

      await expect(assertPackagedPluginGovernanceShape(pluginRoot, 'fixture plugin')).rejects.toThrow(
        'fixture plugin migrated external-agent guidance source should be absent'
      );
    });
  });

  it('fails closed when install config carries hook state or external migration flags', async () => {
    const { assertPluginInstallConfigGovernance } = await import('../scripts/pack-smoke.mjs');
    const root = await mkdtemp(join(tmpdir(), 'co-pack-smoke-install-config-'));
    try {
      const configPath = join(root, 'config.toml');
      const unsafeConfigs = [
        {
          text: [
            '[marketplaces.codex-orchestrator]',
            'source_type = "git"',
            '[plugins."codex-orchestrator@codex-orchestrator"]',
            'enabled = true',
            '[hooks.state."codex-orchestrator-session-start"]',
            'enabled = true',
            ''
          ].join('\n'),
          expected: 'hooks.state'
        },
        {
          text: ['[features]', 'codex_hooks = true', ''].join('\n'),
          expected: 'codex_hooks'
        },
        {
          text: ['[features]', 'plugin_hooks = true', ''].join('\n'),
          expected: 'plugin_hooks'
        },
        {
          text: ['[features]', 'external_migration = true', ''].join('\n'),
          expected: 'external_migration'
        }
      ];

      for (const unsafeConfig of unsafeConfigs) {
        await writeFile(configPath, unsafeConfig.text);
        await expect(assertPluginInstallConfigGovernance(configPath, 'fixture')).rejects.toThrow(
          `fixture plugin install config must not include ungoverned text "${unsafeConfig.expected}"`
        );
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('scripts/pack-smoke marketplace coverage contract', () => {
  it('fails closed when Codex is unavailable unless an explicit reasoned local opt-out is set', async () => {
    const { resolveMarketplaceSmokePrerequisite } = await import('../scripts/pack-smoke.mjs');

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'missing-codex',
        allowMarketplaceSkip: false,
        codexAvailable: false,
        marketplaceCommandArgs: null
      })
    ).toEqual({
      status: 'fail',
      reason: 'codex-unavailable',
      message:
        'Marketplace smoke requires missing-codex in PATH. Set PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 with PACK_SMOKE_MARKETPLACE_SKIP_REASON only for local-dev opt-out.'
    });

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'missing-codex',
        allowMarketplaceSkip: true,
        marketplaceSkipReason: '',
        codexAvailable: false,
        marketplaceCommandArgs: null
      })
    ).toEqual({
      status: 'fail',
      reason: 'missing-skip-reason',
      message:
        'PACK_SMOKE_MARKETPLACE_SKIP_REASON is required when PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 skips marketplace coverage.'
    });

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'missing-codex',
        allowMarketplaceSkip: true,
        marketplaceSkipReason: 'local docs-only validation; no marketplace coverage claimed',
        codexAvailable: false,
        marketplaceCommandArgs: null
      })
    ).toEqual({
      status: 'skip',
      reason: 'codex-unavailable',
      message:
        'Skipping marketplace smoke: missing-codex is unavailable in this environment. Reason: local docs-only validation; no marketplace coverage claimed'
    });
  });

  it('fails closed when Codex lacks marketplace support unless the opt-out is explicit and reasoned', async () => {
    const { resolveMarketplaceSmokePrerequisite } = await import('../scripts/pack-smoke.mjs');

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'codex-0.118',
        allowMarketplaceSkip: false,
        codexAvailable: true,
        marketplaceCommandArgs: null
      })
    ).toEqual({
      status: 'fail',
      reason: 'marketplace-unsupported',
      message:
        'Marketplace smoke requires a Codex CLI with a supported marketplace add command (`codex plugin marketplace add` or `codex marketplace add`). Set PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 with PACK_SMOKE_MARKETPLACE_SKIP_REASON only for local-dev opt-out.'
    });

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'codex-0.118',
        allowMarketplaceSkip: true,
        marketplaceSkipReason: 'explicit pre-0.121 compatibility lane; no release coverage claimed',
        codexAvailable: true,
        marketplaceCommandArgs: null
      })
    ).toEqual({
      status: 'skip',
      reason: 'marketplace-unsupported',
      message:
        'Skipping marketplace smoke: codex-0.118 does not expose a supported marketplace add command (`codex plugin marketplace add` or `codex marketplace add`). Reason: explicit pre-0.121 compatibility lane; no release coverage claimed'
    });
  });

  it('reports the resolved marketplace command when the CLI exposes a supported add path', async () => {
    const { resolveMarketplaceSmokePrerequisite } = await import('../scripts/pack-smoke.mjs');

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'codex-0.123',
        allowMarketplaceSkip: false,
        codexAvailable: true,
        marketplaceCommandArgs: ['plugin', 'marketplace', 'add']
      })
    ).toEqual({
      status: 'run',
      reason: 'marketplace-supported',
      message: 'Marketplace smoke prerequisites satisfied via codex plugin marketplace add.'
    });
  });

  it('prefers plugin marketplace add while preserving the legacy marketplace fallback', async () => {
    const { resolveMarketplaceCommandSupport } = await import('../scripts/pack-smoke.mjs');

    const pluginProbeCalls: string[] = [];
    const pluginSupport = await resolveMarketplaceCommandSupport(
      'codex',
      {},
      async (_command: string, args: string[]) => {
        pluginProbeCalls.push(args.join(' '));
        return true;
      }
    );

    expect(pluginSupport).toMatchObject({
      surface: 'plugin-marketplace',
      displayName: 'codex plugin marketplace add',
      addArgs: ['plugin', 'marketplace', 'add'],
      missingHelpCommands: []
    });
    expect(pluginProbeCalls).toEqual([
      'plugin marketplace add --help',
      'plugin marketplace upgrade --help',
      'plugin marketplace remove --help'
    ]);

    const legacyProbeCalls: string[] = [];
    const legacySupport = await resolveMarketplaceCommandSupport(
      'codex',
      {},
      async (_command: string, args: string[]) => {
        legacyProbeCalls.push(args.join(' '));
        return args.join(' ') === 'marketplace add --help';
      }
    );

    expect(legacySupport).toMatchObject({
      surface: 'legacy-marketplace',
      displayName: 'codex marketplace add',
      addArgs: ['marketplace', 'add'],
      missingHelpCommands: []
    });
    expect(legacyProbeCalls).toEqual([
      'plugin marketplace add --help',
      'marketplace add --help'
    ]);

    const partialPluginProbeCalls: string[] = [];
    const partialPluginSupport = await resolveMarketplaceCommandSupport(
      'codex-0.121',
      {},
      async (_command: string, args: string[]) => {
        partialPluginProbeCalls.push(args.join(' '));
        return (
          args.join(' ') === 'plugin marketplace add --help' ||
          args.join(' ') === 'marketplace add --help'
        );
      }
    );

    expect(partialPluginSupport).toMatchObject({
      surface: 'plugin-marketplace',
      displayName: 'codex plugin marketplace add',
      addArgs: ['plugin', 'marketplace', 'add'],
      missingHelpCommands: [
        'codex-0.121 plugin marketplace upgrade --help',
        'codex-0.121 plugin marketplace remove --help'
      ]
    });
    expect(partialPluginProbeCalls).toEqual([
      'plugin marketplace add --help',
      'plugin marketplace upgrade --help',
      'plugin marketplace remove --help'
    ]);
  });

  it('fails closed when plugin marketplace upgrade/remove help is missing', async () => {
    const { resolveMarketplaceCommandSupport, resolveMarketplaceSmokePrerequisite } = await import(
      '../scripts/pack-smoke.mjs'
    );
    const marketplaceCommand = await resolveMarketplaceCommandSupport(
      'codex-0.125',
      {},
      async (_command: string, args: string[]) => args.join(' ') === 'plugin marketplace add --help'
    );

    expect(marketplaceCommand?.missingHelpCommands).toEqual([
      'codex-0.125 plugin marketplace upgrade --help',
      'codex-0.125 plugin marketplace remove --help'
    ]);
    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'codex-0.125',
        allowMarketplaceSkip: false,
        codexAvailable: true,
        marketplaceCommand
      })
    ).toEqual({
      status: 'fail',
      reason: 'marketplace-help-incomplete',
      message:
        'Marketplace smoke requires plugin marketplace upgrade/remove help detection to pass. Missing: codex-0.125 plugin marketplace upgrade --help, codex-0.125 plugin marketplace remove --help.'
    });
  });

  it('pins CI and release workflows to install the corrected marketplace-capable Codex before pack:smoke', async () => {
    const workflows = [
      '.github/workflows/core-lane.yml',
      '.github/workflows/pack-smoke-backstop.yml',
      '.github/workflows/release.yml'
    ];

    for (const workflow of workflows) {
      const workflowFile = await readWorkflow(workflow);
      expectNoMarketplaceSkipEnv(workflowFile.env, `${workflow} workflow`);
      let smokeStepCount = 0;
      for (const [jobName, job] of Object.entries(workflowFile.jobs ?? {})) {
        expectNoMarketplaceSkipEnv(job.env, `${workflow} job ${jobName}`);
        const jobCondition = getJobCondition(job);
        const codexInstallConditions: string[] = [];
        for (const [stepIndex, step] of getWorkflowSteps(job).entries()) {
          expectNoMarketplaceSkipEnv(step.env, `${workflow} job ${jobName} step ${stepIndex + 1}`);
          const stepCondition = getStepCondition(step);
          const effectiveStepCondition = combineWorkflowConditions(jobCondition, stepCondition);
          const run = typeof step.run === 'string' ? step.run : '';
          expect(run, `${workflow} job ${jobName} must not opt out of marketplace smoke`).not.toContain(
            marketplaceSkipToken
          );
          if (hasCommandText(run, marketplaceCodexInstallCommand)) {
            expect(
              isContinueOnErrorEnabled(step['continue-on-error']),
              `${workflow} job ${jobName} step ${stepIndex + 1} must not continue-on-error Codex install`
            ).toBe(false);
            expect(
              isDedicatedCodexInstallRun(run),
              `${workflow} job ${jobName} step ${stepIndex + 1} must use a dedicated Codex 0.125.0 install step`
            ).toBe(true);
            codexInstallConditions.push(effectiveStepCondition);
          }
          if (hasPackSmokeCommand(run)) {
            smokeStepCount += 1;
            expect(
              isContinueOnErrorEnabled(job['continue-on-error']),
              `${workflow} job ${jobName} must not continue-on-error when it runs pack:smoke`
            ).toBe(false);
            expect(
              isContinueOnErrorEnabled(step['continue-on-error']),
              `${workflow} job ${jobName} step ${stepIndex + 1} must not continue-on-error pack:smoke`
            ).toBe(false);
            expect(
              hasNonBlockingPackSmokeCommand(run),
              `${workflow} job ${jobName} step ${stepIndex + 1} must run pack:smoke as a blocking command`
            ).toBe(false);
            expect(
              isAlwaysFalseCondition(effectiveStepCondition),
              `${workflow} job ${jobName} step ${stepIndex + 1} must not disable pack:smoke with an always-false if condition`
            ).toBe(false);
            expect(
              codexInstallConditions.some((installCondition) =>
                installConditionCoversSmokeStep(installCondition, effectiveStepCondition)
              ),
              `${workflow} job ${jobName} step ${stepIndex + 1} must install Codex 0.125.0 before pack:smoke with matching if condition`
            ).toBe(true);
          }
        }
      }
      expect(smokeStepCount, `${workflow} must run pack:smoke`).toBeGreaterThan(0);
    }
  });

  it('keeps the release publish job on a trusted-publishing runtime without npm self-upgrade', async () => {
    const workflowText = await readText('.github/workflows/release.yml');
    expect(workflowText).not.toContain('npm install --global npm@^11.5.1');
    expect(workflowText).not.toContain('npx --yes npm@11.5.1');
    expect(workflowText).toContain('Release asset ${TARBALL} already exists; preserving existing release tarball.');
    expect(workflowText).toContain('gh release upload "$TAG" "$TARBALL"');
    expect(workflowText).not.toContain('--clobber');
    expect(workflowText).toContain('--draft=false');
    expect(workflowText).toContain('--prerelease=false');
    expect(workflowText).toContain('gh release download "$TAG" --repo "$GITHUB_REPOSITORY" --pattern "$TARBALL_NAME"');
    expect(workflowText).toContain('release.data.assets.find(item => item.name === assetName)');
    expect(workflowText).toContain('core.warning(`No release asset named ${assetName} found; falling back to the build artifact.`)');
    expect(workflowText).toContain("core.setOutput('asset_id', '')");
    expect(workflowText).toContain("steps.asset.outputs.asset_id == ''");
    expect(workflowText).toContain('npm publish "$TARBALL_PATH" --tag "$DIST_TAG" --provenance');
    expect(workflowText).toContain('TARBALL_PATH="release-assets/${TARBALL_NAME}"');
    expect(workflowText).toContain('Expected release asset ${TARBALL_NAME} was not downloaded for ${TAG}.');
    expect(workflowText).toContain('Expected tarball ${TARBALL_NAME} was not found to publish.');
    expect(workflowText).not.toContain('ls release-assets/*.tgz | head -n 1');

    const workflow = await readWorkflow('.github/workflows/release.yml');
    const publishJob = workflow.jobs?.publish;
    expect(publishJob, 'release workflow must define a publish job').toBeDefined();
    const steps = getWorkflowSteps(publishJob as WorkflowJob);
    const setupNodeStep = steps.find((step) => step.uses === 'actions/setup-node@v6');
    const setupNodeWith = setupNodeStep?.with as Record<string, unknown> | undefined;
    expect(String(setupNodeWith?.['node-version']), 'publish job must pin a Node 24 build with npm 11.5.1+').toBe('24.5.0');

    const runtimeStep = steps.find((step) => step.name === 'Verify npm trusted publishing runtime');
    const runtimeRun = typeof runtimeStep?.run === 'string' ? runtimeStep.run : '';
    expect(runtimeRun).toContain('[22, 14, 0]');
    expect(runtimeRun).toContain('[11, 5, 1]');
    expect(runtimeRun).not.toContain('npm install');
  });

  it('pins cloud-canary to the explicit audited Codex candidate before running canaries', async () => {
    const workflow = await readWorkflow('.github/workflows/cloud-canary.yml');
    let installStepCount = 0;
    let canaryStepCount = 0;

    for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
      const codexInstallConditions: string[] = [];
      const jobCondition = getJobCondition(job);
      for (const [stepIndex, step] of getWorkflowSteps(job).entries()) {
        const stepCondition = getStepCondition(step);
        const effectiveStepCondition = combineWorkflowConditions(jobCondition, stepCondition);
        const run = typeof step.run === 'string' ? step.run : '';

        if (hasCommandText(run, cloudCanaryCodexInstallCommand)) {
          expect(
            isDedicatedCodexInstallRun(run),
            `.github/workflows/cloud-canary.yml job ${jobName} step ${stepIndex + 1} must use a dedicated Codex 0.124.0 install step`
          ).toBe(true);
          codexInstallConditions.push(effectiveStepCondition);
          installStepCount += 1;
        }

        if (hasCommandText(run, 'npm run ci:cloud-canary')) {
          canaryStepCount += 1;
          expect(
            codexInstallConditions.some((installCondition) =>
              installConditionCoversSmokeStep(installCondition, effectiveStepCondition)
            ),
            `.github/workflows/cloud-canary.yml job ${jobName} step ${stepIndex + 1} must install Codex 0.124.0 before running ci:cloud-canary`
          ).toBe(true);
        }
      }
    }

    expect(installStepCount, '.github/workflows/cloud-canary.yml must install a pinned Codex candidate').toBe(1);
    expect(canaryStepCount, '.github/workflows/cloud-canary.yml must run ci:cloud-canary').toBeGreaterThan(0);
  });

  it('only treats dedicated Codex install steps as workflow proof', () => {
    expect(isDedicatedCodexInstallRun(marketplaceCodexInstallCommand)).toBe(true);
    expect(isDedicatedCodexInstallRun(cloudCanaryCodexInstallCommand)).toBe(true);
    expect(isDedicatedCodexInstallRun(`${marketplaceCodexInstallCommand} || true`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`${cloudCanaryCodexInstallCommand} || true`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`${marketplaceCodexInstallCommand} \\\n  || true`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`[[ "$NEEDS_CODEX" == 1 ]] && ${marketplaceCodexInstallCommand}`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`[[ "$NEEDS_CODEX" == 1 ]] && ${cloudCanaryCodexInstallCommand}`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`exit 0; ${marketplaceCodexInstallCommand}`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`cat <<EOF\n${marketplaceCodexInstallCommand}\nEOF`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`cat <<EOF\n${cloudCanaryCodexInstallCommand}\nEOF`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`cat <<'EOF-MARK'\n${marketplaceCodexInstallCommand}\nEOF-MARK`)).toBe(false);
    expect(hasPackSmokeCommand(packSmokeCommand)).toBe(true);
    expect(hasPackSmokeCommand(`FOO=1 BAR="two words" ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`env FOO=1 ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`command ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`${packSmokeCommand} -- --flag`)).toBe(true);
    expect(hasPackSmokeCommand(`npm run lint && ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`if ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasPackSmokeCommand(`if FOO=1 ${packSmokeCommand} -- --flag; then echo ok; fi`)).toBe(true);
    expect(hasPackSmokeCommand(`${packSmokeCommand} <<'EOF-MARK'\nbody\nEOF-MARK`)).toBe(true);
    expect(hasPackSmokeCommand(`cat <<EOF; ${packSmokeCommand}\nbody\nEOF`)).toBe(true);
    expect(hasPackSmokeCommand(`echo ${packSmokeCommand}`)).toBe(false);
    expect(hasPackSmokeCommand(`echo "; ${packSmokeCommand};"`)).toBe(false);
    expect(hasPackSmokeCommand(`printf '%s\\n' '${packSmokeCommand}'`)).toBe(false);
    expect(hasPackSmokeCommand(`echo "${packSmokeCommand}"`)).toBe(false);
    expect(hasPackSmokeCommand(`echo ok # ; ${packSmokeCommand}`)).toBe(false);
    expect(hasPackSmokeCommand(`printf '%s # ; ${packSmokeCommand}'`)).toBe(false);
    expect(hasPackSmokeCommand(`echo "$(${packSmokeCommand})"`)).toBe(true);
    expect(hasPackSmokeCommand(`echo "$(printf ')'; ${packSmokeCommand})"`)).toBe(true);
    expect(hasPackSmokeCommand(`echo "<(${packSmokeCommand})"`)).toBe(false);
    expect(hasPackSmokeCommand(`echo ">(${packSmokeCommand})"`)).toBe(false);
    expect(hasPackSmokeCommand(`echo before; ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`echo foo#bar; ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`cat <<'EOF-MARK'\n${packSmokeCommand}\nEOF-MARK`)).toBe(false);
    expect(hasPackSmokeCommand(`${packSmokeCommand}:other`)).toBe(false);
    expect(hasPackSmokeCommand(`cat <<EOF\nEOF # still body\n${packSmokeCommand}\nEOF`)).toBe(false);
    expect(hasPackSmokeCommand(`cat <<EOF\n  EOF\n${packSmokeCommand}\nEOF`)).toBe(false);
    expect(hasPackSmokeCommand(`cat <<-EOF\n\tEOF\n${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`cat <<-EOF\n  EOF\n${packSmokeCommand}\nEOF`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} || true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}||true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}\n|| true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} | tee smoke.log`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} |& tee smoke.log`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} |\n tee smoke.log`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} &`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}&echo done`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} -- --flag &`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}; exit 0`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand};true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} -- --flag || true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`true || ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`false && ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || (${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || (echo retry; ${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || { echo retry; ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || FOO=1 ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || env FOO=1 ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint &&\n  ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint\n&& ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint &&\n  # gated smoke\n  ${packSmokeCommand}`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`npm run lint &&\n\n  ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint ||\n  # fallback smoke\n  ${packSmokeCommand}`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`false && (FOO=1 ${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`false && (command ${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`false && { FOO=1 ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`false && { env FOO=1 ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`[[ "$RUN_SMOKE" == 1 ]] && ${packSmokeCommand}; echo done`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`test -f marker && (${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`test -f marker && { ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if FOO=1 ${packSmokeCommand} -- --flag; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if npm run lint && ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then ${packSmokeCommand}; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then\n  ${packSmokeCommand}\nfi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker\nthen\n  ${packSmokeCommand}\nfi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`for marker in "$MARKERS"; do\n  ${packSmokeCommand}\ndone`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`while false; do ${packSmokeCommand}; done`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`while false; do\n  ${packSmokeCommand}\ndone`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then\n  echo skip\nfi\n${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then echo skip; fi; ${packSmokeCommand}`)).toBe(
      false
    );
    expect(hasNonBlockingPackSmokeCommand(`while false; do echo skip; done; ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`for marker in "$MARKERS"; do echo skip; done; ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`cat <<EOF; ${packSmokeCommand} || true\nbody\nEOF`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if ${packSmokeCommand} <<'EOF-MARK'; then echo ok; fi\nbody\nEOF-MARK`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() {\n  ${packSmokeCommand}\n}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`function run_smoke() {\n  ${packSmokeCommand}\n}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke ()\n{\n  ${packSmokeCommand}\n}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { echo setup; ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { echo "}"; ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { { echo setup; } ${packSmokeCommand}; }`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() {\n  { echo setup; }\n  ${packSmokeCommand}\n}`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`function run_smoke() { echo setup; ${packSmokeCommand}; }`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`{ run_smoke() { ${packSmokeCommand}; }; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`( run_smoke() { ${packSmokeCommand}; } )`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`{ function run_smoke() { ${packSmokeCommand}; }; }`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { echo setup; }; ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { { echo setup; } }; ${packSmokeCommand}`)).toBe(
      false
    );
    expect(hasNonBlockingPackSmokeCommand(`{ ${packSmokeCommand}; }`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`set +e\n${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`set +e; ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`{ set +e; ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`set +e\nset -e\n${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`{ set +e; set -e; ${packSmokeCommand}; }`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`set +o errexit\n${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`{ set +o errexit; ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`set +o errexit\nset -o errexit\n${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`set +euo pipefail\n${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`set +euo pipefail\nset -euo pipefail\n${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`! ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`! env FOO=1 ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`! command ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`echo "; ${packSmokeCommand};"`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`printf '%s\\n' '${packSmokeCommand}'`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`echo ok # ; ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`echo "$(${packSmokeCommand})"`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`echo "$(printf ')'; ${packSmokeCommand})"`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`echo "<(${packSmokeCommand})"`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`echo ">(${packSmokeCommand})"`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`echo <(${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`cat >(${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || true && ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`env FOO=1 ${packSmokeCommand} -- --flag`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`command ${packSmokeCommand} -- --flag`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} -- --flag`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} 2>&1`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} &> smoke.log`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`echo ${packSmokeCommand} || true`)).toBe(false);
    expect(isContinueOnErrorEnabled(true)).toBe(true);
    expect(isContinueOnErrorEnabled('true')).toBe(true);
    expect(isContinueOnErrorEnabled('${{ true }}')).toBe(true);
    expect(isContinueOnErrorEnabled('false')).toBe(false);
    expect(isContinueOnErrorEnabled('${{ false }}')).toBe(false);
    expect(isContinueOnErrorEnabled("${{ fromJSON('false') }}")).toBe(false);
    expect(isContinueOnErrorEnabled('${{ 0 }}')).toBe(false);
    expect(isContinueOnErrorEnabled('${{ null }}')).toBe(false);
    expect(isContinueOnErrorEnabled('${{ 1 == 2 }}')).toBe(false);
    expect(getStepCondition({})).toBe('success()');
    expect(getJobCondition({})).toBe('success()');
    expect(combineWorkflowConditions('false', 'success()')).toBe('false');
    expect(combineWorkflowConditions('success()', '${{ false }}')).toBe('${{ false }}');
    expect(combineWorkflowConditions("${{ matrix.os == 'macos' }}", "${{ inputs.smoke == 'true' }}")).toBe(
      "${{ (matrix.os == 'macos') && (inputs.smoke == 'true') }}"
    );
    expect(installConditionCoversSmokeStep('success()', 'success()')).toBe(true);
    expect(
      installConditionCoversSmokeStep('success()', "${{ steps.downstream-smoke.outputs.required == 'true' }}")
    ).toBe(true);
    expect(isAlwaysFalseCondition('false')).toBe(true);
    expect(isAlwaysFalseCondition('${{ false }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ (false) }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ 0 }}')).toBe(true);
    expect(isAlwaysFalseCondition("${{ '' }}")).toBe(true);
    expect(isAlwaysFalseCondition('${{ null }}')).toBe(true);
    expect(isAlwaysFalseCondition("${{ fromJSON('0') }}")).toBe(true);
    expect(isAlwaysFalseCondition('${{ fromJSON(\'""\') }}')).toBe(true);
    expect(isAlwaysFalseCondition("${{ fromJSON('null') }}")).toBe(true);
    expect(isAlwaysFalseCondition('${{ 1 == 2 }}')).toBe(true);
    expect(isAlwaysFalseCondition("${{ fromJSON('false') }}")).toBe(true);
    expect(isAlwaysFalseCondition("${{ 'same' != 'same' }}")).toBe(true);
    expect(isAlwaysFalseCondition('${{ !(1 == 1) }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ fromJSON("true") == false }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ success() && false }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ false && inputs.force }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ false || false }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ (false) || (false) }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ success() && false || false }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ (success() && false) || false }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ !true }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ !(true) }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ success() && !true }}')).toBe(true);
    expect(isAlwaysFalseCondition(combineWorkflowConditions('${{ false }}', 'success()'))).toBe(true);
    expect(isAlwaysFalseCondition('${{ 1 }}')).toBe(false);
    expect(isAlwaysFalseCondition("${{ 'nonempty' }}")).toBe(false);
    expect(isAlwaysFalseCondition("${{ fromJSON('1') }}")).toBe(false);
    expect(isAlwaysFalseCondition('${{ fromJSON(\'"nonempty"\') }}')).toBe(false);
    expect(isAlwaysFalseCondition('${{ 1 == 1 }}')).toBe(false);
    expect(isAlwaysFalseCondition("${{ fromJSON('true') }}")).toBe(false);
    expect(isAlwaysFalseCondition("${{ inputs.force == 'true' }}")).toBe(false);
    expect(isAlwaysFalseCondition("${{ fromJSON('false') == inputs.force }}")).toBe(false);
    expect(isAlwaysFalseCondition("${{ steps.downstream-smoke.outputs.required == 'true' }}")).toBe(false);
    expect(isAlwaysFalseCondition('${{ inputs.enabled || false }}')).toBe(false);
    expect(isAlwaysFalseCondition('${{ false || inputs.force }}')).toBe(false);
    expect(isAlwaysFalseCondition('${{ !false }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', 'false')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ false }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ 1 == 2 }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', "${{ fromJSON('false') }}")).toBe(false);
    expect(installConditionCoversSmokeStep('success()', combineWorkflowConditions('${{ false }}', 'success()'))).toBe(
      false
    );
    expect(installConditionCoversSmokeStep('success()', 'always()')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ !success() }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ !(success()) }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ ! ( success() ) }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ success() == false }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ success() != true }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', "${{ success() == fromJSON('false') }}")).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ false == success() }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ true != success() }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ success() || inputs.force }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ success() == true }}')).toBe(true);
    expect(installConditionCoversSmokeStep('success()', '${{ success() != false }}')).toBe(true);
    expect(installConditionCoversSmokeStep('success()', '${{ success() && inputs.force }}')).toBe(true);
    expect(installConditionCoversSmokeStep("${{ always() && inputs.force == 'true' }}", 'always()')).toBe(false);
    expect(
      installConditionCoversSmokeStep(
        "${{ always() && inputs.force == 'true' }}",
        "${{ always() && inputs.force == 'true' }}"
      )
    ).toBe(true);
  });
});
