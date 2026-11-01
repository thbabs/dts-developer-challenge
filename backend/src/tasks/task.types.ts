export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  /** ISO 8601 timestamp in UTC. */
  dueDateTime: string;
  /** ISO 8601 timestamp in UTC. */
  createdAt: string;
  /** ISO 8601 timestamp in UTC. */
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  dueDateTime: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  dueDateTime?: string;
}

export interface ListTasksOptions {
  status?: TaskStatus;
  search?: string;
}
