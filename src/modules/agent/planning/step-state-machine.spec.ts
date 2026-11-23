import { StepStateMachine, PlanStateMachine } from './step-state-machine';
import { InvalidStepStatusTransitionError } from './errors/plan.errors';

describe('StepStateMachine & PlanStateMachine', () => {
  describe('StepStateMachine', () => {
    it('should allow valid transitions: pending -> running -> completed', () => {
      let status = StepStateMachine.transition('s1', 'pending', 'running');
      expect(status).toBe('running');

      status = StepStateMachine.transition('s1', status, 'completed');
      expect(status).toBe('completed');
    });

    it('should allow retry transition: running -> retrying -> running', () => {
      let status = StepStateMachine.transition('s1', 'running', 'retrying');
      expect(status).toBe('retrying');

      status = StepStateMachine.transition('s1', status, 'running');
      expect(status).toBe('running');
    });

    it('should throw InvalidStepStatusTransitionError on invalid transition from completed', () => {
      expect(() => {
        StepStateMachine.transition('s1', 'completed', 'running');
      }).toThrow(InvalidStepStatusTransitionError);
    });

    it('should throw InvalidStepStatusTransitionError on invalid direct transition pending -> completed', () => {
      expect(() => {
        StepStateMachine.transition('s1', 'pending', 'completed');
      }).toThrow(InvalidStepStatusTransitionError);
    });
  });

  describe('PlanStateMachine', () => {
    it('should allow draft -> active -> completed', () => {
      let status = PlanStateMachine.transition('p1', 'draft', 'active');
      expect(status).toBe('active');

      status = PlanStateMachine.transition('p1', status, 'completed');
      expect(status).toBe('completed');
    });

    it('should allow active -> failed', () => {
      const status = PlanStateMachine.transition('p1', 'active', 'failed');
      expect(status).toBe('failed');
    });

    it('should reject transition from completed', () => {
      expect(() => {
        PlanStateMachine.transition('p1', 'completed', 'active');
      }).toThrow('Invalid plan status transition');
    });
  });
});
