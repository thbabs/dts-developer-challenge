import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type Db } from '../src/db/database.js';
import { TaskNotFoundError } from '../src/errors.js';
import { TaskRepository } from '../src/tasks/task.repository.js';
import { TaskService } from '../src/tasks/task.service.js';

describe('TaskService', () => {
  let db: Db;
  let service: TaskService;

  beforeEach(() => {
    db = createDatabase(':memory:');
    service = new TaskService(new TaskRepository(db));
  });

  afterEach(() => {
    db.close();
  });

  const baseTask = {
    title: 'Review case file',
    dueDateTime: '2026-12-01T09:00:00.000Z',
  };

  describe('create', () => {
    it('creates a task with sensible defaults', () => {
      const task = service.create(baseTask);

      expect(task).toMatchObject({
        ...baseTask,
        description: null,
        status: 'TODO',
      });
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(task.createdAt).toBe(task.updatedAt);
      expect(Date.parse(task.createdAt)).not.toBeNaN();
    });

    it('stores a description and an explicit status', () => {
      const task = service.create({
        ...baseTask,
        description: 'Check the bundle is complete',
        status: 'IN_PROGRESS',
      });

      expect(task.description).toBe('Check the bundle is complete');
      expect(task.status).toBe('IN_PROGRESS');
    });
  });

  describe('list', () => {
    beforeEach(() => {
      service.create({ ...baseTask, title: 'Third', dueDateTime: '2026-12-03T09:00:00.000Z' });
      service.create({
        ...baseTask,
        title: 'First',
        dueDateTime: '2026-12-01T09:00:00.000Z',
        status: 'DONE',
      });
      service.create({
        ...baseTask,
        title: 'Second',
        description: 'Hearing bundle',
        dueDateTime: '2026-12-02T09:00:00.000Z',
      });
    });

    it('returns tasks sorted by due date ascending', () => {
      expect(service.list().map((task) => task.title)).toEqual(['First', 'Second', 'Third']);
    });

    it('filters by status', () => {
      const done = service.list({ status: 'DONE' });
      expect(done).toHaveLength(1);
      expect(done[0]?.title).toBe('First');
    });

    it('searches title and description case-insensitively', () => {
      expect(service.list({ search: 'BUNDLE' }).map((task) => task.title)).toEqual(['Second']);
      expect(service.list({ search: 'third' }).map((task) => task.title)).toEqual(['Third']);
    });

    it('treats LIKE wildcards as literal characters', () => {
      service.create({ ...baseTask, title: 'Report 100% complete' });

      expect(service.list({ search: '100%' }).map((task) => task.title)).toEqual([
        'Report 100% complete',
      ]);
      expect(service.list({ search: '100_' })).toHaveLength(0);
    });
  });

  describe('get', () => {
    it('returns the task with the requested id', () => {
      const created = service.create(baseTask);
      expect(service.get(created.id)).toEqual(created);
    });

    it('throws TaskNotFoundError for an unknown id', () => {
      expect(() => service.get('missing')).toThrow(TaskNotFoundError);
    });
  });

  describe('update', () => {
    it('updates only the supplied fields and refreshes updatedAt', async () => {
      const created = service.create(baseTask);
      await new Promise((resolve) => setTimeout(resolve, 5));

      const updated = service.update(created.id, { title: 'Updated title', status: 'DONE' });

      expect(updated.title).toBe('Updated title');
      expect(updated.status).toBe('DONE');
      expect(updated.description).toBeNull();
      expect(updated.dueDateTime).toBe(created.dueDateTime);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(created.updatedAt));
    });

    it('can clear a description', () => {
      const created = service.create({ ...baseTask, description: 'Some detail' });
      const updated = service.update(created.id, { description: null });

      expect(updated.description).toBeNull();
    });

    it('updates status through updateStatus', () => {
      const created = service.create(baseTask);
      expect(service.updateStatus(created.id, 'IN_PROGRESS').status).toBe('IN_PROGRESS');
    });

    it('throws TaskNotFoundError for an unknown id', () => {
      expect(() => service.update('missing', { title: 'x' })).toThrow(TaskNotFoundError);
      expect(() => service.updateStatus('missing', 'DONE')).toThrow(TaskNotFoundError);
    });
  });

  describe('delete', () => {
    it('removes an existing task', () => {
      const created = service.create(baseTask);

      service.delete(created.id);

      expect(() => service.get(created.id)).toThrow(TaskNotFoundError);
    });

    it('throws TaskNotFoundError for an unknown id', () => {
      expect(() => service.delete('missing')).toThrow(TaskNotFoundError);
    });
  });
});
