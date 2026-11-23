export type EvaluationDecision =
  | 'continue'
  | 'retry_step'
  | 'replan'
  | 'complete'
  | 'fail';

export interface EvaluationMetrics {
  stepsTotal: number;
  stepsCompleted: number;
  stepsRemaining: number;
  retriesUsedForStep: number;
  totalTaskRetriesUsed: number;
  replanCount: number;
  isTransientError: boolean;
}

export interface EvaluationResult {
  decision: EvaluationDecision;
  rationale: string;
  confidence?: number;
  metrics: EvaluationMetrics;
  suggestedReplanGoal?: string;
}

export interface EvaluatorContext {
  retriesByStep: Map<string, number>;
  totalRetriesUsed: number;
  replanCount: number;
  maxRetriesPerStep?: number;
  maxTotalRetries?: number;
  maxReplans?: number;
}
