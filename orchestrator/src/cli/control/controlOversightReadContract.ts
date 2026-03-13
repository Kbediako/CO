import type {
  ControlDispatchPilotPayload,
  ControlSelectedRunRuntimeSnapshot
} from './observabilityReadModel.js';

export interface ControlDispatchPayload {
  dispatch_pilot?: ControlDispatchPilotPayload | null;
  recommendation?: {
    dispatch_id?: string | null;
    summary?: string | null;
    rationale?: string | null;
    confidence?: number | null;
    tracked_issue?: {
      identifier?: string | null;
      title?: string | null;
      state?: string | null;
      url?: string | null;
      team_key?: string | null;
    } | null;
  } | null;
  error?: {
    code?: string;
    details?: {
      dispatch_pilot?: ControlDispatchPilotPayload | null;
    };
  } | null;
}

export interface QuestionRecordPayload {
  question_id?: string;
  urgency?: string;
  prompt?: string;
  status?: string;
}

export interface QuestionsPayload {
  questions?: QuestionRecordPayload[];
}

export interface ControlOversightReadContract {
  readSelectedRun(): Promise<ControlSelectedRunRuntimeSnapshot>;
  readDispatch(): Promise<ControlDispatchPayload>;
  readQuestions(): Promise<QuestionsPayload>;
}
