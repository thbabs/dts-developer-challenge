import { config } from './config.js';

const taskExample = {
  id: '3f1c2a9e-8b7d-4c6a-9e21-5d4f8b0c1a2e',
  title: 'Review case file for hearing',
  description: 'Check the bundle is complete before the 10:00 hearing.',
  status: 'TODO',
  dueDateTime: '2026-12-01T09:30:00.000Z',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
};

const taskSchema = {
  type: 'object',
  required: ['id', 'title', 'description', 'status', 'dueDateTime', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 2000, nullable: true },
    status: { $ref: '#/components/schemas/TaskStatus' },
    dueDateTime: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  example: taskExample,
} as const;

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'dueDateTime' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;

const taskIdParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'The unique identifier of the task.',
  schema: { type: 'string', format: 'uuid' },
} as const;

const taskEnvelope = {
  type: 'object',
  required: ['data'],
  properties: { data: { $ref: '#/components/schemas/Task' } },
} as const;

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'DTS Tasks API',
    version: '1.0.0',
    description:
      'REST API that lets HMCTS caseworkers create, retrieve, update and delete their tasks.',
    contact: { name: 'DTS Developer Technical Test' },
  },
  servers: [{ url: `http://localhost:${config.port}`, description: 'Local development server' }],
  tags: [{ name: 'Tasks', description: 'Caseworker task management' }],
  paths: {
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks',
        description: 'Returns every task, ordered by due date (earliest first).',
        operationId: 'listTasks',
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Only return tasks with this status.',
            schema: { $ref: '#/components/schemas/TaskStatus' },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Case-insensitive text search across the title and description.',
            schema: { type: 'string', maxLength: 100 },
          },
        ],
        responses: {
          '200': {
            description: 'A list of tasks.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                  },
                },
                example: { data: [taskExample] },
              },
            },
          },
          '400': errorResponse('The query parameters are invalid.'),
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        operationId: 'createTask',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTaskRequest' },
              example: {
                title: taskExample.title,
                description: taskExample.description,
                status: 'TODO',
                dueDateTime: taskExample.dueDateTime,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'The task was created. The Location header points at the new task.',
            headers: {
              Location: { schema: { type: 'string' }, example: '/api/tasks/3f1c2a9e' },
            },
            content: {
              'application/json': { schema: taskEnvelope, example: { data: taskExample } },
            },
          },
          '400': errorResponse('The request body failed validation.'),
        },
      },
    },
    '/api/tasks/{id}': {
      parameters: [taskIdParameter],
      get: {
        tags: ['Tasks'],
        summary: 'Retrieve a task by ID',
        operationId: 'getTask',
        responses: {
          '200': {
            description: 'The requested task.',
            content: {
              'application/json': { schema: taskEnvelope, example: { data: taskExample } },
            },
          },
          '404': errorResponse('No task exists with that ID.'),
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task',
        description: 'Updates one or more fields of an existing task. All fields are optional.',
        operationId: 'updateTask',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateTaskRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'The updated task.',
            content: {
              'application/json': { schema: taskEnvelope, example: { data: taskExample } },
            },
          },
          '400': errorResponse('The request body failed validation.'),
          '404': errorResponse('No task exists with that ID.'),
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        operationId: 'deleteTask',
        responses: {
          '204': { description: 'The task was deleted.' },
          '404': errorResponse('No task exists with that ID.'),
        },
      },
    },
    '/api/tasks/{id}/status': {
      parameters: [taskIdParameter],
      patch: {
        tags: ['Tasks'],
        summary: 'Update the status of a task',
        operationId: 'updateTaskStatus',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                additionalProperties: false,
                properties: { status: { $ref: '#/components/schemas/TaskStatus' } },
              },
              example: { status: 'IN_PROGRESS' },
            },
          },
        },
        responses: {
          '200': {
            description: 'The task with its new status.',
            content: {
              'application/json': { schema: taskEnvelope, example: { data: taskExample } },
            },
          },
          '400': errorResponse('The request body failed validation.'),
          '404': errorResponse('No task exists with that ID.'),
        },
      },
    },
  },
  components: {
    schemas: {
      TaskStatus: {
        type: 'string',
        enum: ['TODO', 'IN_PROGRESS', 'DONE'],
        example: 'TODO',
      },
      Task: taskSchema,
      CreateTaskRequest: {
        type: 'object',
        required: ['title', 'dueDateTime'],
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 2000, nullable: true },
          status: { $ref: '#/components/schemas/TaskStatus' },
          dueDateTime: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 date-time, including a timezone or UTC "Z" suffix.',
          },
        },
      },
      UpdateTaskRequest: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 2000, nullable: true },
          status: { $ref: '#/components/schemas/TaskStatus' },
          dueDateTime: { type: 'string', format: 'date-time' },
        },
      },
      Error: errorSchema,
    },
  },
} as const;
