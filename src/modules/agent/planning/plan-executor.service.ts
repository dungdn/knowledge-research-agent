import { Injectable, Logger } from '@nestjs/common';
import { Plan, PlanStep } from './interfaces/plan.types';
import { StepStateMachine, PlanStateMachine } from './step-state-machine';
import { PlanValidator } from './plan-validator';
import { AgentOrchestratorService } from '../services/agent-orchestrator.service';
import { EventRecorder } from '../events/event-recorder';
import { AgentEvaluatorService } from '../evaluation/agent-evaluator.service';
import { AgentPlannerService } from './agent-planner.service';
import { EvaluatorContext } from '../evaluation/interfaces/evaluation.types';
import { RetryPolicy } from '../evaluation/policies/retry.policy';

export interface PlanExecutionResult {
  plan: Plan;
  success: boolean;
  summary: string;
  failedStepId?: string;
  totalDurationMs: number;
  replanCount: number;
  retriesUsed: number;
}

export interface PlanExecutionOptions {
  maxRetriesPerStep?: number;
  maxTotalRetries?: number;
  maxReplans?: number;
}

@Injectable()
export class PlanExecutorService {
  private readonly logger = new Logger(PlanExecutorService.name);

  constructor(
    private readonly planValidator: PlanValidator,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly eventRecorder: EventRecorder,
    private readonly evaluator: AgentEvaluatorService,
    private readonly planner: AgentPlannerService,
    private readonly retryPolicy: RetryPolicy,
  ) {}

  async executePlan(
    initialPlan: Plan,
    options?: PlanExecutionOptions,
  ): Promise<PlanExecutionResult> {
    const startTime = Date.now();
    let currentPlan = initialPlan;

    const evalContext: EvaluatorContext = {
      retriesByStep: new Map<string, number>(),
      totalRetriesUsed: 0,
      replanCount: 0,
      maxRetriesPerStep: options?.maxRetriesPerStep ?? 2,
      maxTotalRetries: options?.maxTotalRetries ?? 4,
      maxReplans: options?.maxReplans ?? 2,
    };

    this.logger.log(
      `Beginning execution of plan [${currentPlan.id}] (v${currentPlan.version}) with ${currentPlan.steps.length} steps`,
    );

    let stepIndex = 0;
    const completedStepSummaries: string[] = [];
    let failedStepId: string | undefined;
    let executionSuccess = false;

    while (stepIndex < currentPlan.steps.length) {
      const step = currentPlan.steps[stepIndex];

      // 1. Check prerequisite dependencies
      const check = this.planValidator.canExecuteStep(step, currentPlan.steps);
      if (!check.canExecute) {
        step.status = StepStateMachine.transition(step.id, step.status, 'failed');
        step.error = check.reason;
        failedStepId = step.id;
        break;
      }

      // 2. Transition step to running
      step.status = StepStateMachine.transition(step.id, step.status, 'running');
      if (!step.startedAt) {
        step.startedAt = new Date().toISOString();
      }

      this.eventRecorder.record(currentPlan.taskId, stepIndex + 1, 'step.started', {
        planId: currentPlan.id,
        planVersion: currentPlan.version,
        stepId: step.id,
        title: step.title,
      });

      // 3. Execute step using Orchestrator Loop
      const stepQuery = `Step: ${step.title}\nDescription: ${step.description}\nOverall Plan Goal: ${currentPlan.goal}`;
      const stepResult = await this.orchestrator.run({
        taskId: currentPlan.taskId,
        query: stepQuery,
        allowedTools: step.expectedTool ? [step.expectedTool] : undefined,
      });

      // 4. Evaluate outcome
      const evaluation = this.evaluator.evaluateStepOutcome(
        currentPlan,
        step,
        stepResult,
        evalContext,
      );

      this.eventRecorder.record(currentPlan.taskId, stepIndex + 1, 'evaluation.completed', {
        stepId: step.id,
        decision: evaluation.decision,
        rationale: evaluation.rationale,
        metrics: evaluation.metrics as unknown as Record<string, unknown>,
      });

      // 5. Act on evaluation decision
      if (evaluation.decision === 'continue' || evaluation.decision === 'complete') {
        step.status = StepStateMachine.transition(step.id, step.status, 'completed');
        step.output = stepResult.finalAnswer;
        step.completedAt = new Date().toISOString();

        completedStepSummaries.push(`- **${step.title}**: ${step.output}`);

        this.eventRecorder.record(currentPlan.taskId, stepIndex + 1, 'step.completed', {
          planId: currentPlan.id,
          stepId: step.id,
          output: step.output,
        });

        if (evaluation.decision === 'complete') {
          executionSuccess = true;
          break;
        }

        stepIndex += 1;
      } else if (evaluation.decision === 'retry_step') {
        const retries = (evalContext.retriesByStep.get(step.id) || 0) + 1;
        evalContext.retriesByStep.set(step.id, retries);
        evalContext.totalRetriesUsed += 1;

        step.status = StepStateMachine.transition(step.id, step.status, 'retrying');

        // Apply short backoff before next attempt
        const backoffMs = Math.min(this.retryPolicy.calculateBackoff(retries), 100);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        // Stay on current stepIndex to re-run
        this.logger.log(`Retrying step '${step.id}' (attempt ${retries})`);
      } else if (evaluation.decision === 'replan') {
        evalContext.replanCount += 1;

        this.eventRecorder.record(currentPlan.taskId, stepIndex + 1, 'plan.revised', {
          supersededPlanId: currentPlan.id,
          replanCount: evalContext.replanCount,
          reason: evaluation.rationale,
        });

        currentPlan.status = PlanStateMachine.transition(
          currentPlan.id,
          currentPlan.status,
          'superseded',
        );

        // Generate revised plan
        const revisedPlan = await this.planner.createPlan({
          taskId: currentPlan.taskId,
          goal: currentPlan.goal,
          context: evaluation.suggestedReplanGoal,
        });

        revisedPlan.version = currentPlan.version + 1;
        currentPlan = revisedPlan;

        this.logger.log(
          `Switched to revised plan [${currentPlan.id}] (v${currentPlan.version}) with ${currentPlan.steps.length} steps`,
        );

        // Reset step index to execute new plan from beginning
        stepIndex = 0;
      } else if (evaluation.decision === 'fail') {
        step.status = StepStateMachine.transition(step.id, step.status, 'failed');
        step.error = stepResult.stopReason || 'Step execution failed';
        step.completedAt = new Date().toISOString();

        failedStepId = step.id;

        this.eventRecorder.record(currentPlan.taskId, stepIndex + 1, 'step.failed', {
          planId: currentPlan.id,
          stepId: step.id,
          error: step.error,
        });

        // Skip remaining steps
        for (let j = stepIndex + 1; j < currentPlan.steps.length; j++) {
          const remaining = currentPlan.steps[j];
          if (remaining.status === 'pending') {
            remaining.status = StepStateMachine.transition(
              remaining.id,
              remaining.status,
              'skipped',
            );
          }
        }

        currentPlan.status = PlanStateMachine.transition(
          currentPlan.id,
          currentPlan.status,
          'failed',
        );
        break;
      }
    }

    const totalDurationMs = Date.now() - startTime;
    currentPlan.updatedAt = new Date().toISOString();

    if (!executionSuccess && currentPlan.status !== 'completed') {
      currentPlan.status = 'failed';
      const summary = `Plan execution failed at step '${failedStepId || 'unknown'}'. Retries used: ${
        evalContext.totalRetriesUsed
      }, Replans: ${evalContext.replanCount}. Completed steps:\n${
        completedStepSummaries.join('\n') || 'None'
      }`;

      return {
        plan: currentPlan,
        success: false,
        summary,
        failedStepId,
        totalDurationMs,
        replanCount: evalContext.replanCount,
        retriesUsed: evalContext.totalRetriesUsed,
      };
    }

    currentPlan.status = 'completed';
    this.eventRecorder.record(
      currentPlan.taskId,
      currentPlan.steps.length,
      'plan.completed',
      {
        planId: currentPlan.id,
        stepCount: currentPlan.steps.length,
        durationMs: totalDurationMs,
      },
    );

    const summary = `Successfully completed all ${currentPlan.steps.length} steps for goal: "${
      currentPlan.goal
    }". (Retries used: ${evalContext.totalRetriesUsed}, Replans: ${evalContext.replanCount})\n\n${completedStepSummaries.join(
      '\n',
    )}`;

    return {
      plan: currentPlan,
      success: true,
      summary,
      totalDurationMs,
      replanCount: evalContext.replanCount,
      retriesUsed: evalContext.totalRetriesUsed,
    };
  }
}
