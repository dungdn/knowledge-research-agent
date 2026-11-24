import {
  TaskEntity,
  TaskFilter,
  PaginationOptions,
  PaginatedResult,
} from './task.types';
import { AgentEvent } from '../../agent/interfaces/agent-event.types';

export const TASK_REPOSITORY_TOKEN = Symbol('TASK_REPOSITORY_PORT');
export const EVENT_REPOSITORY_TOKEN = Symbol('EVENT_REPOSITORY_PORT');

export interface ITaskRepository {
  create(task: TaskEntity): Promise<TaskEntity>;
  findById(id: string): Promise<TaskEntity | null>;
  update(id: string, partial: Partial<TaskEntity>): Promise<TaskEntity>;
  findMany(
    filter?: TaskFilter,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<TaskEntity>>;
  delete(id: string): Promise<boolean>;
  count(filter?: TaskFilter): Promise<number>;
}

export interface IEventRepository {
  save(event: AgentEvent): Promise<AgentEvent>;
  saveMany(events: AgentEvent[]): Promise<void>;
  findByTaskId(taskId: string): Promise<AgentEvent[]>;
  findMany(filter?: {
    taskId?: string;
    eventType?: AgentEvent['eventType'];
    limit?: number;
  }): Promise<AgentEvent[]>;
  clear(taskId?: string): Promise<void>;
  countByTaskId(taskId: string): Promise<number>;
}
