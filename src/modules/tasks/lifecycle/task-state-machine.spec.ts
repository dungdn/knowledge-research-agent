import { TaskStateMachine, InvalidTaskStateTransitionError } from './task-state-machine';

describe('TaskStateMachine', () => {
  describe('valid transitions', () => {
    it('should allow queued -> running', () => {
      expect(TaskStateMachine.canTransition('queued', 'running')).toBe(true);
      expect(() =>
        TaskStateMachine.assertValidTransition('queued', 'running', 'task_1'),
      ).not.toThrow();
    });

    it('should allow queued -> cancelled', () => {
      expect(TaskStateMachine.canTransition('queued', 'cancelled')).toBe(true);
      expect(() =>
        TaskStateMachine.assertValidTransition('queued', 'cancelled', 'task_1'),
      ).not.toThrow();
    });

    it('should allow running -> completed', () => {
      expect(TaskStateMachine.canTransition('running', 'completed')).toBe(true);
      expect(() =>
        TaskStateMachine.assertValidTransition('running', 'completed', 'task_1'),
      ).not.toThrow();
    });

    it('should allow running -> failed', () => {
      expect(TaskStateMachine.canTransition('running', 'failed')).toBe(true);
      expect(() =>
        TaskStateMachine.assertValidTransition('running', 'failed', 'task_1'),
      ).not.toThrow();
    });

    it('should allow running -> cancelled', () => {
      expect(TaskStateMachine.canTransition('running', 'cancelled')).toBe(true);
      expect(() =>
        TaskStateMachine.assertValidTransition('running', 'cancelled', 'task_1'),
      ).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    it('should reject queued -> completed directly', () => {
      expect(TaskStateMachine.canTransition('queued', 'completed')).toBe(false);
      expect(() =>
        TaskStateMachine.assertValidTransition('queued', 'completed', 'task_1'),
      ).toThrow(InvalidTaskStateTransitionError);
    });

    it('should reject transition from completed (terminal)', () => {
      expect(TaskStateMachine.canTransition('completed', 'running')).toBe(false);
      expect(TaskStateMachine.canTransition('completed', 'failed')).toBe(false);
      expect(() =>
        TaskStateMachine.assertValidTransition('completed', 'running', 'task_1'),
      ).toThrow(InvalidTaskStateTransitionError);
    });

    it('should reject transition from failed (terminal)', () => {
      expect(TaskStateMachine.canTransition('failed', 'running')).toBe(false);
      expect(TaskStateMachine.canTransition('failed', 'completed')).toBe(false);
      expect(() =>
        TaskStateMachine.assertValidTransition('failed', 'queued', 'task_1'),
      ).toThrow(InvalidTaskStateTransitionError);
    });

    it('should reject transition from cancelled (terminal)', () => {
      expect(TaskStateMachine.canTransition('cancelled', 'running')).toBe(false);
      expect(() =>
        TaskStateMachine.assertValidTransition('cancelled', 'completed', 'task_1'),
      ).toThrow(InvalidTaskStateTransitionError);
    });
  });

  describe('terminal checks', () => {
    it('should identify terminal states correctly', () => {
      expect(TaskStateMachine.isTerminal('completed')).toBe(true);
      expect(TaskStateMachine.isTerminal('failed')).toBe(true);
      expect(TaskStateMachine.isTerminal('cancelled')).toBe(true);
      expect(TaskStateMachine.isTerminal('queued')).toBe(false);
      expect(TaskStateMachine.isTerminal('running')).toBe(false);
    });
  });

  describe('allowed transitions query', () => {
    it('should list allowed transitions for queued', () => {
      expect(TaskStateMachine.getAllowedTransitions('queued')).toEqual([
        'running',
        'cancelled',
      ]);
    });

    it('should return empty list for terminal states', () => {
      expect(TaskStateMachine.getAllowedTransitions('completed')).toEqual([]);
      expect(TaskStateMachine.getAllowedTransitions('failed')).toEqual([]);
      expect(TaskStateMachine.getAllowedTransitions('cancelled')).toEqual([]);
    });
  });
});
