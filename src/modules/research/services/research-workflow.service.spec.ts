import { ResearchWorkflowService } from './research-workflow.service';
import { AgentPlannerService } from '../../agent/planning/agent-planner.service';
import { PlanExecutorService } from '../../agent/planning/plan-executor.service';
import { ResearchSynthesizerService } from './research-synthesizer.service';
import { EventRecorder } from '../../agent/events/event-recorder';
import { Plan } from '../../agent/planning/interfaces/plan.types';
import { ResearchReport } from '../interfaces/research-report.types';

describe('ResearchWorkflowService (End-to-End)', () => {
  let workflow: ResearchWorkflowService;
  let mockPlanner: Partial<AgentPlannerService>;
  let mockExecutor: Partial<PlanExecutorService>;
  let mockSynthesizer: Partial<ResearchSynthesizerService>;
  let eventRecorder: EventRecorder;

  beforeEach(() => {
    eventRecorder = new EventRecorder();

    mockPlanner = {
      createPlan: jest.fn(),
    };

    mockExecutor = {
      executePlan: jest.fn(),
    };

    mockSynthesizer = {
      synthesize: jest.fn(),
      formatAsMarkdown: jest.fn().mockReturnValue('# Formatted Report\nMarkdown content.'),
    };

    workflow = new ResearchWorkflowService(
      mockPlanner as AgentPlannerService,
      mockExecutor as PlanExecutorService,
      mockSynthesizer as ResearchSynthesizerService,
      eventRecorder,
    );
  });

  it('should orchestrate full workflow: planning -> execution -> aggregation -> synthesis -> markdown', async () => {
    const samplePlan: Plan = {
      id: 'plan_workflow_1',
      taskId: 'task_wf_1',
      version: 1,
      goal: 'Research NestJS Clean Architecture',
      summary: 'Two step research workflow',
      status: 'active',
      steps: [
        {
          id: 'step_1',
          title: 'Search documentation',
          description: 'Search for architectural guide',
          status: 'pending',
          dependencies: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (mockPlanner.createPlan as jest.Mock).mockResolvedValueOnce(samplePlan);

    (mockExecutor.executePlan as jest.Mock).mockResolvedValueOnce({
      plan: {
        ...samplePlan,
        status: 'completed',
        steps: [
          {
            ...samplePlan.steps[0],
            status: 'completed',
            output: 'Found NestJS architecture documentation',
          },
        ],
      },
      success: true,
      summary: 'Completed step 1',
    });

    const sampleReport: ResearchReport = {
      title: 'NestJS Architecture Report',
      summary: 'Detailed architectural overview.',
      keyFindings: [
        {
          claim: 'Modular monolith is recommended for early phases',
          evidence: 'Keeps boundaries without distributed complexity.',
          sourceUrls: ['https://docs.nestjs.com/architecture'],
          confidence: 'high',
        },
      ],
      comparisons: [],
      conflictingInformation: [],
      evidenceGaps: [],
      limitations: ['Documentation study only'],
      unresolvedQuestions: [],
      sources: [
        {
          url: 'https://docs.nestjs.com/architecture',
          title: 'NestJS Docs',
          domain: 'docs.nestjs.com',
          retrievedAt: new Date().toISOString(),
        },
      ],
    };

    (mockSynthesizer.synthesize as jest.Mock).mockResolvedValueOnce(sampleReport);

    const result = await workflow.executeResearchTask('Research NestJS Clean Architecture');

    expect(result.taskId).toBeDefined();
    expect(result.plan.status).toBe('completed');
    expect(result.report.title).toBe('NestJS Architecture Report');
    expect(result.markdown).toContain('# Formatted Report');
    expect(typeof result.durationMs).toBe('number');

    expect(mockPlanner.createPlan).toHaveBeenCalledTimes(1);
    expect(mockExecutor.executePlan).toHaveBeenCalledTimes(1);
    expect(mockSynthesizer.synthesize).toHaveBeenCalledTimes(1);
  });
});
