import { Injectable, Logger } from '@nestjs/common';
import { Plan, PlanStep } from '../planning/interfaces/plan.types';
import { AgentRunResult } from '../interfaces/agent-state.types';
import {
  EvaluationResult,
  EvaluatorContext,
  EvaluationMetrics,
} from './interfaces/evaluation.types';
import { RetryPolicy } from './policies/retry.policy';

@Injectable()
export class AgentEvaluatorService {
  private readonly logger = new Logger(AgentEvaluatorService.name);

  constructor(private readonly retryPolicy: RetryPolicy) {}

  evaluateStepOutcome(
    plan: Plan,
    currentStep: PlanStep,
    stepResult: AgentRunResult,
    context: EvaluatorContext,
  ): EvaluationResult {
    const stepRetries = context.retriesByStep.get(currentStep.id) || 0;
    const isTransient = this.retryPolicy.isTransientError(stepResult.stopReason);

    // Calculate metrics
    const stepsCompleted = plan.steps.filter(
      (s) => s.status === 'completed' || s.id === currentStep.id,
    ).length;
    const stepsTotal = plan.steps.length;
    const stepsRemaining = stepsTotal - stepsCompleted;

    const metrics: EvaluationMetrics = {
      stepsTotal,
      stepsCompleted,
      stepsRemaining,
      retriesUsedForStep: stepRetries,
      totalTaskRetriesUsed: context.totalRetriesUsed,
      replanCount: context.replanCount,
      isTransientError: isTransient,
    };

    // 1. Success Branch
    if (stepResult.status === 'completed') {
      const remainingUnfinished = plan.steps.filter(
        (s) => s.id !== currentStep.id && s.status !== 'completed',
      );

      if (remainingUnfinished.length === 0) {
        this.logger.log(`Evaluation: All ${stepsTotal} steps in plan completed successfully -> decision: complete`);
        return {
          decision: 'complete',
          rationale: `All ${stepsTotal} plan steps completed successfully. Final synthesis can be formulated.`,
          metrics,
        };
      }

      this.logger.log(
        `Evaluation: Step '${currentStep.id}' succeeded (${stepsRemaining} remaining) -> decision: continue`,
      );
      return {
        decision: 'continue',
        rationale: `Step '${currentStep.id}' completed successfully; proceeding to next pending step.`,
        metrics,
      };
    }

    // 2. Failure Branch: assess retry
    const retryCheck = this.retryPolicy.canRetryStep(
      currentStep.id,
      stepResult.stopReason,
      stepRetries,
      context.totalRetriesUsed,
      {
        maxRetriesPerStep: context.maxRetriesPerStep ?? 2,
        maxTotalRetriesPerTask: context.maxTotalRetries ?? 4,
        backoffBaseMs: 300,
      },
    );

    if (retryCheck.canRetry) {
      this.logger.warn(
        `Evaluation: Step '${currentStep.id}' transient failure -> decision: retry_step (attempt ${stepRetries + 1})`,
      );
      return {
        decision: 'retry_step',
        rationale: `Transient failure encountered on step '${currentStep.id}' (${stepResult.stopReason}). Retrying attempt ${stepRetries + 1}.`,
        metrics,
      };
    }

    // 3. Retry not possible: assess replan
    const maxReplans = context.maxReplans ?? 2;
    if (context.replanCount < maxReplans) {
      const suggestedReplanGoal = `Original goal: "${plan.goal}". Step '${currentStep.id}' (${currentStep.title}) failed with: ${stepResult.stopReason}. Formulate an alternative approach.`;
      this.logger.warn(
        `Evaluation: Step '${currentStep.id}' unrecoverable (${retryCheck.reason}), replan available (${context.replanCount}/${maxReplans}) -> decision: replan`,
      );
      return {
        decision: 'replan',
        rationale: `Step '${currentStep.id}' failed permanently (${retryCheck.reason}). Replan budget remaining (${context.replanCount + 1}/${maxReplans}). Revising plan.`,
        suggestedReplanGoal,
        metrics,
      };
    }

    // 4. Everything exhausted: fail
    this.logger.error(
      `Evaluation: Step '${currentStep.id}' failed and all recovery budgets (retries & replan) exhausted -> decision: fail`,
    );
    return {
      decision: 'fail',
      rationale: `Execution failed at step '${currentStep.id}' and recovery budgets are exhausted (${stepRetries} retries, ${context.replanCount} replans). Stop reason: ${stepResult.stopReason}`,
      metrics,
    };
  }
}
