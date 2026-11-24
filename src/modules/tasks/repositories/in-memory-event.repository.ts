import { Injectable } from '@nestjs/common';
import { IEventRepository } from '../interfaces/task-repository.port';
import { AgentEvent } from '../../agent/interfaces/agent-event.types';

@Injectable()
export class InMemoryEventRepository implements IEventRepository {
  private readonly events: AgentEvent[] = [];

  async save(event: AgentEvent): Promise<AgentEvent> {
    const clone = this.clone(event);
    this.events.push(clone);
    return this.clone(clone);
  }

  async saveMany(events: AgentEvent[]): Promise<void> {
    for (const event of events) {
      await this.save(event);
    }
  }

  async findByTaskId(taskId: string): Promise<AgentEvent[]> {
    return this.events
      .filter((e) => e.taskId === taskId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .map((e) => this.clone(e));
  }

  async findMany(filter?: {
    taskId?: string;
    eventType?: AgentEvent['eventType'];
    limit?: number;
  }): Promise<AgentEvent[]> {
    let result = [...this.events];

    if (filter?.taskId) {
      result = result.filter((e) => e.taskId === filter.taskId);
    }
    if (filter?.eventType) {
      result = result.filter((e) => e.eventType === filter.eventType);
    }

    result.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    if (filter?.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }

    return result.map((e) => this.clone(e));
  }

  async countByTaskId(taskId: string): Promise<number> {
    return this.events.filter((e) => e.taskId === taskId).length;
  }

  async clear(taskId?: string): Promise<void> {
    if (taskId) {
      const remaining = this.events.filter((e) => e.taskId !== taskId);
      this.events.length = 0;
      this.events.push(...remaining);
    } else {
      this.events.length = 0;
    }
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
