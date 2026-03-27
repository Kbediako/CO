import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { resolve } from 'node:path';

import {
  findPermitEntry,
  loadPermitFile,
  resolveRuntimeProofCapabilities,
  type CompliancePermitSource
} from '../../../../scripts/design/pipeline/permit.js';

export type ProviderLinearRuntimeProofKind = 'screenshot' | 'external-link' | 'video';
export type ProviderLinearRuntimeProofReachabilityMode = 'deterministic' | 'dns-public';

export interface ProviderLinearRuntimeProofReachability {
  mode: ProviderLinearRuntimeProofReachabilityMode;
  dns_ran: boolean;
  hostname: string | null;
  resolved_addresses: string[];
  summary: string;
  caveat: string;
}

export interface ProviderLinearRuntimeProofPolicy {
  origin: string;
  permit_path: string;
  permit_status: 'found' | 'missing' | 'origin_missing';
  approval_id: string | null;
  approver: string | null;
  capabilities: {
    screenshot: boolean;
    external_link: boolean;
    video: boolean;
  };
  allowed_kinds: ProviderLinearRuntimeProofKind[];
  blocked_kinds: ProviderLinearRuntimeProofKind[];
  summary: string;
}

export interface ProviderLinearRuntimeProofError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface ProviderLinearRuntimeProofResolutionSuccess {
  ok: true;
  policy: ProviderLinearRuntimeProofPolicy;
  proof: {
    kind: ProviderLinearRuntimeProofKind;
    reviewer_url: string;
    title: string;
    summary: string | null;
  } | null;
  handoff: {
    workpad_markdown: string;
    pr_markdown: string;
  } | null;
  reachability: ProviderLinearRuntimeProofReachability;
}

export interface ProviderLinearRuntimeProofResolutionFailure {
  ok: false;
  policy: ProviderLinearRuntimeProofPolicy | null;
  error: ProviderLinearRuntimeProofError;
}

export type ProviderLinearRuntimeProofResolution =
  | ProviderLinearRuntimeProofResolutionSuccess
  | ProviderLinearRuntimeProofResolutionFailure;

export interface ResolveProviderLinearRuntimeProofInput {
  repoRoot: string;
  origin: string;
  kind?: string | null;
  proofUrl?: string | null;
  title?: string | null;
  summary?: string | null;
  reachabilityMode?: string | null;
}

interface ProviderLinearRuntimeProofDnsAddress {
  address: string;
  family: number;
}

interface ProviderLinearRuntimeProofDependencies {
  dnsLookup: (hostname: string) => Promise<ProviderLinearRuntimeProofDnsAddress[]>;
}

type ProviderLinearRuntimeProofReachabilityResolution =
  | {
      ok: true;
      reachability: ProviderLinearRuntimeProofReachability;
    }
  | {
      ok: false;
      error: ProviderLinearRuntimeProofError;
    };

const ALL_RUNTIME_PROOF_KINDS: ProviderLinearRuntimeProofKind[] = ['screenshot', 'external-link', 'video'];
const ALL_RUNTIME_PROOF_REACHABILITY_MODES: ProviderLinearRuntimeProofReachabilityMode[] = ['deterministic', 'dns-public'];
const BLOCKED_PROOF_HOSTS = createBlockedProofHostBlockList();
const BLOCKED_PROOF_TLDS = ['local', 'test', 'invalid', 'localhost', 'lan', 'example', 'home.arpa'] as const;
const DEFAULT_REACHABILITY_CAVEAT =
  'Reviewer reachability is not guaranteed across other networks, resolvers, or future DNS changes.';

const DEFAULT_DEPENDENCIES: ProviderLinearRuntimeProofDependencies = {
  dnsLookup: async (hostname: string) =>
    (await dnsLookup(hostname, { all: true, verbatim: true })).map((result) => ({
      address: result.address,
      family: result.family
    }))
};

export async function resolveProviderLinearRuntimeProof(
  input: ResolveProviderLinearRuntimeProofInput,
  overrides: Partial<ProviderLinearRuntimeProofDependencies> = {}
): Promise<ProviderLinearRuntimeProofResolution> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const normalizedOrigin = normalizeOrigin(input.origin);
  if (!normalizedOrigin) {
    return failure('runtime_proof_origin_invalid', 'Runtime proof origin must be a valid URL.', 422);
  }

  const permitResult = await loadPermitFile(resolve(input.repoRoot));
  if (permitResult.status === 'error') {
    return failure(
      'runtime_proof_permit_unreadable',
      permitResult.error ?? 'Unable to read compliance/permit.json.',
      503,
      {
        permit_path: permitResult.path,
        origin: normalizedOrigin
      }
    );
  }

  const permitEntry = permitResult.status === 'found' ? findPermitEntry(permitResult.permit, normalizedOrigin) : null;
  const policy = buildRuntimeProofPolicy(normalizedOrigin, permitResult.path, permitResult.status, permitEntry);
  const normalizedReachabilityMode = normalizeRuntimeProofReachabilityMode(input.reachabilityMode ?? null);

  if (!normalizedReachabilityMode) {
    return failure(
      'runtime_proof_reachability_mode_invalid',
      'Runtime proof reachability mode must be one of: deterministic, dns-public.',
      422,
      {
        requested_reachability_mode: input.reachabilityMode,
        allowed_reachability_modes: ALL_RUNTIME_PROOF_REACHABILITY_MODES,
        policy
      },
      policy
    );
  }

  const proofUrlInput = normalizeOptionalText(input.proofUrl ?? null);
  const normalizedKind = normalizeRuntimeProofKind(input.kind ?? null);
  const normalizedProofUrl = normalizeHttpUrl(input.proofUrl ?? null);
  const normalizedTitle = normalizeOptionalText(input.title ?? null);
  const normalizedSummary = normalizeOptionalText(input.summary ?? null);
  const proofFieldsProvided = Boolean(proofUrlInput || normalizedTitle || normalizedSummary);

  if (!normalizedKind) {
    if (!input.kind && !proofFieldsProvided) {
      return {
        ok: true,
        policy,
        proof: null,
        handoff: null,
        reachability: buildReachabilityWithoutProof(normalizedReachabilityMode)
      };
    }
    if (input.kind) {
      return failure(
        'runtime_proof_kind_invalid',
        'Runtime proof kind must be one of: screenshot, external-link, video.',
        422,
        {
          requested_kind: input.kind,
          allowed_kinds: ALL_RUNTIME_PROOF_KINDS,
          policy
        },
        policy
      );
    }
    return failure(
      'runtime_proof_kind_missing',
      'Runtime proof kind is required when proof handoff fields are provided.',
      422,
      {
        allowed_kinds: ALL_RUNTIME_PROOF_KINDS,
        policy
      },
      policy
    );
  }

  if (policy.permit_status === 'missing') {
    return failure(
      'runtime_proof_permit_missing',
      `No compliance permit is configured for ${normalizedOrigin}; runtime proof handoff is blocked.`,
      422,
      {
        origin: normalizedOrigin,
        permit_path: policy.permit_path,
        policy
      },
      policy
    );
  }

  if (policy.permit_status === 'origin_missing') {
    return failure(
      'runtime_proof_origin_unapproved',
      `Origin ${normalizedOrigin} is not listed in compliance/permit.json; runtime proof handoff is blocked.`,
      422,
      {
        origin: normalizedOrigin,
        permit_path: policy.permit_path,
        policy
      },
      policy
    );
  }

  if (!isKindAllowed(policy, normalizedKind)) {
    return failure(
      'runtime_proof_kind_not_permitted',
      `Runtime proof kind "${normalizedKind}" is not permitted for ${normalizedOrigin}. ${policy.summary}`,
      422,
      {
        requested_kind: normalizedKind,
        allowed_kinds: policy.allowed_kinds,
        blocked_kinds: policy.blocked_kinds,
        origin: normalizedOrigin,
        policy
      },
      policy
    );
  }

  if (!normalizedProofUrl) {
    return failure(
      'runtime_proof_url_missing',
      'A reviewer-usable --proof-url is required to generate runtime proof handoff content. Local-only file paths are not supported.',
      422,
      {
        requested_kind: normalizedKind,
        policy
      },
      policy
    );
  }

  const reachabilityResolution = await resolveRuntimeProofReachability(
    normalizedProofUrl,
    normalizedReachabilityMode,
    dependencies
  );
  if (!reachabilityResolution.ok) {
    return {
      ok: false,
      policy,
      error: {
        ...reachabilityResolution.error,
        details: {
          ...(reachabilityResolution.error.details ?? {}),
          policy
        }
      }
    };
  }

  const proofTitle = normalizedTitle ?? buildDefaultProofTitle(normalizedKind);
  const proof = {
    kind: normalizedKind,
    reviewer_url: normalizedProofUrl,
    title: proofTitle,
    summary: normalizedSummary
  };

  return {
    ok: true,
    policy,
    proof,
    handoff: {
      workpad_markdown: buildWorkpadMarkdown(policy, proof, reachabilityResolution.reachability),
      pr_markdown: buildPrMarkdown(policy, proof, reachabilityResolution.reachability)
    },
    reachability: reachabilityResolution.reachability
  };
}

function buildRuntimeProofPolicy(
  origin: string,
  permitPath: string,
  permitStatus: 'found' | 'missing' | 'error',
  permitEntry: CompliancePermitSource | null
): ProviderLinearRuntimeProofPolicy {
  const resolvedPermitStatus =
    permitStatus === 'found' ? (permitEntry ? 'found' : 'origin_missing') : 'missing';
  const capabilities = resolveRuntimeProofCapabilities(permitEntry);
  const allowedKinds = ALL_RUNTIME_PROOF_KINDS.filter((kind) => capabilityForKind(capabilities, kind));
  const blockedKinds = ALL_RUNTIME_PROOF_KINDS.filter((kind) => !allowedKinds.includes(kind));

  return {
    origin,
    permit_path: permitPath,
    permit_status: resolvedPermitStatus,
    approval_id: normalizeOptionalText(permitEntry?.approval_id),
    approver: normalizeOptionalText(permitEntry?.approver),
    capabilities,
    allowed_kinds: allowedKinds,
    blocked_kinds: blockedKinds,
    summary: buildPolicySummary(origin, resolvedPermitStatus, allowedKinds, blockedKinds)
  };
}

function buildPolicySummary(
  origin: string,
  permitStatus: ProviderLinearRuntimeProofPolicy['permit_status'],
  allowedKinds: ProviderLinearRuntimeProofKind[],
  blockedKinds: ProviderLinearRuntimeProofKind[]
): string {
  if (permitStatus === 'missing') {
    return `No compliance permit file is configured for ${origin}; runtime proof handoff is blocked.`;
  }
  if (permitStatus === 'origin_missing') {
    return `The compliance permit does not list ${origin}; runtime proof handoff is blocked.`;
  }
  if (allowedKinds.length === 0) {
    return `The permit for ${origin} does not allow screenshot, external-link, or video runtime proof handoff.`;
  }
  if (blockedKinds.length === 0) {
    return `Screenshot, external-link, and video runtime proof handoff are all permitted for ${origin}.`;
  }
  return `${formatKinds(allowedKinds)} proof ${allowedKinds.length === 1 ? 'is' : 'are'} permitted for ${origin}; ${formatKinds(blockedKinds)} ${blockedKinds.length === 1 ? 'is' : 'are'} blocked.`;
}

function buildWorkpadMarkdown(
  policy: ProviderLinearRuntimeProofPolicy,
  proof: ProviderLinearRuntimeProofResolutionSuccess['proof'],
  reachability: ProviderLinearRuntimeProofReachability
): string {
  const activeProof = proof!;
  const inlineTitle = normalizeMarkdownInline(activeProof.title);
  const inlineSummary = activeProof.summary ? normalizeMarkdownInline(activeProof.summary) : null;
  return [
    `- Runtime proof policy: ${policy.summary}`,
    `- Runtime proof (${activeProof.kind}): [${escapeMarkdownLabel(inlineTitle)}](<${activeProof.reviewer_url}>)`,
    inlineSummary ? `- Runtime proof summary: ${inlineSummary}` : null,
    `- Runtime proof reachability: ${reachability.summary}`,
    `- Runtime proof caveat: ${reachability.caveat}`
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function buildPrMarkdown(
  policy: ProviderLinearRuntimeProofPolicy,
  proof: ProviderLinearRuntimeProofResolutionSuccess['proof'],
  reachability: ProviderLinearRuntimeProofReachability
): string {
  const activeProof = proof!;
  const inlineTitle = normalizeMarkdownInline(activeProof.title);
  const inlineSummary = activeProof.summary ? normalizeMarkdownInline(activeProof.summary) : null;
  return [
    '### Runtime Proof',
    `- Policy: ${policy.summary}`,
    `- Proof (${activeProof.kind}): [${escapeMarkdownLabel(inlineTitle)}](<${activeProof.reviewer_url}>)`,
    inlineSummary ? `- Summary: ${inlineSummary}` : null,
    `- Reachability: ${reachability.summary}`,
    `- Caveat: ${reachability.caveat}`
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

async function resolveRuntimeProofReachability(
  proofUrl: string,
  mode: ProviderLinearRuntimeProofReachabilityMode,
  dependencies: ProviderLinearRuntimeProofDependencies
): Promise<ProviderLinearRuntimeProofReachabilityResolution> {
  const parsed = new URL(proofUrl);
  const rawHostname = parsed.hostname.trim().toLowerCase().replaceAll(/^\[|\]$/g, '');
  const hostname = normalizeHostname(rawHostname);
  if (!rawHostname || !hostname) {
    return {
      ok: false,
      error: {
        code: 'runtime_proof_url_missing',
        message: 'A reviewer-usable --proof-url is required to generate runtime proof handoff content. Local-only file paths are not supported.',
        status: 422
      }
    };
  }

  if (mode === 'deterministic') {
    return {
      ok: true,
      reachability: {
        mode,
        dns_ran: false,
        hostname,
        resolved_addresses: [],
        summary: 'Deterministic URL validation accepted the reviewer proof URL without live DNS lookup.',
        caveat: 'No live DNS lookup was performed. Reviewer reachability remains out of scope for the default deterministic path.'
      }
    };
  }

  if (isIP(hostname) > 0) {
    return {
      ok: true,
      reachability: {
        mode,
        dns_ran: false,
        hostname,
        resolved_addresses: [hostname],
        summary: `dns-public mode accepted the public IP literal ${hostname} without DNS lookup.`,
        caveat: DEFAULT_REACHABILITY_CAVEAT
      }
    };
  }

  let answers: ProviderLinearRuntimeProofDnsAddress[];
  try {
    answers = await dependencies.dnsLookup(rawHostname);
  } catch (error) {
    const dnsError = error as NodeJS.ErrnoException;
    return {
      ok: false,
      error: {
        code: 'runtime_proof_dns_lookup_failed',
        message: `dns-public reachability could not resolve ${hostname} with the worker-local DNS resolver; runtime proof handoff is blocked.`,
        status: 503,
        details: {
          reachability_mode: mode,
          reviewer_hostname: hostname,
          dns_error_code: dnsError.code ?? null,
          dns_error_message: dnsError.message ?? String(error),
          proof_url: proofUrl
        }
      }
    };
  }

  const resolvedAddresses = uniqueAddresses(answers.map((answer) => answer.address));
  if (resolvedAddresses.length === 0) {
    return {
      ok: false,
      error: {
        code: 'runtime_proof_dns_no_answers',
        message: `dns-public reachability returned no answers for ${hostname}; runtime proof handoff is blocked.`,
        status: 503,
        details: {
          reachability_mode: mode,
          reviewer_hostname: hostname,
          proof_url: proofUrl
        }
      }
    };
  }

  const blockedAddresses = resolvedAddresses.filter((address) => isBlockedProofHostname(address));
  if (blockedAddresses.length > 0) {
    return {
      ok: false,
      error: {
        code: 'runtime_proof_dns_non_public_resolution',
        message: `dns-public reachability resolved ${hostname} to at least one non-public address; runtime proof handoff is blocked.`,
        status: 422,
        details: {
          reachability_mode: mode,
          reviewer_hostname: hostname,
          proof_url: proofUrl,
          resolved_addresses: resolvedAddresses,
          blocked_addresses: blockedAddresses
        }
      }
    };
  }

  return {
    ok: true,
    reachability: {
      mode,
      dns_ran: true,
      hostname,
      resolved_addresses: resolvedAddresses,
      summary: `Worker-local DNS resolved ${hostname} to public addresses only: ${resolvedAddresses.join(', ')}.`,
      caveat: 'This is worker-local DNS evidence only. Reviewer reachability is not guaranteed across other networks, resolvers, or future DNS changes.'
    }
  };
}

function buildReachabilityWithoutProof(
  mode: ProviderLinearRuntimeProofReachabilityMode
): ProviderLinearRuntimeProofReachability {
  if (mode === 'dns-public') {
    return {
      mode,
      dns_ran: false,
      hostname: null,
      resolved_addresses: [],
      summary: 'No proof URL was provided, so dns-public reachability was not exercised.',
      caveat: 'Reviewer reachability remains unevaluated until a reviewer-usable proof URL is supplied.'
    };
  }
  return {
    mode,
    dns_ran: false,
    hostname: null,
    resolved_addresses: [],
    summary: 'No proof URL was provided; the deterministic path leaves reviewer reachability out of scope.',
    caveat: 'No live DNS lookup was performed.'
  };
}

function uniqueAddresses(addresses: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const address of addresses) {
    if (seen.has(address)) {
      continue;
    }
    seen.add(address);
    result.push(address);
  }
  return result;
}

function capabilityForKind(
  capabilities: ProviderLinearRuntimeProofPolicy['capabilities'],
  kind: ProviderLinearRuntimeProofKind
): boolean {
  if (kind === 'external-link') {
    return capabilities.external_link;
  }
  return capabilities[kind];
}

function isKindAllowed(policy: ProviderLinearRuntimeProofPolicy, kind: ProviderLinearRuntimeProofKind): boolean {
  return capabilityForKind(policy.capabilities, kind);
}

function normalizeRuntimeProofKind(value: string | null): ProviderLinearRuntimeProofKind | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (normalized === 'screenshot' || normalized === 'external-link' || normalized === 'video') {
    return normalized;
  }
  return null;
}

function normalizeRuntimeProofReachabilityMode(
  value: string | null
): ProviderLinearRuntimeProofReachabilityMode | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (!normalized) {
    return 'deterministic';
  }
  if (normalized === 'deterministic' || normalized === 'dns-public') {
    return normalized;
  }
  return null;
}

function normalizeOrigin(value: string): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeHttpUrl(value: string | null): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    if (isBlockedProofHostname(parsed.hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeHostname(hostname: string): string | null {
  const normalized = hostname.trim().toLowerCase().replaceAll(/^\[|\]$/g, '').replace(/\.$/, '');
  return normalized.length > 0 ? normalized : null;
}

function isBlockedProofHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return true;
  }
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }
  if (isIP(normalized) > 0) {
    return isBlockedProofIpAddress(normalized);
  }
  if (!normalized.includes('.')) {
    return true;
  }
  if (BLOCKED_PROOF_TLDS.some((tld) => normalized === tld || normalized.endsWith(`.${tld}`))) {
    return true;
  }
  return false;
}

function isBlockedProofIpAddress(address: string): boolean {
  const normalized = normalizeHostname(address);
  if (!normalized) {
    return true;
  }
  const embeddedIpv4 = extractEmbeddedIpv4Address(normalized);
  if (embeddedIpv4) {
    return BLOCKED_PROOF_HOSTS.check(embeddedIpv4, 'ipv4');
  }
  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return BLOCKED_PROOF_HOSTS.check(normalized, 'ipv4');
  }
  if (ipVersion === 6) {
    return BLOCKED_PROOF_HOSTS.check(normalized, 'ipv6');
  }
  return true;
}

function extractEmbeddedIpv4Address(address: string): string | null {
  const hextets = expandIpv6Hextets(address);
  if (!hextets) {
    return null;
  }
  if (isIpv4MappedIpv6(hextets) || isIpv4TranslatedIpv6(hextets) || isWellKnownNat64Ipv6(hextets)) {
    return formatEmbeddedIpv4(hextets[6], hextets[7]);
  }
  return null;
}

function expandIpv6Hextets(address: string): number[] | null {
  const normalized = normalizeHostname(address);
  if (!normalized || isIP(normalized) !== 6) {
    return null;
  }

  let source = normalized;
  const zoneSeparator = source.indexOf('%');
  if (zoneSeparator >= 0) {
    source = source.slice(0, zoneSeparator);
  }

  if (source.includes('.')) {
    const lastColon = source.lastIndexOf(':');
    if (lastColon < 0) {
      return null;
    }
    const ipv4Suffix = source.slice(lastColon + 1);
    if (isIP(ipv4Suffix) !== 4) {
      return null;
    }
    const octets = ipv4Suffix.split('.').map((part) => Number.parseInt(part, 10));
    source = `${source.slice(0, lastColon)}:${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }

  const halves = source.split('::');
  if (halves.length > 2) {
    return null;
  }

  const head = halves[0] ? halves[0].split(':').filter((part) => part.length > 0) : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':').filter((part) => part.length > 0) : [];

  let parts: string[];
  if (halves.length === 1) {
    if (head.length !== 8) {
      return null;
    }
    parts = head;
  } else {
    const missing = 8 - (head.length + tail.length);
    if (missing < 1) {
      return null;
    }
    parts = [...head, ...Array.from({ length: missing }, () => '0'), ...tail];
  }

  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/i.test(part))) {
    return null;
  }

  return parts.map((part) => Number.parseInt(part, 16));
}

function isIpv4MappedIpv6(hextets: number[]): boolean {
  return (
    hextets[0] === 0 &&
    hextets[1] === 0 &&
    hextets[2] === 0 &&
    hextets[3] === 0 &&
    hextets[4] === 0 &&
    hextets[5] === 0xffff
  );
}

function isIpv4TranslatedIpv6(hextets: number[]): boolean {
  return (
    hextets[0] === 0 &&
    hextets[1] === 0 &&
    hextets[2] === 0 &&
    hextets[3] === 0 &&
    hextets[4] === 0xffff &&
    hextets[5] === 0
  );
}

function isWellKnownNat64Ipv6(hextets: number[]): boolean {
  return (
    hextets[0] === 0x64 &&
    hextets[1] === 0xff9b &&
    hextets[2] === 0 &&
    hextets[3] === 0 &&
    hextets[4] === 0 &&
    hextets[5] === 0
  );
}

function formatEmbeddedIpv4(left: number, right: number): string {
  return `${left >> 8}.${left & 0xff}.${right >> 8}.${right & 0xff}`;
}

function normalizeMarkdownInline(value: string): string {
  return value.replaceAll(/\s*[\r\n]+\s*/g, ' ').trim();
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildDefaultProofTitle(kind: ProviderLinearRuntimeProofKind): string {
  if (kind === 'external-link') {
    return 'Runtime proof link';
  }
  return `Runtime proof ${kind}`;
}

function escapeMarkdownLabel(value: string): string {
  return value.replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function formatKinds(kinds: ProviderLinearRuntimeProofKind[]): string {
  if (kinds.length === 0) {
    return 'No';
  }
  if (kinds.length === 1) {
    return kinds[0];
  }
  if (kinds.length === 2) {
    return `${kinds[0]} and ${kinds[1]}`;
  }
  return `${kinds.slice(0, -1).join(', ')}, and ${kinds.at(-1)}`;
}

function createBlockedProofHostBlockList(): BlockList {
  const blockList = new BlockList();
  blockList.addSubnet('0.0.0.0', 8, 'ipv4');
  blockList.addSubnet('10.0.0.0', 8, 'ipv4');
  blockList.addSubnet('100.64.0.0', 10, 'ipv4');
  blockList.addSubnet('127.0.0.0', 8, 'ipv4');
  blockList.addSubnet('169.254.0.0', 16, 'ipv4');
  blockList.addSubnet('172.16.0.0', 12, 'ipv4');
  blockList.addSubnet('192.0.2.0', 24, 'ipv4');
  blockList.addSubnet('192.88.99.0', 24, 'ipv4');
  blockList.addSubnet('192.168.0.0', 16, 'ipv4');
  blockList.addSubnet('198.18.0.0', 15, 'ipv4');
  blockList.addSubnet('198.51.100.0', 24, 'ipv4');
  blockList.addSubnet('203.0.113.0', 24, 'ipv4');
  blockList.addSubnet('224.0.0.0', 4, 'ipv4');
  blockList.addSubnet('240.0.0.0', 4, 'ipv4');
  blockList.addSubnet('::', 96, 'ipv6');
  blockList.addSubnet('100::', 64, 'ipv6');
  blockList.addAddress('::', 'ipv6');
  blockList.addAddress('::1', 'ipv6');
  blockList.addSubnet('2001:db8::', 32, 'ipv6');
  blockList.addSubnet('64:ff9b:1::', 48, 'ipv6');
  blockList.addSubnet('fec0::', 10, 'ipv6');
  blockList.addSubnet('fe80::', 10, 'ipv6');
  blockList.addSubnet('fc00::', 7, 'ipv6');
  blockList.addSubnet('ff00::', 8, 'ipv6');
  return blockList;
}

function failure(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  policy?: ProviderLinearRuntimeProofPolicy | null
): ProviderLinearRuntimeProofResolutionFailure {
  return {
    ok: false,
    policy: policy ?? null,
    error: {
      code,
      message,
      status,
      ...(details ? { details } : {})
    }
  };
}
