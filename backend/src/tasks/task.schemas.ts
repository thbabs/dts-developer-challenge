import { z } from 'zod';
import { TASK_STATUSES } from './task.types.js';

export const taskStatusSchema = z.enum(TASK_STATUSES);

const isoDateTime = z
  .string({ message: 'dueDateTime is required.' })
  .datetime({
    offset: true,
    message: 'dueDateTime must be a valid ISO 8601 date-time, e.g. 2026-12-01T17:00:00Z.',
  })
  // Normalise every timestamp to UTC so sorting and comparisons are consistent.
  .transform((value) => new Date(value).toISOString());

const descriptionSchema = z
  .union([
    z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
    z.null(),
  ])
  .transform((value) => (value === null || value === '' ? null : value));

export const createTaskSchema = z
  .strictObject({
    title: z
      .string({ message: 'title is required.' })
      .trim()
      .min(1, 'title must not be empty.')
      .max(200, 'title must be 200 characters or fewer.'),
    description: descriptionSchema.optional(),
    status: taskStatusSchema.default('TODO'),
    dueDateTime: isoDateTime,
  })
  .transform((input) => ({
    ...input,
    description: input.description ?? null,
  }));

export const updateTaskSchema = z
  .strictObject({
    title: z
      .string({ message: 'title must be a string.' })
      .trim()
      .min(1, 'title must not be empty.')
      .max(200, 'title must be 200 characters or fewer.')
      .optional(),
    description: descriptionSchema.optional(),
    status: taskStatusSchema.optional(),
    dueDateTime: isoDateTime.optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  });

export const updateTaskStatusSchema = z.strictObject({
  status: taskStatusSchema,
});

export const listTasksQuerySchema = z.strictObject({
  status: taskStatusSchema.optional(),
  search: z
    .string()
    .trim()
    .max(100, 'search must be 100 characters or fewer.')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
});

export type CreateTaskPayload = z.infer<typeof createTaskSchema>;
export type UpdateTaskPayload = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
