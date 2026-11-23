import { Injectable, Logger } from '@nestjs/common';
import { AgentEvent } from '../interfaces/agent-event.types';

@Injectable()
export class EventRecorder {
  private readonly logger = new Logger(EventRecorder.name);
  private readonly eventsByTask = new Map<string, AgentEvent[]>();

  record(
    taskId: string,
    iteration: number,
    eventType: AgentEvent['eventType'],
    payload: Record<string, unknown> = {},
  ): AgentEvent {
    const event: AgentEvent = {
      id: `${taskId}_ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      taskId,
      iteration,
      eventType,
      timestamp: new Date().toISOString(),
      payload,
    };

    if (!this.eventsByTask.has(taskId)) {
      this.eventsByTask.set(taskId, []);
    }
    this.eventsByTask.get(taskId)!.push(event);

    this.logger.debug(
      `[Task ${taskId}][Iter ${iteration}][${eventType}] ${JSON.stringify(payload)}`,
    );

    return event;
  }

  getEvents(taskId: string): AgentEvent[] {
    return this.eventsByTask.get(taskId) || [];
  }

  clear(taskId?: string): void {
    if (taskId) {
      this.eventsByTask.delete(taskId);
    } else {
      this.eventsByTask.clear();
    }
  }
}
