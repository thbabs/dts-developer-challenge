import { Router, type Request } from 'express';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './task.schemas.js';
import type { CreateTaskPayload, ListTasksQuery, UpdateTaskPayload } from './task.schemas.js';
import type { TaskService } from './task.service.js';
import type { TaskStatus } from './task.types.js';

/** Express 5 types route params as possibly undefined; the route pattern guarantees this one. */
function taskId(req: Request): string {
  return req.params.id as string;
}

export function createTaskRouter(service: TaskService): Router {
  const router = Router();

  // GET /api/tasks
  router.get('/', validateQuery(listTasksQuerySchema), (_req, res) => {
    const query = res.locals.query as ListTasksQuery;
    const tasks = service.list(query);
    res.status(200).json({ data: tasks });
  });

  // POST /api/tasks
  router.post('/', validateBody(createTaskSchema), (req, res) => {
    const task = service.create(req.body as CreateTaskPayload);
    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  // GET /api/tasks/:id
  router.get('/:id', (req, res) => {
    const task = service.get(taskId(req));
    res.status(200).json({ data: task });
  });

  // PATCH /api/tasks/:id
  router.patch('/:id', validateBody(updateTaskSchema), (req, res) => {
    const task = service.update(taskId(req), req.body as UpdateTaskPayload);
    res.status(200).json({ data: task });
  });

  // PATCH /api/tasks/:id/status
  router.patch('/:id/status', validateBody(updateTaskStatusSchema), (req, res) => {
    const { status } = req.body as { status: TaskStatus };
    const task = service.updateStatus(taskId(req), status);
    res.status(200).json({ data: task });
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', (req, res) => {
    service.delete(taskId(req));
    res.status(204).send();
  });

  return router;
}
