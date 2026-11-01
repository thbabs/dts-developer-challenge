import { apiRequest } from './client';
import type { Task, TaskInput, TaskStatus } from '../types/task';

export function listTasks(): Promise<Task[]> {
  return apiRequest<Task[]>('/api/tasks');
}

export function createTask(input: TaskInput): Promise<Task> {
  return apiRequest<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  return apiRequest<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  return apiRequest<Task>(`/api/tasks/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteTask(id: string): Promise<void> {
  return apiRequest<void>(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
