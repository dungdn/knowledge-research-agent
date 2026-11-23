import { Injectable } from '@nestjs/common';
import { PlanDraft, PlanStep } from './interfaces/plan.types';
import { PlanValidationError } from './errors/plan.errors';

export interface ValidatablePlanDraft {
  goal: string;
  summary: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    expectedTool?: string;
    dependencies?: string[];
  }>;
}

@Injectable()
export class PlanValidator {
  validate(draft: ValidatablePlanDraft): void {
    if (!draft.steps || draft.steps.length === 0) {
      throw new PlanValidationError('Plan must have at least one step');
    }

    const seenIds = new Set<string>();

    for (let i = 0; i < draft.steps.length; i++) {
      const step = draft.steps[i];

      // Check unique IDs
      if (seenIds.has(step.id)) {
        throw new PlanValidationError(
          `Duplicate step identifier found: '${step.id}'`,
          { stepId: step.id },
        );
      }
      seenIds.add(step.id);

      // Check dependencies only refer to preceding steps
      if (step.dependencies && step.dependencies.length > 0) {
        for (const depId of step.dependencies) {
          if (depId === step.id) {
            throw new PlanValidationError(
              `Step '${step.id}' cannot depend on itself`,
              { stepId: step.id },
            );
          }

          // Must already be in seenIds (which means it appeared earlier in the steps list)
          const priorIds = draft.steps.slice(0, i).map((s) => s.id);
          if (!priorIds.includes(depId)) {
            throw new PlanValidationError(
              `Step '${step.id}' depends on '${depId}' which is not a preceding step (no forward or missing dependencies allowed)`,
              { stepId: step.id, missingDependency: depId },
            );
          }
        }
      }
    }
  }

  canExecuteStep(step: PlanStep, allSteps: PlanStep[]): {
    canExecute: boolean;
    reason?: string;
  } {
    if (step.status !== 'pending' && step.status !== 'retrying') {
      return {
        canExecute: false,
        reason: `Step is not ready for execution (current status: '${step.status}')`,
      };
    }

    if (!step.dependencies || step.dependencies.length === 0) {
      return { canExecute: true };
    }

    for (const depId of step.dependencies) {
      const depStep = allSteps.find((s) => s.id === depId);
      if (!depStep) {
        return {
          canExecute: false,
          reason: `Dependency step '${depId}' not found`,
        };
      }
      if (depStep.status !== 'completed') {
        return {
          canExecute: false,
          reason: `Prerequisite step '${depId}' is '${depStep.status}', not 'completed'`,
        };
      }
    }

    return { canExecute: true };
  }
}
