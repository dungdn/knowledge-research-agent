export interface AgentEvent {
  id: string;
  taskId: string;
  iteration: number;
  eventType:
    | 'task.started'
    | 'task.completed'
    | 'task.failed'
    | 'iteration.started'
    | 'iteration.completed'
    | 'llm.requested'
    | 'llm.responded'
    | 'decision.made'
    | 'tool.dispatched'
    | 'tool.observed'
    | 'budget.exhausted'
    | 'loop.no_progress';
  timestamp: string;
  payload: Record<string, unknown>;
}
