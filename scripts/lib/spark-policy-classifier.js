const SPARK_POLICY_MUST_BE_FILE_CODEBASE_REASON = 'spark role must be file/codebase search only';
const SPARK_POLICY_MISSING_FILE_CODEBASE_REASON = 'spark role missing file/codebase search-only scope';

const SPARK_POLICY_FILE_SEARCH_PATTERN =
  /(?:file[-/ ]search|codebase[-/ ]search|file\/codebase search|file search|codebase search)/i;
const SPARK_POLICY_LIMITING_APPOSITIVE_PATTERN =
  /^\s*(?:and\s+)?(?:(?:confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|limit(?:ed|s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|scop(?:e|ed|es|ing))\b|only[- ](?:as|for|to|search)\b|\bsearch[- ]only\b)/i;
const SPARK_POLICY_NEXT_ASSERTION_BOUNDARY_PATTERN =
  /\s+\b(?:and|but|or|while|whereas)\b\s+(?:(?:(?:can|could|may|might|must|should)\s+)?(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|keep(?:s|ing)?|leav(?:e|es|ing)|limit(?:ed|s|ing)?|mak(?:e|es|ing)|permit(?:s|ted|ting)?|prefer(?:s|ring)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|select(?:s|ing)?|support(?:ed|s|ing)?|us(?:e|ed|es|ing))\s+(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\b|(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\s+(?:are|is|can|could|should|must|may|might|remain(?:s|ing)?|stay(?:s|ing)?|be(?:ing)?|become(?:s|ing)?|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|limit(?:ed|s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|scop(?:e|ed|es|ing)|support(?:ed|s|ing)?)\b)/i;
const SPARK_POLICY_SCOPE_REQUIRED_PATTERN =
  /\b(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|except(?:ion|ions)?|keep(?:s|ing)?|leav(?:e|es|ing)|limit(?:ed|s|ing)?|mak(?:e|es|ing)|only|permitted?|permits?|prefer(?:s|ring)?|remain(?:s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|select(?:s|ing)?|should|support(?:ed|s|ing)?|us(?:e|ed|es|ing)|must)\b/i;
const SPARK_POLICY_ACTIVE_CAPABILITY_PATTERN =
  /^(?:(?:can|could|may|might|should|must)\s+(?:(?:be|being)\s+)?(?:available|helpful|useful|suitable|appropriate|valid|help(?:s|ed|ing)?|assist(?:s|ed|ing)?|aid(?:s|ed|ing)?|debug(?:s|ged|ging)?|diagnos(?:e|es|ed|ing)|triag(?:e|es|ed|ing)|troubleshoot(?:s|ed|ing)?|investigat(?:e|es|ed|ing)|analyz(?:e|es|ed|ing)|inspect(?:s|ed|ing)?|handle(?:s|d|ing)?|cover(?:s|ed|ing)?|serve(?:s|d|ing)?|work(?:s|ed|ing)?|process(?:es|ed|ing)?)|(?:are|is|be(?:ing)?|become(?:s|ing)?|remain(?:s|ing)?|stay(?:s|ing)?)\s+(?:available|helpful|useful|suitable|appropriate|valid)\s+(?:for|with|to)|(?:help(?:s|ed|ing)?|assist(?:s|ed|ing)?|aid(?:s|ed|ing)?)\s+(?:with|for|to))\b/i;
const SPARK_POLICY_GENERIC_SCOPE_ASSERTION_PATTERN =
  /\b(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|except(?:ion|ions)?|file[-/ ]?search|codebase[-/ ]?search|(?:image|visual)\s+(?:inputs?|tasks?)|limit(?:ed|s|ing)?|only|only[- ]search|permitted?|permits?|prefer(?:s|ring)?|remain(?:s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:ed|es|ing)|search[- ]only|select(?:s|ing)?|stay(?:s|ing)?|support(?:ed|s|ing)?|text[- ]only|us(?:e|ed|es|ing))\b/i;
const SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN =
  /\b(?:search(?![- ]?polic(?:y|ies)\b)(?:\s+lanes?)?|search[- ]only|only[- ]search)\b/i;
const SPARK_POLICY_NEUTRAL_ASSERTION_LEAD_PATTERN =
  /^(?:(?:can|could|may|might|must|should)\s+)?(?:allow(?:ed|s|ing)?|are|available|be(?:ing)?|become(?:s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|enabl(?:e|ed|es|ing)|intended|is|limit(?:ed|s|ing)?|only\b|permit(?:s|ted|ting)?|remain(?:s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|search[- ]only\b|select(?:s|ing)?|stay(?:s|ing)?|support(?:ed|s|ing)?|text[- ]only\b|us(?:e|ed|es|ing))\b/i;
const SPARK_POLICY_FORBIDDEN_USAGE_PATTERN =
  /(?:search\/synthesis|\bbroad exploration\b|\bsynthesis\b|\bplanning\b|\bimplementation\b|\breview\b|\bexploration\b)/gi;
const SPARK_POLICY_NEUTRAL_MAINTENANCE_PHRASE_PATTERN =
  /\b(?:planning|review)\s+(?:comments?|context|docs?|documentation|feedback|guidance|notes?|records?|references?|summar(?:y|ies)|updates?)\b/gi;
const SPARK_POLICY_SUPPORT_MAINTENANCE_REFERENCE_PATTERN =
  /^\s*(?:role\s+)?support\s+(?:comments?|context|docs?|documentation|feedback|guidance|notes?|records?|references?|summar(?:y|ies)|updates?)\b/i;
const SPARK_POLICY_SUPPORT_MAINTENANCE_TAIL_PATTERN =
  /^(?:\s*(?:[.;,!?]|$)|\s+(?:(?:can|could|may|might|must|should)\s+)?(?:(?:be|remain|stay)\s+)?(?:changed?|edited|kept|locked|maintained|moved|recorded|renamed|updated?)\b|\s+(?:exist|exists|link|links|live|lives|living|point|points|record|records|reference|references|reside|resides)\b|\s+(?:are|be|been|being|is|was|were)\s+(?:available|changed?|edited|kept|locked|maintained|moved|present|recorded|renamed|updated?)\b)/i;
const SPARK_POLICY_MARKER_AT_START_PATTERN =
  /^(?:[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?)/i;
const SPARK_POLICY_SUFFIX_RESTRICTION_PATTERN =
  /(?:,\s*)?\b(?:do not|don't|must not|should not|cannot|can't|never)\s+(?:(?:route)\s+(?:to\s+)?|(?:use|run|select|choose|prefer)\s+)(?:it\b|(?:(?:the|a|an)\s+)?[`*_]*(?:spark|spark roles?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?=\W|$))/;
const SPARK_POLICY_WITHOUT_FORBIDDEN_SCOPE_PATTERN =
  /\bwithout\s+(?:broad\s+exploration|exploration|implementation|planning|review|search\/synthesis|synthesis)\b/i;
const SPARK_POLICY_DISABLED_NON_USE_PATTERN =
  /(?:\b(?:keep(?:s|ing)?|leav(?:e|es|ing)|set(?:s|ting)?|mark(?:s|ing)?|configur(?:e|es|ed|ing))\s+(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\s+(?:disabled|inactive|off|unset|unconfigured|unavailable)\b|(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\s+(?:are|is|remain(?:s|ing)?|stay(?:s|ing)?|be(?:ing)?|become(?:s|ing)?)\s+(?:disabled|inactive|off|unset|unconfigured|unavailable)\b)/i;
const SPARK_POLICY_DISABLED_GENERIC_SEARCH_SCOPE_PATTERN =
  /\b(?:(?:only\s+)?(?:allow(?:ed|s|ing)?|available|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|intended|limit(?:ed|s|ing)?|permitted?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|scop(?:e|ed|es|ing))\s+(?:as|for|to)\s+search(?:\s+lanes?)?|(?:are|is|be(?:ing)?|remain(?:s|ing)?|stay(?:s|ing)?)\s+(?:only\s+)?(?:for\s+)?search(?:\s+lanes?)?|only\s+for\s+search(?:\s+lanes?)?|(?:search[- ]only|only[- ]search)(?:\s+lanes?)?|(?:unless|until|except\s+(?:when|if)|when|if|where)\s+(?:(?:a|an|the)\s+)?search(?:\s+lanes?)?\s+(?:opts?\s+in|opt\s+in|needs?\b|is\s+(?:needed|required|requested)))\b/i;
const SPARK_POLICY_NON_SPARK_REDIRECT_PATTERN =
  /\b(?:use|prefer|choose|select|route|run)\s+(?:to\s+)?(?:a\s+|an\s+)?(?:non-spark|non\s+spark|alternate|alternative|different|other)\s+(?:roles?|agents?|models?)\s+(?:instead\s+of|over|rather\s+than|before)\s+(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\b/i;
const SPARK_POLICY_DISABLED_ACTIVE_USE_PATTERN =
  /\b(?:(?:and|but|or|then|when|while)\s+)?(?:(?:can|could|may|might|must|should)\s+)?(?:(?:be|being)\s+)?(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|enabl(?:e|ed|es|ing)|keep(?:s|ing)?|leav(?:e|es|ing)|limit(?:ed|s|ing)?|mak(?:e|es|ing)|permit(?:s|ted|ting)?|prefer(?:s|red|ring)?|remain(?:s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|select(?:ed|s|ing)?|stay(?:s|ing)?|support(?:ed|s|ing)?|us(?:e|ed|es|ing))\b/gi;

export function getSparkPolicyViolations(content) {
  const violations = [];
  const reportedLines = new Set();
  for (const result of evaluateSparkPolicyContent(content)) {
    if (result.verdict !== 'forbidden' || reportedLines.has(result.line)) {
      continue;
    }
    violations.push(result);
    reportedLines.add(result.line);
  }
  return violations;
}

export function evaluateSparkPolicyContent(content) {
  const results = [];
  const lines = content.split('\n');
  for (const [index, line] of lines.entries()) {
    const markerIndexes = findSparkPolicyMarkerIndexes(line);
    if (markerIndexes.length === 0) {
      continue;
    }

    for (const markerIndex of markerIndexes) {
      const lineContext = buildSparkPolicyLineContext(lines, index, markerIndex);
      results.push({
        line: index + 1,
        ...classifySparkPolicyLineContext(lineContext.text, lineContext.markerIndex)
      });
    }
  }
  return results;
}

export function classifySparkPolicyLineContext(text, markerIndex) {
  const parsed = parseSparkPolicyLineContext(text, markerIndex);
  if (parsed.neutralReference && !parsed.neutralContinuationAssertion) {
    return {
      marker: parsed.marker,
      markerIndex,
      verdict: 'neutral',
      reason: 'neutral spark policy reference',
      context: text,
      relevantText: parsed.relevantText
    };
  }
  if (parsed.neutralSupportMaintenanceReference) {
    return {
      marker: parsed.marker,
      markerIndex,
      verdict: 'neutral',
      reason: 'neutral spark support maintenance reference',
      context: text,
      relevantText: parsed.relevantText
    };
  }
  if (hasOverbroadSparkUsage(parsed.relevantText) || hasNegatedSparkFileSearchScope(parsed.relevantText)) {
    return {
      marker: parsed.marker,
      markerIndex,
      verdict: 'forbidden',
      reason: SPARK_POLICY_MUST_BE_FILE_CODEBASE_REASON,
      context: text,
      relevantText: parsed.relevantText
    };
  }
  if (hasMissingSparkFileSearchScope(parsed.relevantText)) {
    return {
      marker: parsed.marker,
      markerIndex,
      verdict: 'forbidden',
      reason: SPARK_POLICY_MISSING_FILE_CODEBASE_REASON,
      context: text,
      relevantText: parsed.relevantText
    };
  }
  return {
    marker: parsed.marker,
    markerIndex,
    verdict: 'allowed',
    reason: 'spark policy scope is file/codebase search only or restrictive non-use',
    context: text,
    relevantText: parsed.relevantText
  };
}

function parseSparkPolicyLineContext(text, markerIndex) {
  const marker = readSparkPolicyMarker(text, markerIndex);
  return {
    marker,
    markerIndex,
    text,
    relevantText: text.slice(findLastClauseBoundary(text, markerIndex)),
    neutralReference: isNeutralSparkPolicyReference(text, markerIndex),
    neutralContinuationAssertion: hasNeutralSparkPolicyContinuationAssertion(text, markerIndex),
    neutralSupportMaintenanceReference: isNeutralSparkSupportMaintenanceReference(text, markerIndex)
  };
}

function readSparkPolicyMarker(text, markerIndex) {
  const markerText = text.slice(markerIndex);
  const markerMatch = SPARK_POLICY_MARKER_AT_START_PATTERN.exec(markerText);
  if (markerMatch) {
    return markerMatch[0].replace(/[`*_]/g, '').trim();
  }
  return text.slice(markerIndex, markerIndex + 'spark'.length);
}

function hasMissingSparkFileSearchScope(relevantText) {
  if (hasUnqualifiedActiveUseAfterDisabledNonUse(relevantText)) {
    return true;
  }

  const scopeAssertionWindows = getSparkScopeAssertionWindows(relevantText).filter((markerWindow) =>
    hasSparkPolicyScopeRequiredAssertion(markerWindow)
  );
  if (scopeAssertionWindows.length > 0) {
    return scopeAssertionWindows.some(
      (markerWindow) =>
        !isRestrictiveSparkPolicyStatement(markerWindow) &&
        (hasNonFileSparkScopeAssertion(markerWindow) ||
          !SPARK_POLICY_FILE_SEARCH_PATTERN.test(markerWindow) ||
          hasUnqualifiedLaterSparkScopeAssertion(markerWindow))
    );
  }
  if (isRestrictiveSparkPolicyStatement(relevantText)) {
    return false;
  }
  return hasSparkPolicyScopeRequiredAssertion(relevantText) && !SPARK_POLICY_FILE_SEARCH_PATTERN.test(relevantText);
}

function hasSparkPolicyScopeRequiredAssertion(text) {
  return SPARK_POLICY_SCOPE_REQUIRED_PATTERN.test(text) || hasSparkPolicyActiveCapabilityAssertion(text);
}

function hasSparkPolicyActiveCapabilityAssertion(text) {
  for (const markerIndex of findSparkPolicyMarkerIndexes(text)) {
    if (
      isNeutralSparkPolicyReference(text, markerIndex) ||
      isNeutralSparkSupportMaintenanceReference(text, markerIndex)
    ) {
      continue;
    }
    const clauseEnd = findNextClauseBoundary(text, markerIndex);
    const predicate = sliceAfterSparkPolicyMarker(text, markerIndex, clauseEnd).trimStart();
    if (SPARK_POLICY_ACTIVE_CAPABILITY_PATTERN.test(predicate)) {
      return true;
    }
  }
  return false;
}

function getSparkScopeAssertionWindows(relevantText) {
  return findSparkPolicyMarkerIndexes(relevantText)
    .filter(
      (markerIndex) =>
        !isNeutralSparkPolicyReference(relevantText, markerIndex) &&
        !isNeutralSparkSupportMaintenanceReference(relevantText, markerIndex)
    )
    .map((markerIndex) => {
      const clauseStart = findLastClauseBoundary(relevantText, markerIndex);
      const clauseEnd = findNextClauseBoundary(relevantText, markerIndex);
      const markerClause = relevantText.slice(clauseStart, clauseEnd);
      return buildSparkPolicyMarkerWindow(markerClause, markerIndex - clauseStart);
    });
}

function buildSparkPolicyMarkerWindow(markerClause, markerIndex) {
  const prefix = markerClause.slice(0, markerIndex);
  const suffix = markerClause.slice(markerIndex);
  const frontedQualifierStart = findSparkPolicyFrontedFileSearchQualifierStart(prefix);
  const prefixStart =
    frontedQualifierStart ?? Math.max(prefix.lastIndexOf(',') + 1, findSparkPolicyPreviousAssertionPrefixEnd(prefix));
  const suffixEnd = findSparkPolicyMarkerWindowSuffixEnd(suffix);
  const localPrefix = prefix.slice(prefixStart);
  const localSuffix = suffix.slice(0, suffixEnd);
  return `${localPrefix}${localSuffix}`;
}

function findSparkPolicyFrontedFileSearchQualifierStart(prefix) {
  const fileSearchPattern = new RegExp(SPARK_POLICY_FILE_SEARCH_PATTERN.source, 'gi');
  let qualifierStart = null;
  for (const match of prefix.matchAll(fileSearchPattern)) {
    const fileSearchIndex = match.index ?? -1;
    if (fileSearchIndex === -1) {
      continue;
    }
    const segmentEnd = prefix.indexOf(',', fileSearchIndex);
    if (segmentEnd === -1) {
      continue;
    }
    const segmentStart = prefix.lastIndexOf(',', fileSearchIndex) + 1;
    const candidate = prefix.slice(segmentStart, segmentEnd + 1);
    if (/^\s*(?:[-*+]\s+|\d+\.\s+)?(?:only\s+)?(?:for|when|while|during|in|as)\b/i.test(candidate)) {
      qualifierStart = segmentStart;
    }
  }
  return qualifierStart;
}

function findSparkPolicyMarkerWindowSuffixEnd(suffix) {
  const firstComma = suffix.indexOf(',');
  const assertionBoundary = findSparkPolicyNextAssertionBoundary(suffix);
  if (firstComma === -1) {
    return assertionBoundary === -1 ? suffix.length : assertionBoundary;
  }
  if (assertionBoundary !== -1 && assertionBoundary < firstComma) {
    return assertionBoundary;
  }
  const localSuffix = suffix.slice(0, firstComma);
  const followingText = suffix.slice(firstComma + 1);
  const trailingQualifierEnd = findSparkPolicyTrailingFileSearchQualifierEnd(followingText);
  if (trailingQualifierEnd !== -1) {
    return firstComma + 1 + trailingQualifierEnd;
  }
  if (isBareSparkPolicyMarkerWindow(localSuffix) && SPARK_POLICY_LIMITING_APPOSITIVE_PATTERN.test(followingText)) {
    const nextComma = followingText.indexOf(',');
    const followingAssertionBoundary = findSparkPolicyNextAssertionBoundary(followingText);
    const followingSuffixEnd = minPositiveIndex(followingText.length, nextComma, followingAssertionBoundary);
    return firstComma + 1 + followingSuffixEnd;
  }
  const sharedMarkerListQualifierEnd = findSparkPolicySharedMarkerListQualifierEnd(suffix);
  if (sharedMarkerListQualifierEnd !== -1) {
    return sharedMarkerListQualifierEnd;
  }
  const continuedGenericSearchAssertionEnd = findSparkPolicyContinuedGenericSearchAssertionEnd(followingText);
  if (continuedGenericSearchAssertionEnd !== -1) {
    return firstComma + 1 + continuedGenericSearchAssertionEnd;
  }
  return firstComma;
}

function findSparkPolicyNextAssertionBoundary(text) {
  const match = SPARK_POLICY_NEXT_ASSERTION_BOUNDARY_PATTERN.exec(text);
  return match?.index ?? -1;
}

function findSparkPolicyTrailingFileSearchQualifierEnd(text) {
  const nextComma = text.indexOf(',');
  const assertionBoundary = findSparkPolicyNextAssertionBoundary(text);
  const qualifierEnd = minPositiveIndex(text.length, nextComma, assertionBoundary);
  const qualifier = text.slice(0, qualifierEnd);
  if (
    /^\s*(?:and\s+)?(?:only\s+)?(?:as|during|for|in|when|while)\b/i.test(qualifier) &&
    SPARK_POLICY_FILE_SEARCH_PATTERN.test(qualifier)
  ) {
    return qualifierEnd;
  }
  return -1;
}

function findSparkPolicySharedMarkerListQualifierEnd(text) {
  const fileSearchMatch = SPARK_POLICY_FILE_SEARCH_PATTERN.exec(text);
  if (!fileSearchMatch) {
    return -1;
  }
  const qualifierStart = fileSearchMatch.index;
  const markerListPrefix = text
    .slice(0, qualifierStart)
    .replace(/\s+(?:only\s+)?(?:as|during|for|in|when|while)\s*$/i, '');
  if (!isSparkPolicyMarkerList(markerListPrefix)) {
    return -1;
  }
  const qualifierText = text.slice(qualifierStart);
  const nextComma = qualifierText.indexOf(',');
  const assertionBoundary = findSparkPolicyNextAssertionBoundary(qualifierText);
  return qualifierStart + minPositiveIndex(qualifierText.length, nextComma, assertionBoundary);
}

function findSparkPolicyContinuedGenericSearchAssertionEnd(text) {
  const clauseEnd = findNextClauseBoundary(text, 0);
  const nextComma = text.indexOf(',');
  const assertionEnd = minPositiveIndex(clauseEnd, nextComma);
  const assertion = text.slice(0, assertionEnd);
  if (
    SPARK_POLICY_GENERIC_SCOPE_ASSERTION_PATTERN.test(assertion) &&
    SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(assertion) &&
    !SPARK_POLICY_FILE_SEARCH_PATTERN.test(assertion) &&
    !isRestrictiveSparkPolicyStatement(assertion)
  ) {
    return assertionEnd;
  }
  return -1;
}

function isSparkPolicyMarkerList(text) {
  const markers = text
    .trim()
    .replace(/\s*,\s*(?:and|or)\s+/gi, ',')
    .replace(/\s+(?:and|or)\s+/gi, ',')
    .split(/\s*,\s*/)
    .filter((marker) => marker.length > 0);
  return markers.length > 1 && markers.every((marker) => isBareSparkPolicyMarkerWindow(marker));
}

function findSparkPolicyPreviousAssertionPrefixEnd(text) {
  const policyVerbMatch =
    /\s+\b(?:and|but|or|while|whereas)\b\s+((?:(?:can|could|may|might|must|should)\s+)?(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|keep(?:s|ing)?|leav(?:e|es|ing)|limit(?:ed|s|ing)?|mak(?:e|es|ing)|permit(?:s|ted|ting)?|prefer(?:s|ring)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|select(?:s|ing)?|support(?:ed|s|ing)?|us(?:e|ed|es|ing))\s+(?:(?:the|a|an)\s+)?[`*_]*)$/i.exec(
      text
    );
  if (policyVerbMatch) {
    return policyVerbMatch.index + policyVerbMatch[0].length - policyVerbMatch[1].length;
  }
  const match = /\s+\b(?:and|but|or|while|whereas)\b\s+(?:(?:the|a|an)\s+)?[`*_]*$/i.exec(text);
  return match ? match.index + match[0].length : 0;
}

function minPositiveIndex(fallback, ...indexes) {
  return indexes.filter((index) => index >= 0).reduce((min, index) => Math.min(min, index), fallback);
}

function isBareSparkPolicyMarkerWindow(text) {
  const normalized = text
    .replace(/[`*]/g, '')
    .replace(/(^|[^A-Za-z0-9])_+(?=[A-Za-z0-9])/g, '$1')
    .replace(/([A-Za-z0-9])_+(?=$|[^A-Za-z0-9])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return /^(?:(?:the|a|an)\s+)?(?:spark(?:\s+roles?)?|explorer_fast(?:\s+(?:roles?|agents?|models?))?|gpt-5\.3-codex-spark(?:\s+(?:roles?|agents?|models?))?)$/.test(
    normalized
  );
}

function isRestrictiveSparkPolicyStatement(relevantText) {
  return (
    /\b(?:do not|don't|must not|should not|cannot|can't|never)\b/i.test(relevantText) ||
    /\bnot\s+(?:available\s+for|for|intended\s+for|to\s+be\s+used\s+for|used\s+for)\b/i.test(relevantText) ||
    SPARK_POLICY_NON_SPARK_REDIRECT_PATTERN.test(relevantText) ||
    SPARK_POLICY_DISABLED_NON_USE_PATTERN.test(relevantText) ||
    SPARK_POLICY_WITHOUT_FORBIDDEN_SCOPE_PATTERN.test(relevantText) ||
    /\bno\s+(?:broad\s+exploration|exploration|implementation|planning|review|search\/synthesis|synthesis)\b/i.test(
      relevantText
    )
  );
}

function hasUnqualifiedActiveUseAfterDisabledNonUse(relevantText) {
  const disabledPattern = new RegExp(SPARK_POLICY_DISABLED_NON_USE_PATTERN.source, 'gi');
  for (const disabledMatch of relevantText.matchAll(disabledPattern)) {
    const tail = relevantText.slice((disabledMatch.index ?? 0) + disabledMatch[0].length);
    const disabledTailClause = tail.slice(0, findNextClauseBoundary(tail, 0));
    const disabledTailSearchScopeMatch = SPARK_POLICY_DISABLED_GENERIC_SEARCH_SCOPE_PATTERN.exec(disabledTailClause);
    if (
      disabledTailSearchScopeMatch &&
      !isNegatedSparkGenericSearchScope(disabledTailClause, disabledTailSearchScopeMatch.index ?? 0) &&
      !SPARK_POLICY_FILE_SEARCH_PATTERN.test(disabledTailClause)
    ) {
      return true;
    }

    for (const activeUseMatch of tail.matchAll(SPARK_POLICY_DISABLED_ACTIVE_USE_PATTERN)) {
      if (isNegatedSparkActiveUse(tail, activeUseMatch)) {
        continue;
      }

      const activeText = tail.slice(activeUseMatch.index ?? 0);
      const activeClause = activeText.slice(0, findNextClauseBoundary(activeText, 0));
      if (SPARK_POLICY_NON_SPARK_REDIRECT_PATTERN.test(activeClause)) {
        continue;
      }

      if (
        (SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(activeClause) ||
          hasNonFileSparkScopeAssertion(activeClause)) &&
        !SPARK_POLICY_FILE_SEARCH_PATTERN.test(activeClause)
      ) {
        return true;
      }
    }
  }

  return false;
}

function isNegatedSparkGenericSearchScope(text, matchIndex) {
  const immediatePrefix = text.slice(Math.max(0, matchIndex - 40), matchIndex);
  return /\b(?:do not|don't|must not|should not|can(?:not|'t| not)|never|not|no|without)\s+(?:(?:be|being)\s+)?$/i.test(
    immediatePrefix
  );
}

function hasNonFileSparkScopeAssertion(text) {
  return (
    /\b(?:(?:image|visual)\s+(?:analysis|generation|inputs?|inspection|outputs?|processing|reasoning|review|tasks?|understanding|work)|text[- ]only)\b/i.test(text) ||
    new RegExp(SPARK_POLICY_FORBIDDEN_USAGE_PATTERN.source, 'i').test(text)
  );
}

function isNegatedSparkActiveUse(text, activeUseMatch) {
  const activeStart = activeUseMatch.index ?? 0;
  const immediatePrefix = text.slice(Math.max(0, activeStart - 40), activeStart);
  return /\b(?:do not|don't|must not|should not|can(?:not|'t| not)|never|not|no)\s+(?:(?:be|being)\s+)?$/i.test(
    immediatePrefix
  );
}

function hasUnqualifiedLaterSparkScopeAssertion(markerWindow) {
  const fileSearchMatch = SPARK_POLICY_FILE_SEARCH_PATTERN.exec(markerWindow);
  if (!fileSearchMatch) {
    return false;
  }

  const separatorPattern = /\s+\b(?:and|or|but|while|whereas)\b\s+/gi;
  const separators = [...markerWindow.matchAll(separatorPattern)];
  const assertionRanges = [
    { start: 0, end: separators[0]?.index ?? markerWindow.length },
    ...separators.map((separator, index) => ({
      start: separator.index ?? 0,
      end: separators[index + 1]?.index ?? markerWindow.length
    }))
  ];
  for (const { start, end } of assertionRanges) {
    const assertion = markerWindow.slice(start, end);
    if (
      SPARK_POLICY_GENERIC_SCOPE_ASSERTION_PATTERN.test(assertion) &&
      (SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(assertion) || hasNonFileSparkScopeAssertion(assertion)) &&
      !SPARK_POLICY_FILE_SEARCH_PATTERN.test(assertion) &&
      !isRestrictiveSparkPolicyStatement(assertion)
    ) {
      return true;
    }
  }

  return false;
}

function hasOverbroadSparkUsage(relevantText) {
  for (const match of relevantText.matchAll(SPARK_POLICY_FORBIDDEN_USAGE_PATTERN)) {
    if (!isRestrictiveSparkUsageMention(relevantText, match.index ?? 0)) {
      return true;
    }
  }
  return false;
}

function hasNegatedSparkFileSearchScope(relevantText) {
  return (
    /\bnot\s+(?:exclusively|just|limited(?:\s+to)?|only|solely)\b/i.test(relevantText) &&
    SPARK_POLICY_FILE_SEARCH_PATTERN.test(relevantText)
  );
}

function isRestrictiveSparkUsageMention(relevantText, mentionIndex) {
  const clauseStart = findLastClauseBoundary(relevantText, mentionIndex);
  const clauseEnd = findNextClauseBoundary(relevantText, mentionIndex);
  const clausePrefix = relevantText.slice(clauseStart, mentionIndex).toLowerCase();
  const clauseSuffix = relevantText.slice(mentionIndex, clauseEnd).toLowerCase();
  const localClausePrefix = sliceAfterLastContrast(clausePrefix);
  const localClause = `${localClausePrefix}${clauseSuffix}`;
  if (
    /\b(?:use|prefer|choose|select|route|run)\s+(?:a\s+|an\s+)?(?:non-spark|non\s+spark|alternate|alternative|different|other)\s+(?:roles?|agents?|models?)\b/.test(
      localClausePrefix
    )
  ) {
    return true;
  }
  if (/\bnot\s+(?:exclusively|just|limited\b|limited\s+to|only|solely)\b/.test(localClausePrefix)) {
    return false;
  }
  if (
    /\b(?:do not|don't|must not|should not|cannot|can't|never|not|no)\b/.test(localClausePrefix) ||
    SPARK_POLICY_WITHOUT_FORBIDDEN_SCOPE_PATTERN.test(localClause)
  ) {
    return true;
  }
  return hasSuffixRestrictionForSparkUsage(localClausePrefix, clauseSuffix);
}

function buildSparkPolicyLineContext(
  lines,
  lineIndex,
  markerIndex
) {
  const currentLine = lines[lineIndex] ?? '';
  const startLine = findSparkPolicyContextStartLine(lines, lineIndex);
  const parts = [];
  let adjustedMarkerIndex = markerIndex;
  for (let index = startLine; index < lineIndex; index += 1) {
    const previousPart = (lines[index] ?? '').trim();
    parts.push(previousPart);
    adjustedMarkerIndex += previousPart.length + 1;
  }
  parts.push(currentLine.trimEnd());
  for (let index = lineIndex + 1; index < lines.length; index += 1) {
    const nextLine = lines[index] ?? '';
    if (isSparkPolicyLineContextBoundary(nextLine)) {
      break;
    }
    parts.push(nextLine.trim());
  }
  return {
    text: parts.join(' '),
    markerIndex: adjustedMarkerIndex
  };
}

function isSparkPolicyLineContextBoundary(line) {
  return isSparkPolicyHardContextBoundary(line) || isSparkPolicyListItemLine(line);
}

function findSparkPolicyContextStartLine(lines, lineIndex) {
  let startLine = lineIndex;
  while (startLine > 0) {
    const previousLine = lines[startLine - 1] ?? '';
    const currentLine = lines[startLine] ?? '';
    if (isSparkPolicyHardContextBoundary(previousLine) || isSparkPolicyListItemLine(currentLine)) {
      break;
    }
    startLine -= 1;
    if (isSparkPolicyListItemLine(previousLine)) {
      break;
    }
  }
  return startLine;
}

function isSparkPolicyHardContextBoundary(line) {
  const trimmed = line.trim();
  return trimmed.length === 0 || /^(?:#{1,6}\s+|>\s+|```|~~~|\|)/.test(trimmed);
}

function isSparkPolicyListItemLine(line) {
  return /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line);
}

function sliceAfterLastContrast(text) {
  let lastContrastEnd = 0;
  for (const match of text.matchAll(/\b(?:but|except|unless)\b/gi)) {
    lastContrastEnd = (match.index ?? 0) + match[0].length;
  }
  return lastContrastEnd === 0 ? text : text.slice(lastContrastEnd);
}

function hasSuffixRestrictionForSparkUsage(clausePrefix, clauseSuffix) {
  const restrictionMatch = SPARK_POLICY_SUFFIX_RESTRICTION_PATTERN.exec(clauseSuffix);
  if (!restrictionMatch) {
    return false;
  }
  const prefixBeforeRestriction = clauseSuffix.slice(0, restrictionMatch.index);
  if (/\b(?:but|except|unless)\b/.test(prefixBeforeRestriction)) {
    return false;
  }
  return isFrontedSparkRestrictionScope(`${clausePrefix}${prefixBeforeRestriction}`);
}

function isFrontedSparkRestrictionScope(prefixBeforeRestriction) {
  const normalized = prefixBeforeRestriction
    .replace(/[`*_]/g, '')
    .replace(/^\s*[-+]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const frontedScope = normalized.replace(/^(?:for|when|while|during)\s+/, '');
  return isSparkForbiddenScopeList(frontedScope);
}

function isSparkForbiddenScopeList(scopeText) {
  return /^(?:(?:broad exploration|exploration|implementation|planning|review|search\/synthesis|synthesis)(?:\s+tasks?)?\s*(?:,|\/|and|or)?\s*)+$/.test(
    scopeText
  );
}

function findLastClauseBoundary(text, beforeIndex) {
  const boundary = Math.max(
    text.lastIndexOf('.', beforeIndex),
    text.lastIndexOf(';', beforeIndex),
    text.lastIndexOf('!', beforeIndex),
    text.lastIndexOf('?', beforeIndex)
  );
  return boundary === -1 ? 0 : boundary + 1;
}

function findNextClauseBoundary(text, afterIndex) {
  for (let index = afterIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === ';' || char === '!' || char === '?') {
      return index;
    }
    if (char === '.' && !isInternalClausePeriod(text, index)) {
      return index;
    }
  }
  return text.length;
}

function isInternalClausePeriod(text, index) {
  const previous = text[index - 1] ?? '';
  const next = text[index + 1] ?? '';
  return /[A-Za-z0-9]/.test(previous) && /[A-Za-z0-9]/.test(next);
}

function findSparkPolicyMarkerIndexes(line) {
  const markers = [/explorer_fast/i, /gpt-5\.3-codex-spark/i];
  const indexes = markers
    .flatMap((marker) => [...line.matchAll(new RegExp(marker.source, `${marker.flags}g`))].map((match) => match.index ?? -1))
    .filter((index) => index >= 0);
  indexes.push(...findSparkWordPolicyMarkerIndexes(line));
  return [...new Set(indexes)].sort((a, b) => a - b);
}

function findSparkWordPolicyMarkerIndexes(line) {
  const indexes = [];
  for (const match of line.matchAll(/\bspark\b/gi)) {
    const index = match.index ?? -1;
    const prefix = line.slice(Math.max(0, index - 4), index).toLowerCase();
    if (prefix === 'non-' || prefix === 'non ') {
      continue;
    }
    indexes.push(index);
  }
  return indexes;
}

function isNeutralSparkPolicyReference(text, markerIndex) {
  const clauseEnd = findNextClauseBoundary(text, markerIndex);
  const afterSpark = sliceAfterSparkPolicyMarker(text, markerIndex, clauseEnd);
  const policyMatch = /^\s*[- ]?polic(?:y|ies)\b/i.exec(afterSpark);
  if (!policyMatch) {
    return false;
  }
  const afterPolicy = afterSpark.slice(policyMatch[0].length);
  const localAfterPolicy = afterPolicy.slice(
    0,
    minPositiveIndex(afterPolicy.length, afterPolicy.indexOf(','), findSparkPolicyNextAssertionBoundary(afterPolicy))
  );
  const assertionText = localAfterPolicy.replace(SPARK_POLICY_NEUTRAL_MAINTENANCE_PHRASE_PATTERN, '');
  return (
    !new RegExp(SPARK_POLICY_FORBIDDEN_USAGE_PATTERN.source, 'i').test(assertionText) &&
    !SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(assertionText) &&
    !hasNonFileSparkScopeAssertion(assertionText) &&
    !/\benabl(?:e|ed|es|ing)\b/i.test(assertionText)
  );
}

function isNeutralSparkSupportMaintenanceReference(text, markerIndex) {
  const clauseEnd = findNextClauseBoundary(text, markerIndex);
  const afterSpark = sliceAfterSparkPolicyMarker(text, markerIndex, clauseEnd);
  const supportMaintenanceMatch = SPARK_POLICY_SUPPORT_MAINTENANCE_REFERENCE_PATTERN.exec(afterSpark);
  if (!supportMaintenanceMatch) {
    return false;
  }
  const afterSupportMaintenance = afterSpark.slice(supportMaintenanceMatch[0].length);
  return (
    SPARK_POLICY_SUPPORT_MAINTENANCE_TAIL_PATTERN.test(afterSupportMaintenance) &&
    !hasSparkPolicyAssertionText(afterSupportMaintenance)
  );
}

function sliceAfterSparkPolicyMarker(text, markerIndex, clauseEnd) {
  const markerText = text.slice(markerIndex, clauseEnd);
  const markerMatch = SPARK_POLICY_MARKER_AT_START_PATTERN.exec(markerText);
  if (!markerMatch) {
    return text.slice(markerIndex + 'spark'.length, clauseEnd);
  }
  return markerText.slice(markerMatch[0].length);
}

function hasNeutralSparkPolicyContinuationAssertion(text, markerIndex) {
  const clauseEnd = findNextClauseBoundary(text, markerIndex);
  const afterSpark = sliceAfterSparkPolicyMarker(text, markerIndex, clauseEnd);
  const policyMatch = /^\s*[- ]?polic(?:y|ies)\b/i.exec(afterSpark);
  if (!policyMatch) {
    return false;
  }
  const afterPolicy = afterSpark.slice(policyMatch[0].length);
  const localEnd = minPositiveIndex(
    afterPolicy.length,
    afterPolicy.indexOf(','),
    findSparkPolicyNextAssertionBoundary(afterPolicy)
  );
  const continuation = afterPolicy.slice(localEnd);
  return (
    hasSparkPolicyAssertionText(continuation) ||
    hasNeutralSparkPolicyPostClauseAssertion(text.slice(clauseEnd))
  );
}

function hasSparkPolicyAssertionText(text) {
  return (
    new RegExp(SPARK_POLICY_FORBIDDEN_USAGE_PATTERN.source, 'i').test(text) ||
    SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(text) ||
    hasNonFileSparkScopeAssertion(text) ||
    /\benabl(?:e|ed|es|ing)\b/i.test(text)
  );
}

function hasNeutralSparkPolicyPostClauseAssertion(text) {
  const tail = text.replace(/^\s*[;.!?]\s*/, '').trim();
  if (tail.length === 0) {
    return false;
  }
  const firstClause = tail.slice(0, findNextClauseBoundary(tail, 0)).trim();
  const assertionCandidate = firstClause
    .replace(/^(?:and|but|or|then)\s+/i, '')
    .replace(/^(?:(?:it|this|that|the\s+(?:spark\s+)?polic(?:y|ies))\s+)/i, '');
  return (
    SPARK_POLICY_NEUTRAL_ASSERTION_LEAD_PATTERN.test(assertionCandidate) &&
    hasSparkPolicyAssertionText(assertionCandidate)
  );
}
