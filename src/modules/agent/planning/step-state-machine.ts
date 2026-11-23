import { StepStatus, PlanStatus } from './interfaces/plan.types';
import { InvalidStepStatusTransitionError } from './errors/plan.errors';

export class StepStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<StepStatus, StepStatus[]> = {
    pending: ['running', 'skipped'],
    running: ['completed', 'failed', 'retrying'],
    retrying: ['running', 'failed'],
    completed: [], // Terminal
    failed: ['retrying'], // Can retry if recovery policy permits
    skipped: [], // Terminal
  };

  static isValidTransition(current: StepStatus, target: StepStatus): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  static transition(
    stepId: string,
    current: StepStatus,
    target: StepStatus,
  ): StepStatus {
    if (!this.isValidTransition(current, target)) {
      throw new InvalidStepStatusTransitionError(stepId, current, target);
    }
    return target;
  }
}

export class PlanStateMachine {
  private static readonly ALLOWED_PLAN_TRANSITIONS: Record<
    PlanStatus,
    PlanStatus[]
  > = {
    draft: ['active', 'failed'],
    active: ['completed', 'failed', 'superseded'],
    completed: [], // Terminal
    failed: ['superseded'], // Can be superseded by a replan
    superseded: [], // Terminal
  };

  static isValidTransition(current: PlanStatus, target: PlanStatus): boolean {
    const allowed = this.ALLOWED_PLAN_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  static transition(
    planId: string,
    current: PlanStatus,
    target: PlanStatus,
  ): PlanStatus {
    if (!this.isValidTransition(current, target)) {
      throw new Error(
        `Invalid plan status transition for '${planId}': cannot transition from '${current}' to '${target}'`,
      );
    }
    return target;
  }
}
