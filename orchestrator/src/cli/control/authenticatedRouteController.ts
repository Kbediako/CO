import {
  createAuthenticatedRouteDispatcherContext,
  type AuthenticatedRouteCompositionContext
} from './authenticatedRouteComposition.js';
import { handleAuthenticatedRouteDispatcher } from './authenticatedRouteDispatcher.js';

export type AuthenticatedRouteControllerContext = AuthenticatedRouteCompositionContext;

export async function handleAuthenticatedRouteRequest(
  context: AuthenticatedRouteControllerContext
): Promise<boolean> {
  return handleAuthenticatedRouteDispatcher(createAuthenticatedRouteDispatcherContext(context));
}
