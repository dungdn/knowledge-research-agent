import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ITaskRepository,
  IEventRepository,
  TASK_REPOSITORY_TOKEN,
  EVENT_REPOSITORY_TOKEN,
} from '../interfaces/task-repository.port';
import {
  TaskEntity,
  CreateTaskInput,
  CreateTaskSchema,
  QueryTasksInput,
  QueryTasksSchema,
  PaginatedResult,
} from '../interfaces/task.types';
import { TaskStateMachine } from '../lifecycle/task-state-machine';
import { ResearchWorkflowService } from '../../research/services/research-workflow.service';
import { EventRecorder } from '../../agent/events/event-recorder';
import { AgentEvent } from '../../agent/interfaces/agent-event.types';
import { ResearchReport } from '../../research/interfaces/research-report.types';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(TASK_REPOSITORY_TOKEN)
    private readonly taskRepo: ITaskRepository,
    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly eventRepo: IEventRepository,
    private readonly researchWorkflow: ResearchWorkflowService,
    private readonly eventRecorder: EventRecorder,
  ) {}

  async createTask(input: CreateTaskInput): Promise<TaskEntity> {
    const parseResult = CreateTaskSchema.safeParse(input);
    if (!parseResult.success) {
      throw new BadRequestException(
        `Invalid task input: ${parseResult.error.message}`,
      );
    }
    const data = parseResult.data;

    const now = new Date().toISOString();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const entity: TaskEntity = {
      id: taskId,
      goal: data.goal,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      budget: data.budget,
      metadata: data.metadata,
    };

    const created = await this.taskRepo.create(entity);
    this.logger.log(`Created new task [${taskId}]: "${data.goal}" (status: queued)`);

    if (data.executeImmediately) {
      // Execute asynchronously or inline
      return this.executeTask(taskId);
    }

    return created;
  }

  async executeTask(taskId: string): Promise<TaskEntity> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID '${taskId}' not found`);
    }

    TaskStateMachine.assertValidTransition(task.status, 'running', taskId);

    // Transition to running
    await this.taskRepo.update(taskId, {
      status: 'running',
    });
    this.logger.log(`Executing task [${taskId}]...`);

    const startTime = Date.now();
    try {
      const output = await this.researchWorkflow.executeResearchTask(task.goal, {
        taskId,
        maxRetriesPerStep: task.budget?.maxRetriesPerStep,
        maxReplans: task.budget?.maxReplans,
      });

      // Synchronize events from EventRecorder into durable IEventRepository
      const events = this.eventRecorder.getEvents(taskId);
      if (events.length > 0) {
        await this.eventRepo.saveMany(events);
      }

      const durationMs = Date.now() - startTime;
      const completedTask = await this.taskRepo.update(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        plan: output.plan,
        report: output.report,
        markdown: output.markdown,
        metrics: {
          durationMs,
          iterationsUsed: events.filter((e) => e.eventType === 'iteration.started').length,
          toolCallsCount: events.filter((e) => e.eventType === 'tool.dispatched').length,
          retriesUsed: events.filter((e) => e.eventType === 'evaluation.completed' && e.payload?.decision === 'retry_step').length,
          replanCount: events.filter((e) => e.eventType === 'plan.revised').length,
        },
      });

      this.logger.log(
        `Task [${taskId}] completed successfully in ${durationMs}ms`,
      );
      return completedTask;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Save recorded events up to failure
      const events = this.eventRecorder.getEvents(taskId);
      if (events.length > 0) {
        await this.eventRepo.saveMany(events);
      }

      const failedTask = await this.taskRepo.update(taskId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: errorMessage,
        metrics: { durationMs },
      });

      this.logger.error(
        `Task [${taskId}] failed after ${durationMs}ms: ${errorMessage}`,
      );
      return failedTask;
    }
  }

  async getTask(id: string): Promise<TaskEntity> {
    const task = await this.taskRepo.findById(id);
    if (!task) {
      throw new NotFoundException(`Task with ID '${id}' not found`);
    }
    return task;
  }

  async listTasks(
    query?: QueryTasksInput,
  ): Promise<PaginatedResult<TaskEntity>> {
    const parsed = QueryTasksSchema.safeParse(query || {});
    const filter = parsed.success
      ? {
          status: parsed.data.status,
          search: parsed.data.search,
        }
      : undefined;

    const pagination = parsed.success
      ? {
          page: parsed.data.page,
          limit: parsed.data.limit,
        }
      : undefined;

    return this.taskRepo.findMany(filter, pagination);
  }

  async getTaskEvents(taskId: string): Promise<AgentEvent[]> {
    await this.getTask(taskId); // verify existence
    return this.eventRepo.findByTaskId(taskId);
  }

  async getTaskReport(
    taskId: string,
  ): Promise<{ report: ResearchReport; markdown: string }> {
    const task = await this.getTask(taskId);
    if (!task.report || !task.markdown) {
      throw new NotFoundException(
        `Research report for task '${taskId}' is not yet available (current status: ${task.status})`,
      );
    }
    return {
      report: task.report,
      markdown: task.markdown,
    };
  }

  async cancelTask(taskId: string): Promise<TaskEntity> {
    const task = await this.getTask(taskId);
    TaskStateMachine.assertValidTransition(task.status, 'cancelled', taskId);

    const cancelled = await this.taskRepo.update(taskId, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    });

    this.logger.warn(`Task [${taskId}] was cancelled by user.`);
    return cancelled;
  }
}
