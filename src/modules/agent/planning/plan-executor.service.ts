import { Injectable, Logger } from '@nestjs/common';
import { Plan, PlanStep } from './interfaces/plan.types';
import { StepStateMachine, PlanStateMachine } from './step-state-machine';
import { PlanValidator } from './plan-validator';
import { AgentOrchestratorService } from '../services/agent-orchestrator.service';
import { EventRecorder } from '../events/event-recorder';

export interface PlanExecutionResult {
  plan: Plan;
  success: boolean;
  summary: string;
  failedStepId?: string;
  totalDurationMs: number;
}

@Injectable()
export class PlanExecutorService {
  private readonly logger = new Logger(PlanExecutorService.name);

  constructor(
    private readonly planValidator: PlanValidator,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly eventRecorder: EventRecorder,
  ) {}

  async executePlan(plan: Plan): Promise<PlanExecutionResult> {
    const startTime = Date.now();
    this.logger.log(`Beginning execution of plan [${plan.id}] with ${plan.steps.length} steps`);

    let executionFailed = false;
    let failedStepId: string | undefined;
    const completedStepSummaries: string[] = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // 1. Check prerequisites
      const check = this.planValidator.canExecuteStep(step, plan.steps);
      if (!check.canExecute) {
        step.status = StepStateMachine.transition(step.id, step.status, 'failed');
        step.error = check.reason;
        executionFailed = true;
        failedStepId = step.id;
        break;
      }

      // 2. Mark step running
      step.status = StepStateMachine.transition(step.id, step.status, 'running');
      step.startedAt = new Date().toISOString();

      this.eventRecorder.record(plan.taskId, i + 1, 'step.started' as any, {
        planId: plan.id,
        stepId: step.id,
        title: step.title,
      });

      // 3. Execute step using the Agent Orchestrator Loop
      const stepQuery = `Step: ${step.title}\nDescription: ${step.description}\nOverall Plan Goal: ${plan.goal}`;
      const stepResult = await this.orchestrator.run({
        taskId: plan.taskId,
        query: stepQuery,
        allowedTools: step.expectedTool ? [step.expectedTool] : undefined,
      });

      // 4. Handle step outcome
      if (stepResult.status === 'completed') {
        step.status = StepStateMachine.transition(step.id, step.status, 'completed');
        step.output = stepResult.finalAnswer;
        step.completedAt = new Date().toISOString();

        completedStepSummaries.push(`- **${step.title}**: ${step.output}`);

        this.eventRecorder.record(plan.taskId, i + 1, 'step.completed' as any, {
          planId: plan.id,
          stepId: step.id,
          output: step.output,
        });
      } else {
        step.status = StepStateMachine.transition(step.id, step.status, 'failed');
        step.error = stepResult.stopReason || 'Step execution did not complete';
        step.completedAt = new Date().toISOString();

        executionFailed = true;
        failedStepId = step.id;

        this.eventRecorder.record(plan.taskId, i + 1, 'step.failed' as any, {
          planId: plan.id,
          stepId: step.id,
          error: step.error,
        });

        // Mark remaining pending steps as skipped
        for (let j = i + 1; j < plan.steps.length; j++) {
          const remainingStep = plan.steps[j];
          if (remainingStep.status === 'pending') {
            remainingStep.status = StepStateMachine.transition(
              remainingStep.id,
              remainingStep.status,
              'skipped',
            );
          }
        }
        break;
      }
    }

    const totalDurationMs = Date.now() - startTime;
    plan.updatedAt = new Date().toISOString();

    if (executionFailed) {
      plan.status = PlanStateMachine.transition(plan.id, plan.status, 'failed');
      const summary = `Plan execution failed at step '${failedStepId}'. Completed steps:\n${
        completedStepSummaries.join('\n') || 'None'
      }`;
      this.logger.warn(`Plan [${plan.id}] failed: ${summary}`);
      return {
        plan,
        success: false,
        summary,
        failedStepId,
        totalDurationMs,
      };
    }

    plan.status = PlanStateMachine.transition(plan.id, plan.status, 'completed');
    this.eventRecorder.record(plan.taskId, plan.steps.length, 'plan.completed' as any, {
      planId: plan.id,
      stepCount: plan.steps.length,
      durationMs: totalDurationMs,
    });

    const summary = `Successfully completed all ${plan.steps.length} steps for goal: "${
      plan.goal
    }".\n\n${completedStepSummaries.join('\n')}`;

    this.logger.log(`Plan [${plan.id}] completed successfully in ${totalDurationMs}ms`);

    return {
      plan,
      success: true,
      summary,
      totalDurationMs,
    };
  }
}
