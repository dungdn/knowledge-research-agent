import { PlanExecutorService } from './plan-executor.service';
import { PlanValidator } from './plan-validator';
import { AgentOrchestratorService } from '../services/agent-orchestrator.service';
import { EventRecorder } from '../events/event-recorder';
import { Plan } from './interfaces/plan.types';

describe('PlanExecutorService', () => {
  let executor: PlanExecutorService;
  let mockOrchestrator: Partial<AgentOrchestratorService>;
  let eventRecorder: EventRecorder;

  beforeEach(() => {
    mockOrchestrator = {
      run: jest.fn(),
    };
    eventRecorder = new EventRecorder();
    const validator = new PlanValidator();

    executor = new PlanExecutorService(
      validator,
      mockOrchestrator as AgentOrchestratorService,
      eventRecorder,
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
    expect(result.plan.steps[0].output).toBe('Found documentation for NestJS');
    expect(result.plan.steps[1].status).toBe('completed');
    expect(result.plan.steps[1].output).toBe('Calculation resulted in 100');
    expect(mockOrchestrator.run).toHaveBeenCalledTimes(2);
  });

  it('should halt execution, mark plan failed, and skip remaining steps when a step fails', async () => {
    (mockOrchestrator.run as jest.Mock).mockResolvedValueOnce({
      status: 'failed',
      stopReason: 'Tool execution timed out',
    });

    const plan: Plan = {
      id: 'plan_2',
      taskId: 'task_exec_2',
      version: 1,
      goal: 'Failed execution test',
      summary: 'Step 1 will fail',
      status: 'active',
      steps: [
        {
          id: 'step_1',
          title: 'Step 1',
          description: 'Fails here',
          status: 'pending',
          dependencies: [],
        },
        {
          id: 'step_2',
          title: 'Step 2',
          description: 'Should be skipped',
          status: 'pending',
          dependencies: ['step_1'],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await executor.executePlan(plan);

    expect(result.success).toBe(false);
    expect(result.plan.status).toBe('failed');
    expect(result.failedStepId).toBe('step_1');
    expect(result.plan.steps[0].status).toBe('failed');
    expect(result.plan.steps[0].error).toBe('Tool execution timed out');
    expect(result.plan.steps[1].status).toBe('skipped');
    expect(mockOrchestrator.run).toHaveBeenCalledTimes(1);
  });
});
