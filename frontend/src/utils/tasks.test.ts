import { describe, expect, it } from 'vitest';
import type { Task } from '../types/task';
import { filterTasks, sortTasks, summarise } from './tasks';

const NOW = new Date('2026-11-01T12:00:00.000Z').getTime();

function task(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: null,
    status: 'TODO',
    dueDateTime: '2026-11-10T09:00:00.000Z',
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    ...overrides,
  };
}

const tasks: Task[] = [
  task({ id: '1', title: 'Later task', dueDateTime: '2026-11-20T09:00:00.000Z' }),
  task({
    id: '2',
    title: 'Hearing bundle',
    description: 'Courtroom 4',
    status: 'IN_PROGRESS',
    dueDateTime: '2026-11-02T09:00:00.000Z',
  }),
  task({
    id: '3',
    title: 'Done task',
    status: 'DONE',
    dueDateTime: '2026-10-20T09:00:00.000Z',
  }),
];

describe('sortTasks', () => {
  it('orders by due date without mutating the input', () => {
    const sorted = sortTasks(tasks);

    expect(sorted.map((item) => item.id)).toEqual(['3', '2', '1']);
    expect(tasks.map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('breaks ties by creation time', () => {
    const sameDue = [
      task({ id: 'b', title: 'B', createdAt: '2026-11-01T10:00:00.000Z' }),
      task({ id: 'a', title: 'A', createdAt: '2026-11-01T09:00:00.000Z' }),
    ];

    expect(sortTasks(sameDue).map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('filterTasks', () => {
  it('filters by status', () => {
    expect(filterTasks(tasks, { status: 'DONE', search: '' }).map((item) => item.id)).toEqual([
      '3',
    ]);
  });

  it('searches title and description case-insensitively', () => {
    expect(filterTasks(tasks, { status: 'ALL', search: 'COURTROOM' }).map((item) => item.id)).toEqual(
      ['2'],
    );
    expect(filterTasks(tasks, { status: 'ALL', search: 'hearing' }).map((item) => item.id)).toEqual([
      '2',
    ]);
  });

  it('combines status and search filters', () => {
    expect(filterTasks(tasks, { status: 'DONE', search: 'hearing' })).toEqual([]);
    expect(filterTasks(tasks, { status: 'ALL', search: '   ' })).toHaveLength(3);
  });
});

describe('summarise', () => {
  it('counts each status and overdue tasks', () => {
    expect(summarise(tasks, NOW)).toEqual({
      total: 3,
      todo: 1,
      inProgress: 1,
      done: 1,
      overdue: 0,
    });
  });

  it('does not count done tasks as overdue', () => {
    const summary = summarise(tasks, NOW);
    expect(summary.overdue).toBe(0);

    const withOverdue = summarise(
      [...tasks, task({ id: '4', title: 'Overdue', dueDateTime: '2026-10-01T09:00:00.000Z' })],
      NOW,
    );
    expect(withOverdue.overdue).toBe(1);
  });
});
