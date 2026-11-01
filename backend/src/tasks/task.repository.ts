import type { Db } from '../db/database.js';
import type { ListTasksOptions, Task, TaskStatus, UpdateTaskInput } from './task.types.js';

export interface NewTaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDateTime: string;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date_time: string;
  created_at: string;
  updated_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDateTime: row.due_date_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TaskRepository {
  constructor(private readonly db: Db) {}

  findAll(options: ListTasksOptions = {}): Task[] {
    const conditions: string[] = [];
    const parameters: string[] = [];

    if (options.status) {
      conditions.push('status = ?');
      parameters.push(options.status);
    }

    if (options.search) {
      conditions.push("(title LIKE ? ESCAPE '\\' OR COALESCE(description, '') LIKE ? ESCAPE '\\')");
      const pattern = `%${escapeLike(options.search)}%`;
      parameters.push(pattern, pattern);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db
      .prepare(
        `SELECT id, title, description, status, due_date_time, created_at, updated_at
         FROM tasks ${where}
         ORDER BY due_date_time ASC, created_at ASC`,
      )
      .all(...parameters) as TaskRow[];

    return rows.map(toTask);
  }

  findById(id: string): Task | null {
    const row = this.db
      .prepare(
        `SELECT id, title, description, status, due_date_time, created_at, updated_at
         FROM tasks WHERE id = ?`,
      )
      .get(id) as TaskRow | undefined;

    return row ? toTask(row) : null;
  }

  create(input: NewTaskRecord, now: string): Task {
    const row: TaskRow = {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      due_date_time: input.dueDateTime,
      created_at: now,
      updated_at: now,
    };

    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, status, due_date_time, created_at, updated_at)
         VALUES (@id, @title, @description, @status, @dueDateTime, @createdAt, @updatedAt)`,
      )
      .run({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        dueDateTime: row.due_date_time,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });

    return toTask(row);
  }

  update(id: string, input: UpdateTaskInput, now: string): Task | null {
    const assignments: string[] = [];
    const parameters: (string | null)[] = [];

    if (input.title !== undefined) {
      assignments.push('title = ?');
      parameters.push(input.title);
    }
    if (input.description !== undefined) {
      assignments.push('description = ?');
      parameters.push(input.description);
    }
    if (input.status !== undefined) {
      assignments.push('status = ?');
      parameters.push(input.status);
    }
    if (input.dueDateTime !== undefined) {
      assignments.push('due_date_time = ?');
      parameters.push(input.dueDateTime);
    }

    if (assignments.length === 0) {
      return this.findById(id);
    }

    assignments.push('updated_at = ?');
    parameters.push(now, id);

    const result = this.db
      .prepare(`UPDATE tasks SET ${assignments.join(', ')} WHERE id = ?`)
      .run(...parameters);

    return result.changes === 0 ? null : this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

/** Escapes LIKE wildcards so a search for "100%" is treated literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
