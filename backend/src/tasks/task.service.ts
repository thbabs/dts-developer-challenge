import { randomUUID } from 'node:crypto';
import { TaskNotFoundError } from '../errors.js';
import type { TaskRepository } from './task.repository.js';
import type {
  CreateTaskInput,
  ListTasksOptions,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from './task.types.js';

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  list(options: ListTasksOptions = {}): Task[] {
    return this.repository.findAll(options);
  }

  get(id: string): Task {
    const task = this.repository.findById(id);
    if (!task) {
      throw new TaskNotFoundError(id);
    }
    return task;
  }

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    return this.repository.create(
      {
        id: randomUUID(),
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'TODO',
        dueDateTime: input.dueDateTime,
      },
      now,
    );
  }

  update(id: string, input: UpdateTaskInput): Task {
    // Distinguish "task does not exist" (404) from "nothing to update".
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new TaskNotFoundError(id);
    }

    const updated = this.repository.update(id, input, new Date().toISOString());
    if (!updated) {
      throw new TaskNotFoundError(id);
    }
    return updated;
  }

  updateStatus(id: string, status: TaskStatus): Task {
    return this.update(id, { status });
  }

  delete(id: string): void {
    const deleted = this.repository.delete(id);
    if (!deleted) {
      throw new TaskNotFoundError(id);
    }
  }
}
