import { PlanValidator } from './plan-validator';
import { PlanValidationError } from './errors/plan.errors';
import { PlanStep } from './interfaces/plan.types';

describe('PlanValidator', () => {
  let validator: PlanValidator;

  beforeEach(() => {
    validator = new PlanValidator();
  });

  it('should accept valid sequential steps with proper dependencies', () => {
    expect(() => {
      validator.validate({
        goal: 'Research topic',
        summary: 'Step-by-step investigation',
        steps: [
          {
            id: 'step_1',
            title: 'Search docs',
            description: 'Find references',
            dependencies: [],
          },
          {
            id: 'step_2',
            title: 'Synthesize',
            description: 'Write summary',
            dependencies: ['step_1'],
          },
        ],
      });
    }).not.toThrow();
  });

  it('should reject plan with duplicate step IDs', () => {
    expect(() => {
      validator.validate({
        goal: 'Goal',
        summary: 'Summary',
        steps: [
          { id: 'dup_id', title: 'Step 1', description: 'Desc 1', dependencies: [] },
          { id: 'dup_id', title: 'Step 2', description: 'Desc 2', dependencies: [] },
        ],
      });
    }).toThrow(PlanValidationError);
  });

  it('should reject plan with self-dependency', () => {
    expect(() => {
      validator.validate({
        goal: 'Goal',
        summary: 'Summary',
        steps: [
          { id: 'step_1', title: 'Step 1', description: 'Desc', dependencies: ['step_1'] },
        ],
      });
    }).toThrow(PlanValidationError);
  });

  it('should reject plan with forward dependency (step_1 depending on step_2)', () => {
    expect(() => {
      validator.validate({
        goal: 'Goal',
        summary: 'Summary',
        steps: [
          { id: 'step_1', title: 'Step 1', description: 'Desc', dependencies: ['step_2'] },
          { id: 'step_2', title: 'Step 2', description: 'Desc', dependencies: [] },
        ],
      });
    }).toThrow(PlanValidationError);
  });

  describe('canExecuteStep', () => {
    const steps: PlanStep[] = [
      {
        id: 's1',
        title: 'Step 1',
        description: 'First',
        status: 'completed',
        dependencies: [],
      },
      {
        id: 's2',
        title: 'Step 2',
        description: 'Second',
        status: 'pending',
        dependencies: ['s1'],
      },
      {
        id: 's3',
        title: 'Step 3',
        description: 'Third',
        status: 'pending',
        dependencies: ['s2'],
      },
    ];

    it('should allow s2 to execute since s1 is completed', () => {
      const result = validator.canExecuteStep(steps[1], steps);
      expect(result.canExecute).toBe(true);
    });

    it('should NOT allow s3 to execute since s2 is still pending', () => {
      const result = validator.canExecuteStep(steps[2], steps);
      expect(result.canExecute).toBe(false);
      expect(result.reason).toContain('Prerequisite step');
    });
  });
});
