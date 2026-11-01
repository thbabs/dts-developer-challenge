import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client';
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  updateTaskStatus,
} from '../api/tasks';
import type { Task, TaskInput, TaskStatus } from '../types/task';
import { sortTasks } from '../utils/tasks';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface UseTasksResult {
  tasks: Task[];
  status: LoadStatus;
  error: string | null;
  reload: () => Promise<void>;
  create: (input: TaskInput) => Promise<Task>;
  update: (id: string, input: Partial<TaskInput>) => Promise<Task>;
  changeStatus: (id: string, status: TaskStatus) => Promise<Task>;
  remove: (id: string) => Promise<void>;
}

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setTasks(sortTasks(await listTasks()));
      setStatus('ready');
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(async (input: TaskInput) => {
    const task = await createTask(input);
    setTasks((current) => sortTasks([...current, task]));
    return task;
  }, []);

  const update = useCallback(async (id: string, input: Partial<TaskInput>) => {
    const task = await updateTask(id, input);
    setTasks((current) => sortTasks(current.map((item) => (item.id === id ? task : item))));
    return task;
  }, []);

  const changeStatus = useCallback(async (id: string, nextStatus: TaskStatus) => {
    const task = await updateTaskStatus(id, nextStatus);
    setTasks((current) => sortTasks(current.map((item) => (item.id === id ? task : item))));
    return task;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks((current) => current.filter((item) => item.id !== id));
  }, []);

  return { tasks, status, error, reload, create, update, changeStatus, remove };
}
