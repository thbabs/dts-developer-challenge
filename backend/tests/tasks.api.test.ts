import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDatabase, type Db } from '../src/db/database.js';
import { silentLogger } from '../src/logger.js';

describe('Tasks API', () => {
  let db: Db;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    app = createApp({ db, logger: silentLogger });
  });

  afterEach(() => {
    db.close();
  });

  const validBody = {
    title: 'Review case file',
    description: 'Check the bundle is complete',
    dueDateTime: '2026-12-01T09:30:00Z',
  };

  async function createTask(overrides: Record<string, unknown> = {}) {
    const response = await request(app)
      .post('/api/tasks')
      .send({ ...validBody, ...overrides })
      .expect(201);
    return response.body.data;
  }

  describe('POST /api/tasks', () => {
    it('creates a task and returns 201 with a Location header', async () => {
      const response = await request(app).post('/api/tasks').send(validBody).expect(201);

      expect(response.headers.location).toBe(`/api/tasks/${response.body.data.id}`);
      expect(response.body.data).toMatchObject({
        title: validBody.title,
        description: validBody.description,
        status: 'TODO',
        dueDateTime: '2026-12-01T09:30:00.000Z',
      });
    });

    it('defaults the status to TODO when omitted', async () => {
      const task = await createTask();
      expect(task.status).toBe('TODO');
    });

    it('accepts an explicit status and a null description', async () => {
      const task = await createTask({ status: 'DONE', description: null });
      expect(task.status).toBe('DONE');
      expect(task.description).toBeNull();
    });

    it.each([
      ['a missing title', { title: undefined }, 'title'],
      ['a blank title', { title: '   ' }, 'title'],
      ['a title over 200 characters', { title: 'a'.repeat(201) }, 'title'],
      ['an invalid status', { status: 'BLOCKED' }, 'status'],
      ['a due date without a timezone', { dueDateTime: '2026-12-01T09:30' }, 'dueDateTime'],
      ['an invalid due date', { dueDateTime: 'not-a-date' }, 'dueDateTime'],
      ['an unknown field', { priority: 'high' }, 'priority'],
    ])('rejects %s with 400', async (_label, override, expectedField) => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ ...validBody, ...override })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: expectedField })]),
      );
    });

    it('rejects malformed JSON with 400', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title": "oops"')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('rejects a missing request body with 400', async () => {
      const response = await request(app).post('/api/tasks').send().expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/tasks', () => {
    it('returns an empty list when there are no tasks', async () => {
      const response = await request(app).get('/api/tasks').expect(200);
      expect(response.body).toEqual({ data: [] });
    });

    it('returns every task ordered by due date', async () => {
      await createTask({ title: 'Later', dueDateTime: '2026-12-05T09:00:00Z' });
      await createTask({ title: 'Sooner', dueDateTime: '2026-12-02T09:00:00Z' });

      const response = await request(app).get('/api/tasks').expect(200);
      expect(response.body.data.map((task: { title: string }) => task.title)).toEqual([
        'Sooner',
        'Later',
      ]);
    });

    it('filters by status', async () => {
      await createTask({ title: 'Todo task' });
      await createTask({ title: 'Done task', status: 'DONE' });

      const response = await request(app).get('/api/tasks?status=DONE').expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Done task');
    });

    it('searches titles and descriptions', async () => {
      await createTask({ title: 'Hearing bundle', description: 'Courtroom 4' });
      await createTask({ title: 'Something else', description: 'No match here' });

      const byDescription = await request(app).get('/api/tasks?search=courtroom').expect(200);
      expect(byDescription.body.data).toHaveLength(1);

      const byTitle = await request(app).get('/api/tasks?search=HEARING').expect(200);
      expect(byTitle.body.data).toHaveLength(1);
    });

    it('rejects an invalid status filter with 400', async () => {
      const response = await request(app).get('/api/tasks?status=BLOCKED').expect(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'status' })]),
      );
    });

    it('rejects an unknown query parameter with 400', async () => {
      await request(app).get('/api/tasks?sort=title').expect(400);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('returns the task', async () => {
      const task = await createTask();
      const response = await request(app).get(`/api/tasks/${task.id}`).expect(200);
      expect(response.body.data).toEqual(task);
    });

    it('returns 404 for an unknown id', async () => {
      const response = await request(app).get('/api/tasks/does-not-exist').expect(404);
      expect(response.body.error).toMatchObject({
        code: 'TASK_NOT_FOUND',
        message: expect.stringContaining('does-not-exist'),
      });
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('updates the supplied fields', async () => {
      const task = await createTask();

      const response = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .send({ title: 'Updated title', status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: task.id,
        title: 'Updated title',
        status: 'IN_PROGRESS',
        description: task.description,
        dueDateTime: task.dueDateTime,
      });
      expect(Date.parse(response.body.data.updatedAt)).toBeGreaterThanOrEqual(
        Date.parse(task.updatedAt),
      );
    });

    it('can clear the description', async () => {
      const task = await createTask();
      const response = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .send({ description: null })
        .expect(200);

      expect(response.body.data.description).toBeNull();
    });

    it('rejects an empty body with 400', async () => {
      const task = await createTask();
      const response = await request(app).patch(`/api/tasks/${task.id}`).send({}).expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for an unknown id', async () => {
      await request(app).patch('/api/tasks/nope').send({ title: 'x' }).expect(404);
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    it('updates the status', async () => {
      const task = await createTask();
      const response = await request(app)
        .patch(`/api/tasks/${task.id}/status`)
        .send({ status: 'DONE' })
        .expect(200);

      expect(response.body.data.status).toBe('DONE');
    });

    it('rejects an invalid status with 400', async () => {
      const task = await createTask();
      const response = await request(app)
        .patch(`/api/tasks/${task.id}/status`)
        .send({ status: 'NOPE' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for an unknown id', async () => {
      await request(app).patch('/api/tasks/nope/status').send({ status: 'DONE' }).expect(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes the task and returns 204', async () => {
      const task = await createTask();

      await request(app).delete(`/api/tasks/${task.id}`).expect(204);
      await request(app).get(`/api/tasks/${task.id}`).expect(404);
    });

    it('returns 404 for an unknown id', async () => {
      await request(app).delete('/api/tasks/nope').expect(404);
    });
  });

  describe('health and documentation', () => {
    it('reports health', async () => {
      const response = await request(app).get('/health').expect(200);
      expect(response.body).toMatchObject({ status: 'ok', database: 'ok' });
    });

    it('serves the OpenAPI document', async () => {
      const response = await request(app).get('/openapi.json').expect(200);
      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.paths['/api/tasks']).toBeDefined();
    });

    it('serves the Swagger UI', async () => {
      const response = await request(app).get('/docs/').expect(200);
      expect(response.text).toContain('swagger');
    });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/nope').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
