import { BlockList, isIP } from 'node:net';
import { resolve } from 'node:path';

import {
  findPermitEntry,
  loadPermitFile,
  resolveRuntimeProofCapabilities
} from '../../../../scripts/design/pipeline/permit.js';

export type ProviderLinearRuntimeProofKind = 'screenshot' | 'external-link' | 'video';

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
}

const ALL_RUNTIME_PROOF_KINDS: ProviderLinearRuntimeProofKind[] = ['screenshot', 'external-link', 'video'];
const BLOCKED_PROOF_HOSTS = createBlockedProofHostBlockList();

export async function resolveProviderLinearRuntimeProof(
  input: ResolveProviderLinearRuntimeProofInput
): Promise<ProviderLinearRuntimeProofResolution> {
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
        handoff: null
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
      workpad_markdown: buildWorkpadMarkdown(policy, proof),
      pr_markdown: buildPrMarkdown(policy, proof)
    }
  };
}

function buildRuntimeProofPolicy(
  origin: string,
  permitPath: string,
  permitStatus: 'found' | 'missing' | 'error',
  permitEntry: Record<string, unknown> | null
): ProviderLinearRuntimeProofPolicy {
  const resolvedPermitStatus =
    permitStatus === 'found' ? (permitEntry ? 'found' : 'origin_missing') : 'missing';
  const capabilities = resolveRuntimeProofCapabilities(permitEntry as never);
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
  proof: ProviderLinearRuntimeProofResolutionSuccess['proof']
): string {
  const activeProof = proof!;
  const inlineTitle = normalizeMarkdownInline(activeProof.title);
  const inlineSummary = activeProof.summary ? normalizeMarkdownInline(activeProof.summary) : null;
  return [
    `- Runtime proof policy: ${policy.summary}`,
    `- Runtime proof (${activeProof.kind}): [${escapeMarkdownLabel(inlineTitle)}](${activeProof.reviewer_url})`,
    inlineSummary ? `- Runtime proof summary: ${inlineSummary}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function buildPrMarkdown(
  policy: ProviderLinearRuntimeProofPolicy,
  proof: ProviderLinearRuntimeProofResolutionSuccess['proof']
): string {
  const activeProof = proof!;
  const inlineTitle = normalizeMarkdownInline(activeProof.title);
  const inlineSummary = activeProof.summary ? normalizeMarkdownInline(activeProof.summary) : null;
  return [
    '### Runtime Proof',
    `- Policy: ${policy.summary}`,
    `- Proof (${activeProof.kind}): [${escapeMarkdownLabel(inlineTitle)}](${activeProof.reviewer_url})`,
    inlineSummary ? `- Summary: ${inlineSummary}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
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

function isBlockedProofHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replaceAll(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!normalized) {
    return false;
  }
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }
  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return BLOCKED_PROOF_HOSTS.check(normalized, 'ipv4');
  }
  if (ipVersion === 6) {
    return BLOCKED_PROOF_HOSTS.check(normalized, 'ipv6');
  }
  return false;
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
