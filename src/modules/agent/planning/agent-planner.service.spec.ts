import { AgentPlannerService } from './agent-planner.service';
import { MockLlmAdapter } from '../../../modules/llm/adapters/mock-llm.adapter';
import { ToolRegistry } from '../../../modules/tools/registry/tool.registry';
import { PlanValidator } from './plan-validator';
import { EventRecorder } from '../events/event-recorder';

describe('AgentPlannerService', () => {
  let planner: AgentPlannerService;
  let mockLlm: MockLlmAdapter;
  let eventRecorder: EventRecorder;

  beforeEach(() => {
    mockLlm = new MockLlmAdapter();
    const toolRegistry = new ToolRegistry();
    const validator = new PlanValidator();
    eventRecorder = new EventRecorder();

    planner = new AgentPlannerService(
      mockLlm,
      toolRegistry,
      validator,
      eventRecorder,
    );
  });

  it('should generate a valid plan from user goal', async () => {
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        goal: 'Calculate annual revenue',
        summary: 'Gather numbers and compute total',
        steps: [
          {
            id: 'step_1',
            title: 'Search financials',
            description: 'Search for Q1-Q4 quarterly revenue',
            expectedTool: 'mock_search',
            dependencies: [],
          },
          {
            id: 'step_2',
            title: 'Sum totals',
            description: 'Use calculator to sum the quarterly figures',
            expectedTool: 'calculator',
            dependencies: ['step_1'],
          },
        ],
      }),
      finishReason: 'stop',
    });

    const plan = await planner.createPlan({
      taskId: 'test_task_123',
      goal: 'Calculate annual revenue',
    });

    expect(plan.taskId).toBe('test_task_123');
    expect(plan.status).toBe('active');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].id).toBe('step_1');
    expect(plan.steps[0].status).toBe('pending');
    expect(plan.steps[1].id).toBe('step_2');
    expect(plan.steps[1].status).toBe('pending');

    const events = eventRecorder.getEvents('test_task_123');
    expect(events.some((e) => e.eventType === 'plan.created')).toBe(true);
  });
});
