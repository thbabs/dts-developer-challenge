import { isOverdue } from './datetime';
import type { Task, TaskStatus } from '../types/task';

export type StatusFilter = 'ALL' | TaskStatus;

export interface TaskFilters {
  status: StatusFilter;
  search: string;
}

/** Soonest due first; ties broken by creation time so the order is stable. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const byDue = a.dueDateTime.localeCompare(b.dueDateTime);
    return byDue !== 0 ? byDue : a.createdAt.localeCompare(b.createdAt);
  });
}

export function filterTasks(tasks: Task[], { status, search }: TaskFilters): Task[] {
  const term = search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (status !== 'ALL' && task.status !== status) {
      return false;
    }
    if (!term) {
      return true;
    }
    return (
      task.title.toLowerCase().includes(term) ||
      (task.description ?? '').toLowerCase().includes(term)
    );
  });
}

export interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export function summarise(tasks: Task[], now = Date.now()): TaskSummary {
  return tasks.reduce<TaskSummary>(
    (summary, task) => {
      summary.total += 1;
      if (task.status === 'TODO') {
        summary.todo += 1;
      }
      if (task.status === 'IN_PROGRESS') {
        summary.inProgress += 1;
      }
      if (task.status === 'DONE') {
        summary.done += 1;
      }
      if (isOverdue(task.dueDateTime, task.status, now)) {
        summary.overdue += 1;
      }
      return summary;
    },
    { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 },
  );
}
