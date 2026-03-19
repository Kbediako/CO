export interface AuthenticatedRouteDispatcherContext {
  pathname: string;
  method: string | undefined;
  authKind: 'control' | 'session';
  handleEventsSse(): void;
  handleUiData(): Promise<boolean>;
  handleObservabilityApi(): Promise<boolean>;
  handleControlAction(authKind: 'control' | 'session'): Promise<void>;
  handleConfirmationCreate(): Promise<boolean>;
  handleConfirmationList(): Promise<boolean>;
  handleConfirmationApprove(): Promise<boolean>;
  handleConfirmationIssueConsume(): Promise<boolean>;
  handleConfirmationValidate(): Promise<boolean>;
  handleSecurityViolation(): Promise<boolean>;
  handleDelegationRegister(): Promise<boolean>;
  handleQuestionQueue(): Promise<boolean>;
}

export async function handleAuthenticatedRouteDispatcher(
  context: AuthenticatedRouteDispatcherContext
): Promise<boolean> {
  if (context.pathname === '/events' && context.method === 'GET') {
    context.handleEventsSse();
    return true;
  }

  if (await context.handleUiData()) {
    return true;
  }

  if (await context.handleObservabilityApi()) {
    return true;
  }

  if (context.pathname === '/control/action' && context.method === 'POST') {
    await context.handleControlAction(context.authKind);
    return true;
  }

  if (await context.handleConfirmationCreate()) {
    return true;
  }

  if (await context.handleConfirmationList()) {
    return true;
  }

  if (await context.handleConfirmationApprove()) {
    return true;
  }

  if (await context.handleConfirmationIssueConsume()) {
    return true;
  }

  if (await context.handleConfirmationValidate()) {
    return true;
  }

  if (await context.handleSecurityViolation()) {
    return true;
  }

  if (await context.handleDelegationRegister()) {
    return true;
  }

  if (await context.handleQuestionQueue()) {
    return true;
  }

  return false;
}
