import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ITaskRepository,
} from '../interfaces/task-repository.port';
import {
  TaskEntity,
  TaskFilter,
  PaginationOptions,
  PaginatedResult,
} from '../interfaces/task.types';

@Injectable()
export class InMemoryTaskRepository implements ITaskRepository {
  private readonly tasks = new Map<string, TaskEntity>();

  async create(task: TaskEntity): Promise<TaskEntity> {
    const clone = this.clone(task);
    this.tasks.set(clone.id, clone);
    return this.clone(clone);
  }

  async findById(id: string): Promise<TaskEntity | null> {
    const task = this.tasks.get(id);
    return task ? this.clone(task) : null;
  }

  async update(id: string, partial: Partial<TaskEntity>): Promise<TaskEntity> {
    const existing = this.tasks.get(id);
    if (!existing) {
      throw new NotFoundException(`Task with ID '${id}' not found`);
    }

    const updated: TaskEntity = {
      ...existing,
      ...partial,
      id: existing.id, // prevent ID change
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(id, updated);
    return this.clone(updated);
  }

  async findMany(
    filter?: TaskFilter,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<TaskEntity>> {
    let items = Array.from(this.tasks.values());

    // Apply filtering
    if (filter) {
      if (filter.status) {
        items = items.filter((t) => t.status === filter.status);
      }
      if (filter.search) {
        const query = filter.search.toLowerCase();
        items = items.filter(
          (t) =>
            t.goal.toLowerCase().includes(query) ||
            t.id.toLowerCase().includes(query),
        );
      }
      if (filter.fromDate) {
        const from = new Date(filter.fromDate).getTime();
        items = items.filter((t) => new Date(t.createdAt).getTime() >= from);
      }
      if (filter.toDate) {
        const to = new Date(filter.toDate).getTime();
        items = items.filter((t) => new Date(t.createdAt).getTime() <= to);
      }
    }

    // Default sort: newest first (createdAt descending)
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = items.length;
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.max(1, Math.min(100, pagination?.limit || 10));
    const totalPages = Math.ceil(total / limit) || 1;

    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems.map((item) => this.clone(item)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async count(filter?: TaskFilter): Promise<number> {
    const res = await this.findMany(filter);
    return res.total;
  }

  clear(): void {
    this.tasks.clear();
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
