import { PlanExecutorService } from './plan-executor.service';
import { PlanValidator } from './plan-validator';
import { AgentOrchestratorService } from '../services/agent-orchestrator.service';
import { EventRecorder } from '../events/event-recorder';
import { AgentEvaluatorService } from '../evaluation/agent-evaluator.service';
import { AgentPlannerService } from './agent-planner.service';
import { RetryPolicy } from '../evaluation/policies/retry.policy';
import { Plan } from './interfaces/plan.types';

describe('PlanExecutorService', () => {
  let executor: PlanExecutorService;
  let mockOrchestrator: Partial<AgentOrchestratorService>;
  let mockPlanner: Partial<AgentPlannerService>;
  let eventRecorder: EventRecorder;
  let evaluator: AgentEvaluatorService;
  let retryPolicy: RetryPolicy;

  beforeEach(() => {
    mockOrchestrator = {
      run: jest.fn(),
    };
    mockPlanner = {
      createPlan: jest.fn(),
    };
    eventRecorder = new EventRecorder();
    retryPolicy = new RetryPolicy();
    evaluator = new AgentEvaluatorService(retryPolicy);
    const validator = new PlanValidator();

    executor = new PlanExecutorService(
      validator,
      mockOrchestrator as AgentOrchestratorService,
      eventRecorder,
      evaluator,
      mockPlanner as AgentPlannerService,
      retryPolicy,
    );
  });

  it('should sequentially execute all plan steps to completion', async () => {
    (mockOrchestrator.run as jest.Mock)
      .mockResolvedValueOnce({
        status: 'completed',
        finalAnswer: 'Found documentation for NestJS',
      })
      .mockResolvedValueOnce({
        status: 'completed',
        finalAnswer: 'Calculation resulted in 100',
      });

    const plan: Plan = {
      id: 'plan_1',
      taskId: 'task_exec_1',
      version: 1,
      goal: 'Investigate and compute',
      summary: 'Two step workflow',
      status: 'active',
      steps: [
        {
          id: 'step_1',
          title: 'Research',
          description: 'Look up docs',
          status: 'pending',
          dependencies: [],
        },
        {
          id: 'step_2',
          title: 'Compute',
          description: 'Calculate result',
          status: 'pending',
          dependencies: ['step_1'],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await executor.executePlan(plan);

    expect(result.success).toBe(true);
    expect(result.plan.status).toBe('completed');
    expect(result.plan.steps[0].status).toBe('completed');
    expect(result.plan.steps[1].status).toBe('completed');
    expect(result.retriesUsed).toBe(0);
    expect(result.replanCount).toBe(0);
  });

  it('should retry a step when a transient error occurs and succeed on retry', async () => {
    // Step 1 fails on attempt 1 with timeout, succeeds on attempt 2
    (mockOrchestrator.run as jest.Mock)
      .mockResolvedValueOnce({
        status: 'failed',
        stopReason: 'Tool execution timed out',
      })
      .mockResolvedValueOnce({
        status: 'completed',
        finalAnswer: 'Recovered after retry',
      });

    const plan: Plan = {
      id: 'plan_retry',
      taskId: 'task_exec_retry',
      version: 1,
      goal: 'Retry recovery test',
      summary: 'Single step with transient error',
      status: 'active',
      steps: [
        {
          id: 'step_1',
          title: 'Step 1',
          description: 'Will timeout first',
          status: 'pending',
          dependencies: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await executor.executePlan(plan);

    expect(result.success).toBe(true);
    expect(result.retriesUsed).toBe(1);
    expect(result.plan.steps[0].status).toBe('completed');
    expect(result.plan.steps[0].output).toBe('Recovered after retry');
    expect(mockOrchestrator.run).toHaveBeenCalledTimes(2);
  });

  it('should trigger replanning when a step fails permanently and execute the revised plan', async () => {
    // Original step 1 fails with a permanent error
    (mockOrchestrator.run as jest.Mock)
      .mockResolvedValueOnce({
        status: 'failed',
        stopReason: 'Tool non_existent is not registered',
      })
      // Revised plan's step succeeds
      .mockResolvedValueOnce({
        status: 'completed',
        finalAnswer: 'Executed revised alternative approach',
      });

    const revisedPlan: Plan = {
      id: 'plan_revised_v2',
      taskId: 'task_exec_replan',
      version: 2,
      goal: 'Replan goal',
      summary: 'Revised plan with alternate tools',
      status: 'active',
      steps: [
        {
          id: 'step_alt_1',
          title: 'Alternative step',
          description: 'Use working tools',
          status: 'pending',
          dependencies: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (mockPlanner.createPlan as jest.Mock).mockResolvedValueOnce(revisedPlan);

    const initialPlan: Plan = {
      id: 'plan_original',
      taskId: 'task_exec_replan',
      version: 1,
      goal: 'Replan goal',
      summary: 'Original plan that fails',
      status: 'active',
      steps: [
        {
          id: 'step_1',
          title: 'Failing step',
          description: 'Permanent failure',
          status: 'pending',
          dependencies: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await executor.executePlan(initialPlan);

    expect(result.success).toBe(true);
    expect(result.replanCount).toBe(1);
    expect(result.plan.id).toBe('plan_revised_v2');
    expect(result.plan.version).toBe(2);
    expect(result.plan.status).toBe('completed');
    expect(mockPlanner.createPlan).toHaveBeenCalledTimes(1);
  });

  it('should fail and skip remaining steps when retries and replans are exhausted', async () => {
    (mockOrchestrator.run as jest.Mock).mockResolvedValue({
      status: 'failed',
      stopReason: 'SyntaxError in expression',
    });

    const plan: Plan = {
      id: 'plan_fail_final',
      taskId: 'task_exec_fail',
      version: 1,
      goal: 'Exhausted test',
      summary: 'Will fail without replan available',
      status: 'active',
      steps: [
        {
          id: 'step_1',
          title: 'Step 1',
          description: 'Permanent fail',
          status: 'pending',
          dependencies: [],
        },
        {
          id: 'step_2',
          title: 'Step 2',
          description: 'Will be skipped',
          status: 'pending',
          dependencies: ['step_1'],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Run with maxReplans: 0 so replan is disallowed
    const result = await executor.executePlan(plan, { maxReplans: 0 });

    expect(result.success).toBe(false);
    expect(result.plan.status).toBe('failed');
    expect(result.failedStepId).toBe('step_1');
    expect(result.plan.steps[0].status).toBe('failed');
    expect(result.plan.steps[1].status).toBe('skipped');
  });
});
