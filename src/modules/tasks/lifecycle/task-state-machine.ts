import { TaskStatus } from '../interfaces/task.types';

export class InvalidTaskStateTransitionError extends Error {
  constructor(
    public readonly currentStatus: TaskStatus,
    public readonly targetStatus: TaskStatus,
    reason?: string,
  ) {
    super(
      `Invalid task state transition from '${currentStatus}' to '${targetStatus}'${
        reason ? `: ${reason}` : ''
      }`,
    );
    this.name = 'InvalidTaskStateTransitionError';
  }
}

/**
 * Finite State Machine enforcing task lifecycle invariants.
 *
 * State flow:
 *   [queued] -> [running] -> [completed] (terminal)
 *                         -> [failed]    (terminal)
 *                         -> [cancelled] (terminal)
 *   [queued] --------------> [cancelled] (terminal)
 */
export class TaskStateMachine {
  private static readonly VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    queued: ['running', 'cancelled'],
    running: ['completed', 'failed', 'cancelled'],
    completed: [], // terminal
    failed: [],    // terminal
    cancelled: [], // terminal
  };

  private static readonly TERMINAL_STATES: ReadonlySet<TaskStatus> = new Set([
    'completed',
    'failed',
    'cancelled',
  ]);

  static canTransition(from: TaskStatus, to: TaskStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static assertValidTransition(
    from: TaskStatus,
    to: TaskStatus,
    taskId?: string,
  ): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidTaskStateTransitionError(
        from,
        to,
        taskId ? `Task ID: ${taskId}` : undefined,
      );
    }
  }

  static isTerminal(status: TaskStatus): boolean {
    return this.TERMINAL_STATES.has(status);
  }

  static getAllowedTransitions(from: TaskStatus): TaskStatus[] {
    return this.VALID_TRANSITIONS[from] || [];
  }
}
