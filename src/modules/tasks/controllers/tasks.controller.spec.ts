import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from '../services/tasks.service';
import { TaskEntity } from '../interfaces/task.types';

describe('TasksController', () => {
  let controller: TasksController;
  let service: Partial<TasksService>;

  const mockTask: TaskEntity = {
    id: 'task_ctrl_1',
    goal: 'Test controller task',
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    report: {
      title: 'Report Title',
      summary: 'Summary',
      keyFindings: [
        {
          claim: 'Sample claim',
          evidence: 'Sample evidence',
          sourceUrls: ['https://example.com'],
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
          url: 'https://example.com',
          title: 'Example',
          domain: 'example.com',
          retrievedAt: new Date().toISOString(),
        },
      ],
    },
    markdown: '# Report Title',
  };

  beforeEach(async () => {
    service = {
      createTask: jest.fn().mockResolvedValue(mockTask),
      listTasks: jest.fn().mockResolvedValue({
        items: [mockTask],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }),
      getTask: jest.fn().mockResolvedValue(mockTask),
      getTaskEvents: jest.fn().mockResolvedValue([
        {
          id: 'ev_1',
          taskId: 'task_ctrl_1',
          iteration: 1,
          eventType: 'task.started',
          timestamp: new Date().toISOString(),
          payload: {},
        },
      ]),
      getTaskReport: jest.fn().mockResolvedValue({
        report: mockTask.report!,
        markdown: mockTask.markdown!,
      }),
      cancelTask: jest.fn().mockResolvedValue({
        ...mockTask,
        status: 'cancelled',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should create a task via POST /api/v1/tasks', async () => {
    const res = await controller.createTask({
      goal: 'Test controller task',
    });
    expect(res.id).toBe('task_ctrl_1');
    expect(service.createTask).toHaveBeenCalledWith({
      goal: 'Test controller task',
    });
  });

  it('should list tasks via GET /api/v1/tasks', async () => {
    const res = await controller.listTasks({ page: 1, limit: 10 });
    expect(res.items.length).toBe(1);
    expect(service.listTasks).toHaveBeenCalled();
  });

  it('should get task by id via GET /api/v1/tasks/:id', async () => {
    const res = await controller.getTask('task_ctrl_1');
    expect(res.id).toBe('task_ctrl_1');
  });

  it('should get events via GET /api/v1/tasks/:id/events', async () => {
    const events = await controller.getTaskEvents('task_ctrl_1');
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('task.started');
  });

  it('should get report via GET /api/v1/tasks/:id/report', async () => {
    const reportData = await controller.getTaskReport('task_ctrl_1');
    expect(reportData.report.title).toBe('Report Title');
  });

  it('should cancel task via POST /api/v1/tasks/:id/cancel', async () => {
    const res = await controller.cancelTask('task_ctrl_1');
    expect(res.status).toBe('cancelled');
  });
});
