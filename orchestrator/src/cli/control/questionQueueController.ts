import http from 'node:http';

import type { CliManifest } from '../types.js';
import { runQuestionReadSequence } from './questionReadSequence.js';
import type { QuestionQueue, QuestionRecord, QuestionUrgency } from './questions.js';

interface DelegationAuth {
  token: string;
  childRunId: string;
}

type QuestionRouteSource = 'questions.enqueue' | 'questions.answer' | 'questions.dismiss';

export interface QuestionQueueControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url' | 'headers'>;
  res: http.ServerResponse;
  questionQueue: Pick<QuestionQueue, 'list' | 'enqueue' | 'answer' | 'dismiss' | 'get'>;
  readRequestBody(): Promise<Record<string, unknown>>;
  expireQuestions(): Promise<void>;
  queueQuestionResolutions(records: QuestionRecord[]): void;
  readDelegationHeaders(): DelegationAuth | null;
  validateDelegation(auth: DelegationAuth): boolean;
  resolveManifestPath(rawPath: string): string;
  readManifest(path: string): Promise<Pick<CliManifest, 'run_id'> | null>;
  getParentRunId(): string;
  persistQuestions(): Promise<void>;
  resolveChildQuestion(record: QuestionRecord, outcome: QuestionRecord['status'] | 'expired'): Promise<void>;
  emitQuestionQueued(record: QuestionRecord): Promise<void>;
  emitQuestionAnswered(record: QuestionRecord): Promise<void>;
  emitQuestionDismissed(record: QuestionRecord): Promise<void>;
  publishRuntime(source: QuestionRouteSource): void;
}

export async function handleQuestionQueueRequest(
  context: QuestionQueueControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;

  if (pathname === '/questions' && method === 'GET') {
    const result = await runQuestionReadSequence({
      listQuestions: () => context.questionQueue.list(),
      expireQuestions: () => context.expireQuestions()
    });
    context.queueQuestionResolutions(result.retryCandidates);
    writeQuestionResponse(context.res, 200, { questions: result.questions });
    return true;
  }

  if (pathname === '/questions/enqueue' && method === 'POST') {
    const delegationAuth = context.readDelegationHeaders();
    if (!delegationAuth || !context.validateDelegation(delegationAuth)) {
      writeQuestionResponse(context.res, 403, { error: 'delegation_token_invalid' });
      return true;
    }

    const body = await context.readRequestBody();
    const prompt = readStringValue(body, 'prompt');
    if (!prompt) {
      writeQuestionResponse(context.res, 400, { error: 'missing_prompt' });
      return true;
    }

    const autoPause = readBooleanValue(body, 'auto_pause', 'autoPause') ?? true;
    const expiryFallback = parseExpiryFallback(readStringValue(body, 'expiry_fallback', 'expiryFallback'));
    const rawFromManifest = readStringValue(body, 'from_manifest_path', 'fromManifestPath');
    let resolvedFromManifest: string | null = null;
    if (rawFromManifest) {
      try {
        resolvedFromManifest = context.resolveManifestPath(rawFromManifest);
      } catch {
        writeQuestionResponse(context.res, 400, { error: 'invalid_manifest_path' });
        return true;
      }
      const manifest = await context.readManifest(resolvedFromManifest);
      if (!manifest || manifest.run_id !== delegationAuth.childRunId) {
        writeQuestionResponse(context.res, 403, { error: 'delegation_run_mismatch' });
        return true;
      }
    }

    const record = context.questionQueue.enqueue({
      parentRunId: context.getParentRunId(),
      fromRunId: delegationAuth.childRunId,
      fromManifestPath: resolvedFromManifest ?? null,
      prompt,
      urgency: parseUrgency(readStringValue(body, 'urgency')),
      expiresInMs: readNumberValue(body, 'expires_in_ms', 'expiresInMs'),
      autoPause,
      expiryFallback
    });
    await context.persistQuestions();
    await context.emitQuestionQueued(record);
    context.publishRuntime('questions.enqueue');
    writeQuestionResponse(context.res, 200, record);
    return true;
  }

  if (pathname === '/questions/answer' && method === 'POST') {
    const body = await context.readRequestBody();
    const questionId = readStringValue(body, 'question_id', 'questionId');
    const answer = readStringValue(body, 'answer');
    if (!questionId || !answer) {
      writeQuestionResponse(context.res, 400, { error: 'missing_question_or_answer' });
      return true;
    }
    try {
      context.questionQueue.answer(
        questionId,
        answer,
        readStringValue(body, 'answered_by', 'answeredBy') ?? 'user'
      );
    } catch (error) {
      const message = (error as Error)?.message ?? 'question_invalid';
      writeQuestionResponse(context.res, message === 'question_not_found' ? 404 : 409, { error: message });
      return true;
    }
    await context.persistQuestions();
    const record = context.questionQueue.get(questionId);
    if (record) {
      await context.emitQuestionAnswered(record);
      await context.resolveChildQuestion(record, record.status);
    }
    context.publishRuntime('questions.answer');
    writeQuestionResponse(context.res, 200, { status: 'answered' });
    return true;
  }

  if (pathname === '/questions/dismiss' && method === 'POST') {
    const body = await context.readRequestBody();
    const questionId = readStringValue(body, 'question_id', 'questionId');
    if (!questionId) {
      writeQuestionResponse(context.res, 400, { error: 'missing_question_id' });
      return true;
    }
    try {
      context.questionQueue.dismiss(
        questionId,
        readStringValue(body, 'dismissed_by', 'dismissedBy') ?? 'user'
      );
    } catch (error) {
      const message = (error as Error)?.message ?? 'question_invalid';
      writeQuestionResponse(context.res, message === 'question_not_found' ? 404 : 409, { error: message });
      return true;
    }
    await context.persistQuestions();
    const record = context.questionQueue.get(questionId);
    if (record) {
      await context.emitQuestionDismissed(record);
      await context.resolveChildQuestion(record, record.status);
    }
    context.publishRuntime('questions.dismiss');
    writeQuestionResponse(context.res, 200, { status: 'dismissed' });
    return true;
  }

  if (pathname.startsWith('/questions/') && method === 'GET') {
    await context.expireQuestions();
    const delegationAuth = context.readDelegationHeaders();
    if (delegationAuth && !context.validateDelegation(delegationAuth)) {
      writeQuestionResponse(context.res, 403, { error: 'delegation_token_invalid' });
      return true;
    }
    const questionId = pathname.split('/').pop();
    const record = questionId ? context.questionQueue.get(questionId) : null;
    if (!record) {
      writeQuestionResponse(context.res, 404, { error: 'not_found' });
      return true;
    }
    if (delegationAuth && record.from_run_id !== delegationAuth.childRunId) {
      writeQuestionResponse(context.res, 403, { error: 'delegation_scope_mismatch' });
      return true;
    }
    writeQuestionResponse(context.res, 200, record);
    return true;
  }

  return false;
}

function writeQuestionResponse(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumberValue(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readBooleanValue(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function parseUrgency(value: string | undefined): QuestionUrgency {
  if (value === 'low' || value === 'med' || value === 'high') {
    return value;
  }
  return 'med';
}

function parseExpiryFallback(value: string | undefined): 'pause' | 'resume' | 'fail' | undefined {
  if (value === 'pause' || value === 'resume' || value === 'fail') {
    return value;
  }
  return undefined;
}
