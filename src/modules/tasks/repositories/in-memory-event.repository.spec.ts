import { InMemoryEventRepository } from './in-memory-event.repository';
import { AgentEvent } from '../../agent/interfaces/agent-event.types';

describe('InMemoryEventRepository', () => {
  let repository: InMemoryEventRepository;

  beforeEach(() => {
    repository = new InMemoryEventRepository();
  });

  const createEvent = (
    taskId: string,
    eventType: AgentEvent['eventType'],
    iteration = 1,
  ): AgentEvent => ({
    id: `ev_${Date.now()}_${Math.random()}`,
    taskId,
    iteration,
    eventType,
    timestamp: new Date().toISOString(),
    payload: { info: 'test' },
  });

  it('should save and retrieve events for a task', async () => {
    await repository.save(createEvent('task_1', 'task.started'));
    await repository.save(createEvent('task_1', 'step.started'));
    await repository.save(createEvent('task_2', 'task.started'));

    const task1Events = await repository.findByTaskId('task_1');
    expect(task1Events.length).toBe(2);
    expect(task1Events[0].eventType).toBe('task.started');
    expect(task1Events[1].eventType).toBe('step.started');
  });

  it('should save batch events with saveMany', async () => {
    const events = [
      createEvent('task_batch', 'plan.created'),
      createEvent('task_batch', 'step.started'),
      createEvent('task_batch', 'step.completed'),
    ];

    await repository.saveMany(events);
    const count = await repository.countByTaskId('task_batch');
    expect(count).toBe(3);
  });

  it('should filter events by eventType', async () => {
    await repository.save(createEvent('task_f', 'step.started'));
    await repository.save(createEvent('task_f', 'step.failed'));
    await repository.save(createEvent('task_f', 'step.started'));

    const failedEvents = await repository.findMany({
      taskId: 'task_f',
      eventType: 'step.failed',
    });
    expect(failedEvents.length).toBe(1);
    expect(failedEvents[0].eventType).toBe('step.failed');
  });

  it('should clear events for a specific task', async () => {
    await repository.save(createEvent('t_clear_1', 'task.started'));
    await repository.save(createEvent('t_clear_2', 'task.started'));

    await repository.clear('t_clear_1');
    expect(await repository.countByTaskId('t_clear_1')).toBe(0);
    expect(await repository.countByTaskId('t_clear_2')).toBe(1);
  });
});
