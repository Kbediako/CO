import http from 'node:http';

import {
  buildCompatibilityErrorResponse,
  buildCompatibilityIssueNotFoundResponse,
  buildCompatibilityMethodNotAllowedResponse,
  buildCompatibilityNotFoundResponse,
  buildCompatibilityRefreshRejectedResponse,
  buildCompatibilityTraceability,
  readCompatibilityIssue,
  readCompatibilityRefresh,
  readCompatibilityState,
  readDispatchExtension,
  type DispatchExtensionResult,
  type ObservabilityPresenterContext,
  type ObservabilitySurfaceResponse
} from './observabilitySurface.js';

const COMPATIBILITY_API_PREFIX = '/api/v1';
const COMPATIBILITY_STATE_PATH = `${COMPATIBILITY_API_PREFIX}/state`;
const COMPATIBILITY_REFRESH_PATH = `${COMPATIBILITY_API_PREFIX}/refresh`;
const COMPATIBILITY_DISPATCH_EXTENSION_PATH = `${COMPATIBILITY_API_PREFIX}/dispatch`;
const SYMPHONY_COMPATIBILITY_CORE_SEGMENTS = new Set(['state', 'refresh']);
const CO_COMPATIBILITY_EXTENSION_SEGMENTS = new Set(['dispatch']);
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const JSON_NO_STORE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

type ObservabilityApiRoute =
  | { kind: 'none' }
  | { kind: 'state' }
  | { kind: 'dispatch' }
  | { kind: 'refresh' }
  | { kind: 'issue'; issueIdentifier: string }
  | { kind: 'not_found' };

export interface ObservabilityApiDispatchAuditRecord {
  surface: 'api_v1_dispatch';
  evaluation: DispatchExtensionResult['evaluation'];
  issueIdentifier: string | null;
}

export interface ObservabilityApiControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  presenterContext: ObservabilityPresenterContext;
  readRequestBody(): Promise<unknown>;
  requestRefresh(): Promise<void>;
  readDispatchEvaluation(): Promise<{
    issueIdentifier: string | null;
    evaluation: DispatchExtensionResult['evaluation'];
  }>;
  onDispatchEvaluated?(record: ObservabilityApiDispatchAuditRecord): Promise<void> | void;
}

export async function handleObservabilityApiRequest(
  context: ObservabilityApiControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  const route = resolveObservabilityApiRoute(pathname);

  switch (route.kind) {
    case 'none':
      return false;
    case 'state':
      if (method !== 'GET') {
        writeObservabilityResponse(
          context.res,
          buildCompatibilityMethodNotAllowedResponse(context.presenterContext, 'GET')
        );
        return true;
      }
      writeObservabilityResponse(context.res, {
        status: 200,
        headers: JSON_NO_STORE_HEADERS,
        body: await readCompatibilityState(context.presenterContext)
      });
      return true;
    case 'dispatch': {
      if (method !== 'GET') {
        writeDispatchExtensionMethodNotAllowed(context.res, context.presenterContext);
        return true;
      }

      const result = await readDispatchExtension({
        readDispatchEvaluation: context.readDispatchEvaluation
      });
      if (context.onDispatchEvaluated) {
        await context.onDispatchEvaluated({
          surface: 'api_v1_dispatch',
          evaluation: result.evaluation,
          issueIdentifier: result.issueIdentifier
        });
      }

      const traceability = buildCompatibilityTraceability(context.presenterContext, {
        decision: result.kind === 'fail_closed' ? 'rejected' : 'acknowledged',
        reason:
          result.kind === 'fail_closed'
            ? result.evaluation.failure?.reason ?? result.evaluation.summary.reason
            : result.evaluation.summary.reason,
        issueIdentifier: result.issueIdentifier
      });

      if (result.kind === 'fail_closed') {
        writeObservabilityResponse(
          context.res,
          buildCompatibilityErrorResponse({
            status: result.failure.status,
            code: result.failure.code,
            message: 'Dispatch pilot evaluation failed closed.',
            details: result.details,
            traceability
          })
        );
        return true;
      }

      writeObservabilityResponse(context.res, {
        status: 200,
        headers: JSON_NO_STORE_HEADERS,
        body: {
          ...result.payload,
          traceability
        }
      });
      return true;
    }
    case 'refresh': {
      if (method !== 'POST') {
        writeObservabilityResponse(
          context.res,
          buildCompatibilityMethodNotAllowedResponse(context.presenterContext, 'POST')
        );
        return true;
      }
      const result = await readCompatibilityRefresh(
        {
          controlStore: context.presenterContext.controlStore,
          paths: context.presenterContext.paths,
          requestRefresh: context.requestRefresh
        },
        await context.readRequestBody()
      );
      if (result.kind === 'rejected') {
        writeObservabilityResponse(
          context.res,
          buildCompatibilityRefreshRejectedResponse(context.presenterContext, result)
        );
        return true;
      }
      writeObservabilityResponse(context.res, {
        status: 202,
        headers: JSON_HEADERS,
        body: result.payload
      });
      return true;
    }
    case 'issue': {
      if (method !== 'GET') {
        writeObservabilityResponse(
          context.res,
          buildCompatibilityMethodNotAllowedResponse(
            context.presenterContext,
            'GET',
            route.issueIdentifier
          )
        );
        return true;
      }
      const result = await readCompatibilityIssue(context.presenterContext, route.issueIdentifier);
      if (result.kind === 'issue_not_found') {
        writeObservabilityResponse(
          context.res,
          buildCompatibilityIssueNotFoundResponse(context.presenterContext, route.issueIdentifier)
        );
        return true;
      }
      writeObservabilityResponse(context.res, {
        status: 200,
        headers: JSON_NO_STORE_HEADERS,
        body: result.payload
      });
      return true;
    }
    case 'not_found':
      writeObservabilityResponse(context.res, buildCompatibilityNotFoundResponse(context.presenterContext));
      return true;
  }
}

export function resolveObservabilityApiRoute(pathname: string): ObservabilityApiRoute {
  if (pathname === COMPATIBILITY_STATE_PATH) {
    return { kind: 'state' };
  }
  if (pathname === COMPATIBILITY_DISPATCH_EXTENSION_PATH) {
    return { kind: 'dispatch' };
  }
  if (pathname === COMPATIBILITY_REFRESH_PATH) {
    return { kind: 'refresh' };
  }

  const issueIdentifier = resolveCompatibilityIssueIdentifierFromPath(pathname);
  if (issueIdentifier !== null) {
    return { kind: 'issue', issueIdentifier };
  }

  if (pathname === COMPATIBILITY_API_PREFIX || pathname.startsWith(`${COMPATIBILITY_API_PREFIX}/`)) {
    return { kind: 'not_found' };
  }

  return { kind: 'none' };
}

function resolveCompatibilityIssueIdentifierFromPath(pathname: string): string | null {
  if (!pathname.startsWith(`${COMPATIBILITY_API_PREFIX}/`)) {
    return null;
  }
  const suffix = pathname.slice(`${COMPATIBILITY_API_PREFIX}/`.length);
  if (!suffix || suffix.includes('/')) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(suffix);
    const normalized = decoded.toLowerCase();
    if (
      !decoded ||
      decoded.includes('/') ||
      SYMPHONY_COMPATIBILITY_CORE_SEGMENTS.has(normalized) ||
      CO_COMPATIBILITY_EXTENSION_SEGMENTS.has(normalized)
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function writeObservabilityResponse(
  res: http.ServerResponse,
  response: ObservabilitySurfaceResponse
): void {
  res.writeHead(response.status, response.headers);
  res.end(JSON.stringify(response.body));
}

function writeDispatchExtensionMethodNotAllowed(
  res: http.ServerResponse,
  context: Parameters<typeof buildCompatibilityTraceability>[0]
): void {
  writeObservabilityResponse(
    res,
    buildCompatibilityErrorResponse({
      status: 405,
      code: 'method_not_allowed',
      message: 'Method not allowed',
      details: {
        surface: 'api_v1',
        allowed_method: 'GET'
      },
      traceability: buildCompatibilityTraceability(context, {
        decision: 'rejected',
        reason: 'method_not_allowed'
      })
    })
  );
}
