export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

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

export interface TaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDateTime: string;
}

export interface FieldIssue {
  field: string;
  message: string;
}
