import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import {
  TASK_REPOSITORY_TOKEN,
  EVENT_REPOSITORY_TOKEN,
} from '../interfaces/task-repository.port';
import { InMemoryTaskRepository } from '../repositories/in-memory-task.repository';
import { InMemoryEventRepository } from '../repositories/in-memory-event.repository';
import { ResearchWorkflowService } from '../../research/services/research-workflow.service';
import { EventRecorder } from '../../agent/events/event-recorder';
import { Plan } from '../../agent/planning/interfaces/plan.types';
import { ResearchReport } from '../../research/interfaces/research-report.types';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: InMemoryTaskRepository;
  let eventRepo: InMemoryEventRepository;
  let workflowService: Partial<ResearchWorkflowService>;
  let eventRecorder: EventRecorder;

  const samplePlan: Plan = {
    id: 'plan_test',
    taskId: 'task_test',
    version: 1,
    goal: 'Test research goal',
    summary: 'Plan test summary',
    status: 'completed',
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleReport: ResearchReport = {
    title: 'Test Research Report',
    summary: 'This is an executive summary.',
    keyFindings: [
      {
        claim: 'NestJS is scalable',
        evidence: 'Official docs state modular architecture',
        sourceUrls: ['https://nestjs.com'],
        confidence: 'high',
      },
    ],
    comparisons: [],
    conflictingInformation: [],
    evidenceGaps: [],
    limitations: [],
    unresolvedQuestions: [],
    sources: [
      {
        url: 'https://nestjs.com',
        title: 'NestJS',
        domain: 'nestjs.com',
        retrievedAt: new Date().toISOString(),
      },
    ],
  };

  const sampleMarkdown = '# Test Research Report\n\nExecutive summary content.';

  beforeEach(async () => {
    taskRepo = new InMemoryTaskRepository();
    eventRepo = new InMemoryEventRepository();
    eventRecorder = new EventRecorder();

    workflowService = {
      executeResearchTask: jest.fn().mockResolvedValue({
        taskId: 'test_task',
        plan: samplePlan,
        report: sampleReport,
        markdown: sampleMarkdown,
        durationMs: 150,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TASK_REPOSITORY_TOKEN,
          useValue: taskRepo,
        },
        {
          provide: EVENT_REPOSITORY_TOKEN,
          useValue: eventRepo,
        },
        {
          provide: ResearchWorkflowService,
          useValue: workflowService,
        },
        {
          provide: EventRecorder,
          useValue: eventRecorder,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should create and immediately execute a task by default', async () => {
    const result = await service.createTask({
      goal: 'Explore Microservices with NestJS',
      executeImmediately: true,
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(result.report).toBeDefined();
    expect(result.report?.title).toBe('Test Research Report');
    expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);

    // Verify persisted in repo
    const persisted = await taskRepo.findById(result.id);
    expect(persisted?.status).toBe('completed');
  });

  it('should create task in queued status if executeImmediately is false', async () => {
    const result = await service.createTask({
      goal: 'Delayed execution goal',
      executeImmediately: false,
    });

    expect(result.status).toBe('queued');
    expect(result.completedAt).toBeUndefined();

    // Verify we can execute it later
    const executed = await service.executeTask(result.id);
    expect(executed.status).toBe('completed');
  });

  it('should handle execution failure gracefully and mark task as failed', async () => {
    workflowService.executeResearchTask = jest
      .fn()
      .mockRejectedValue(new Error('LLM rate limit exhausted'));

    const task = await service.createTask({
      goal: 'Task that will fail',
      executeImmediately: false,
    });

    const failed = await service.executeTask(task.id);
    expect(failed.status).toBe('failed');
    expect(failed.error).toContain('LLM rate limit exhausted');
  });

  it('should list tasks with pagination and status filtering', async () => {
    await service.createTask({ goal: 'Task 1', executeImmediately: false });
    await service.createTask({ goal: 'Task 2', executeImmediately: true });

    const all = await service.listTasks();
    expect(all.total).toBe(2);

    const queuedOnly = await service.listTasks({ status: 'queued' });
    expect(queuedOnly.total).toBe(1);

    const completedOnly = await service.listTasks({ status: 'completed' });
    expect(completedOnly.total).toBe(1);
  });

  it('should retrieve events for a task', async () => {
    const task = await service.createTask({
      goal: 'Task with events',
      executeImmediately: false,
    });

    eventRecorder.record(task.id, 1, 'task.started', { msg: 'started' });
    eventRecorder.record(task.id, 1, 'step.started', { step: '1' });

    // Execute will sync events to eventRepo
    await service.executeTask(task.id);

    const events = await service.getTaskEvents(task.id);
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe('task.started');
  });

  it('should retrieve the research report and markdown', async () => {
    const task = await service.createTask({
      goal: 'Task with report',
      executeImmediately: true,
    });

    const reportArtifact = await service.getTaskReport(task.id);
    expect(reportArtifact.report.title).toBe('Test Research Report');
    expect(reportArtifact.markdown).toContain('# Test Research Report');
  });

  it('should cancel a queued task', async () => {
    const task = await service.createTask({
      goal: 'Task to cancel',
      executeImmediately: false,
    });

    const cancelled = await service.cancelTask(task.id);
    expect(cancelled.status).toBe('cancelled');

    const fetched = await service.getTask(task.id);
    expect(fetched.status).toBe('cancelled');
  });
});
