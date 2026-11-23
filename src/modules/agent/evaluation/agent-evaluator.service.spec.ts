import { AgentEvaluatorService } from './agent-evaluator.service';
import { RetryPolicy } from './policies/retry.policy';
import { Plan } from '../planning/interfaces/plan.types';
import { EvaluatorContext } from './interfaces/evaluation.types';

describe('AgentEvaluatorService', () => {
  let evaluator: AgentEvaluatorService;
  let retryPolicy: RetryPolicy;

  beforeEach(() => {
    retryPolicy = new RetryPolicy();
    evaluator = new AgentEvaluatorService(retryPolicy);
  });

  const samplePlan: Plan = {
    id: 'p1',
    taskId: 't1',
    version: 1,
    goal: 'Test goal',
    summary: 'Summary',
    status: 'active',
    steps: [
      { id: 's1', title: 'Step 1', description: 'Desc 1', status: 'pending', dependencies: [] },
      { id: 's2', title: 'Step 2', description: 'Desc 2', status: 'pending', dependencies: ['s1'] },
    ],
    createdAt: '',
    updatedAt: '',
  };

  const createContext = (overrides?: Partial<EvaluatorContext>): EvaluatorContext => ({
    retriesByStep: new Map(),
    totalRetriesUsed: 0,
    replanCount: 0,
    maxRetriesPerStep: 2,
    maxTotalRetries: 4,
    maxReplans: 2,
    ...overrides,
  });

  it('should return continue when current step succeeds and more steps remain', () => {
    const result = evaluator.evaluateStepOutcome(
      samplePlan,
      samplePlan.steps[0],
      {
        taskId: 't1',
        status: 'completed',
        finalAnswer: 'Step 1 done',
        iterations: 1,
        toolCallCount: 1,
        durationMs: 10,
        observations: [],
      },
      createContext(),
    );

    expect(result.decision).toBe('continue');
    expect(result.metrics.stepsRemaining).toBe(1);
  });

  it('should return complete when all steps succeed', () => {
    const planWithCompletedFirst: Plan = {
      ...samplePlan,
      steps: [
        { ...samplePlan.steps[0], status: 'completed' },
        samplePlan.steps[1],
      ],
    };

    const result = evaluator.evaluateStepOutcome(
      planWithCompletedFirst,
      planWithCompletedFirst.steps[1],
      {
        taskId: 't1',
        status: 'completed',
        finalAnswer: 'Step 2 done',
        iterations: 1,
        toolCallCount: 1,
        durationMs: 10,
        observations: [],
      },
      createContext(),
    );

    expect(result.decision).toBe('complete');
  });

  it('should return retry_step when transient error occurs and retries remain', () => {
    const result = evaluator.evaluateStepOutcome(
      samplePlan,
      samplePlan.steps[0],
      {
        taskId: 't1',
        status: 'failed',
        stopReason: 'Tool execution timed out after 5000ms',
        iterations: 1,
        toolCallCount: 1,
        durationMs: 5000,
        observations: [],
      },
      createContext(),
    );

    expect(result.decision).toBe('retry_step');
    expect(result.rationale).toContain('Retrying attempt 1');
  });

  it('should return replan when retries are exhausted but replan budget remains', () => {
    const retriesMap = new Map();
    retriesMap.set('s1', 2); // 2 retries already used

    const result = evaluator.evaluateStepOutcome(
      samplePlan,
      samplePlan.steps[0],
      {
        taskId: 't1',
        status: 'failed',
        stopReason: 'Tool execution timed out after 5000ms',
        iterations: 1,
        toolCallCount: 1,
        durationMs: 5000,
        observations: [],
      },
      createContext({ retriesByStep: retriesMap, replanCount: 0 }),
    );

    expect(result.decision).toBe('replan');
    expect(result.suggestedReplanGoal).toBeDefined();
  });

  it('should return fail when both retries and replans are exhausted', () => {
    const retriesMap = new Map();
    retriesMap.set('s1', 2);

    const result = evaluator.evaluateStepOutcome(
      samplePlan,
      samplePlan.steps[0],
      {
        taskId: 't1',
        status: 'failed',
        stopReason: 'Permanent failure',
        iterations: 1,
        toolCallCount: 1,
        durationMs: 100,
        observations: [],
      },
      createContext({ retriesByStep: retriesMap, replanCount: 2 }),
    );

    expect(result.decision).toBe('fail');
  });
});
