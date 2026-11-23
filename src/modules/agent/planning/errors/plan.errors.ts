export class PlanError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'PLAN_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PlanError';
  }
}

export class InvalidStepStatusTransitionError extends PlanError {
  constructor(
    stepId: string,
    currentStatus: string,
    targetStatus: string,
  ) {
    super(
      `Invalid step status transition for '${stepId}': cannot transition from '${currentStatus}' to '${targetStatus}'`,
      'INVALID_STEP_STATUS_TRANSITION',
      { stepId, currentStatus, targetStatus },
    );
    this.name = 'InvalidStepStatusTransitionError';
  }
}

export class PlanValidationError extends PlanError {
  constructor(message: string, details?: unknown) {
    super(`Plan validation failed: ${message}`, 'PLAN_VALIDATION_ERROR', details);
    this.name = 'PlanValidationError';
  }
}
