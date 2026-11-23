import { ToolObservation } from '../../tools/interfaces/tool.interface';

export type AgentRunStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'budget_exhausted';

export interface AgentBudgetConfig {
  maxIterations: number;
  maxToolCalls: number;
  maxTotalDurationMs: number;
  maxConsecutiveErrors: number;
}

export const DEFAULT_AGENT_BUDGET: AgentBudgetConfig = {
  maxIterations: 8,
  maxToolCalls: 10,
  maxTotalDurationMs: 60000, // 60s
  maxConsecutiveErrors: 3,
};

export interface AgentRunState {
  taskId: string;
  query: string;
  status: AgentRunStatus;
  currentIteration: number;
  budget: AgentBudgetConfig;
  toolCallCount: number;
  observations: ToolObservation[];
  finalAnswer?: string;
  stopReason?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  durationMs: number;
}

export interface AgentRunResult {
  taskId: string;
  status: AgentRunStatus;
  finalAnswer?: string;
  stopReason?: string;
  iterations: number;
  toolCallCount: number;
  durationMs: number;
  observations: ToolObservation[];
}
