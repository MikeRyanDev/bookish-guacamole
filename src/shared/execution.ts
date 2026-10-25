/** Prices are USD per million tokens. Null means unknown, never free. */
export interface ModelPrices {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/** Workspace execution policy. Changes apply before the next model call. */
export interface ExecutionSettings {
  autoCompact: boolean;
  compactAt: number;
  tokenLimit: number | null;
  costLimit: number | null;
  maxRetries: number;
  codeMode: boolean;
  models: Record<string, { contextWindow: number; prices: ModelPrices | null }>;
}

/** Revision prevents a stale settings tab from overwriting a newer save. */
export interface ExecutionSettingsResponse {
  settings: ExecutionSettings;
  revision: string | null;
}

/** The ledger contains provider usage only; missing reports remain explicit. */
export interface ConversationUsage {
  calls: number;
  reportedCalls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  knownCost: number;
  unpricedCalls: number;
  contextTokens: number | null;
  /** Older native logs have token totals but no complete admission/cost ledger. */
  historyIncomplete?: boolean;
}

export interface ContextState {
  /** Successful durable folds; a no-op scheduled check does not increment it. */
  summaries?: number;
  status: "ready" | "compacting" | "failed" | "scheduled";
  before: number | null;
  after: number | null;
  error: string | null;
}

export interface ConversationExecutionStatus {
  usage: ConversationUsage;
  context: ContextState | null;
  recovery: { attempt: number; maxRetries: number } | null;
  status: "idle" | "running" | "requires_action";
  pending: number;
}
