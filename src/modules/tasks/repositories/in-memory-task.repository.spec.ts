import { InMemoryTaskRepository } from './in-memory-task.repository';
import { TaskEntity } from '../interfaces/task.types';

describe('InMemoryTaskRepository', () => {
  let repository: InMemoryTaskRepository;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
  });

  const createTaskEntity = (
    id: string,
    goal = 'Test Goal',
    status: TaskEntity['status'] = 'queued',
  ): TaskEntity => ({
    id,
    goal,
    status,
    createdAt: new Date(Date.now() - 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('should create and retrieve a task by ID', async () => {
    const task = createTaskEntity('task_1', 'Research NestJS');
    await repository.create(task);

    const found = await repository.findById('task_1');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('task_1');
    expect(found?.goal).toBe('Research NestJS');
  });

  it('should return null when task is not found', async () => {
    const found = await repository.findById('non_existent');
    expect(found).toBeNull();
  });

  it('should update an existing task and refresh updatedAt', async () => {
    const task = createTaskEntity('task_2', 'Analyze Clean Architecture');
    await repository.create(task);

    const updated = await repository.update('task_2', {
      status: 'running',
    });

    expect(updated.status).toBe('running');
    const found = await repository.findById('task_2');
    expect(found?.status).toBe('running');
  });

  it('should filter tasks by status and text search', async () => {
    await repository.create(createTaskEntity('t1', 'Learn TypeScript', 'queued'));
    await repository.create(createTaskEntity('t2', 'Learn NestJS', 'completed'));
    await repository.create(createTaskEntity('t3', 'Build Agent', 'completed'));

    // Filter by status
    const completedTasks = await repository.findMany({ status: 'completed' });
    expect(completedTasks.total).toBe(2);
    expect(completedTasks.items.map((t) => t.id).sort()).toEqual(['t2', 't3']);

    // Filter by search term
    const learnTasks = await repository.findMany({ search: 'learn' });
    expect(learnTasks.total).toBe(2);
    expect(learnTasks.items.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('should paginate results properly', async () => {
    for (let i = 1; i <= 25; i++) {
      const task = createTaskEntity(`t_${i}`, `Goal ${i}`);
      task.createdAt = new Date(1000000000000 + i * 1000).toISOString();
      await repository.create(task);
    }

    const page1 = await repository.findMany(undefined, { page: 1, limit: 10 });
    expect(page1.items.length).toBe(10);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
    expect(page1.hasNext).toBe(true);
    expect(page1.hasPrev).toBe(false);

    const page3 = await repository.findMany(undefined, { page: 3, limit: 10 });
    expect(page3.items.length).toBe(5);
    expect(page3.hasNext).toBe(false);
    expect(page3.hasPrev).toBe(true);
  });

  it('should delete a task', async () => {
    await repository.create(createTaskEntity('t_del', 'Delete Me'));
    const deleted = await repository.delete('t_del');
    expect(deleted).toBe(true);

    const found = await repository.findById('t_del');
    expect(found).toBeNull();
  });
});
