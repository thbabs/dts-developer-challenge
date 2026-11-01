import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Task } from './types/task';

const NOW = '2026-11-01T09:00:00.000Z';

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: null,
    status: 'TODO',
    dueDateTime: '2030-01-10T10:00:00.000Z',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const todoTask = makeTask({
  id: 'task-1',
  title: 'Review case file',
  description: 'Check the bundle is complete',
  status: 'TODO',
  dueDateTime: '2030-01-10T10:00:00.000Z',
});

const inProgressTask = makeTask({
  id: 'task-2',
  title: 'Prepare hearing notes',
  status: 'IN_PROGRESS',
  dueDateTime: '2030-01-05T10:00:00.000Z',
});

const doneTask = makeTask({
  id: 'task-3',
  title: 'Send decision notice',
  status: 'DONE',
  dueDateTime: '2029-12-01T10:00:00.000Z',
});

interface ApiCall {
  method: string;
  path: string;
  body?: Record<string, unknown>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function installFakeApi(
  initialTasks: Task[],
  { failFirstLoad = false, failStatusUpdate = false } = {},
) {
  const tasks = initialTasks.map((task) => ({ ...task }));
  const calls: ApiCall[] = [];
  let shouldFail = failFirstLoad;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ method, path: url.pathname, ...(body ? { body } : {}) });

    if (method === 'GET' && url.pathname === '/api/tasks') {
      if (shouldFail) {
        shouldFail = false;
        throw new TypeError('Failed to fetch');
      }
      return jsonResponse({ data: tasks });
    }

    if (method === 'POST' && url.pathname === '/api/tasks') {
      const created: Task = {
        id: `task-${tasks.length + 1}`,
        title: String(body?.title),
        description: (body?.description as string | null) ?? null,
        status: body?.status as Task['status'],
        dueDateTime: String(body?.dueDateTime),
        createdAt: NOW,
        updatedAt: NOW,
      };
      tasks.push(created);
      return jsonResponse({ data: created }, 201);
    }

    const statusMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      if (failStatusUpdate) {
        return jsonResponse({ error: { message: 'The status could not be updated.' } }, 500);
      }
      const task = tasks.find((item) => item.id === statusMatch[1]);
      if (!task) {
        return jsonResponse({ error: { message: 'Not found' } }, 404);
      }
      task.status = body?.status as Task['status'];
      task.updatedAt = NOW;
      return jsonResponse({ data: { ...task } });
    }

    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (method === 'PATCH' && taskMatch) {
      const task = tasks.find((item) => item.id === taskMatch[1]);
      if (!task) {
        return jsonResponse({ error: { message: 'Not found' } }, 404);
      }
      Object.assign(task, body, { updatedAt: NOW });
      return jsonResponse({ data: { ...task } });
    }

    if (method === 'DELETE' && taskMatch) {
      const index = tasks.findIndex((item) => item.id === taskMatch[1]);
      if (index >= 0) {
        tasks.splice(index, 1);
      }
      return jsonResponse(null, 204);
    }

    return jsonResponse({ error: { message: 'Not found' } }, 404);
  });

  vi.stubGlobal('fetch', fetchMock);
  return { tasks, calls, fetchMock };
}

function summaryCard(label: string): HTMLElement {
  const summary = screen.getByRole('region', { name: 'Task summary' });
  const card = within(summary).getByText(label).closest('.summary-card');
  if (!(card instanceof HTMLElement)) {
    throw new Error(`Summary card not found for ${label}`);
  }
  return card;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('loads tasks and shows a summary', async () => {
    const { calls } = installFakeApi([todoTask, inProgressTask, doneTask]);
    render(<App />);

    expect(screen.getByRole('heading', { name: 'My tasks' })).toBeInTheDocument();
    expect(await screen.findByText('Review case file')).toBeInTheDocument();
    expect(screen.getByText('Prepare hearing notes')).toBeInTheDocument();
    expect(screen.getByText('Send decision notice')).toBeInTheDocument();

    expect(summaryCard('To do')).toHaveTextContent('1');
    expect(summaryCard('In progress')).toHaveTextContent('1');
    expect(summaryCard('Done')).toHaveTextContent('1');
    expect(summaryCard('Overdue')).toHaveTextContent('0');

    expect(calls.filter((call) => call.method === 'GET')).toHaveLength(1);
  });

  it('filters tasks by status and search term', async () => {
    const user = userEvent.setup();
    installFakeApi([todoTask, inProgressTask, doneTask]);
    render(<App />);
    await screen.findByText('Review case file');

    await user.click(screen.getByRole('button', { name: /^Done/ }));

    expect(screen.getByText('Send decision notice')).toBeInTheDocument();
    expect(screen.queryByText('Review case file')).not.toBeInTheDocument();
    expect(screen.queryByText('Prepare hearing notes')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^All/ }));
    await user.type(screen.getByLabelText('Search tasks'), 'hearing');

    expect(screen.getByText('Prepare hearing notes')).toBeInTheDocument();
    expect(screen.queryByText('Review case file')).not.toBeInTheDocument();
    expect(screen.queryByText('Send decision notice')).not.toBeInTheDocument();
  });

  it('updates a task status and reflects it in the summary', async () => {
    const user = userEvent.setup();
    const { calls } = installFakeApi([todoTask, inProgressTask, doneTask]);
    render(<App />);
    await screen.findByText('Review case file');

    const article = screen.getByRole('article', { name: /Review case file/ });
    await user.selectOptions(within(article).getByLabelText('Status'), 'DONE');

    await waitFor(() => {
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/api/tasks/task-1/status',
        body: { status: 'DONE' },
      });
    });

    await waitFor(() => {
      expect(within(article).getByLabelText('Status')).toHaveValue('DONE');
    });
    expect(summaryCard('Done')).toHaveTextContent('2');
  });

  it('creates a task through the dialog', async () => {
    const user = userEvent.setup();
    const { calls } = installFakeApi([todoTask]);
    render(<App />);
    await screen.findByText('Review case file');

    await user.click(screen.getByRole('button', { name: /Create task/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Create a task' });

    await user.type(within(dialog).getByLabelText(/^title/i), 'New hearing prep');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText('New hearing prep')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(calls).toContainEqual(
      expect.objectContaining({
        method: 'POST',
        path: '/api/tasks',
        body: expect.objectContaining({
          title: 'New hearing prep',
          status: 'TODO',
          description: null,
        }),
      }),
    );
  });

  it('shows a dismissible banner when a status update fails', async () => {
    const user = userEvent.setup();
    installFakeApi([todoTask], { failStatusUpdate: true });
    render(<App />);
    await screen.findByText('Review case file');

    const article = screen.getByRole('article', { name: /Review case file/ });
    await user.selectOptions(within(article).getByLabelText('Status'), 'DONE');

    expect(await screen.findByText('The status could not be updated.')).toBeInTheDocument();
    expect(within(article).getByLabelText('Status')).toHaveValue('TODO');

    await user.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(screen.queryByText('The status could not be updated.')).not.toBeInTheDocument();
  });

  it('deletes a task after confirmation', async () => {
    const user = userEvent.setup();
    const { calls } = installFakeApi([todoTask, doneTask]);
    render(<App />);
    await screen.findByText('Review case file');

    const article = screen.getByRole('article', { name: /Review case file/ });
    await user.click(within(article).getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this task?' });
    expect(within(dialog).getByText(/Review case file/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete task' }));

    await waitFor(() => {
      expect(screen.queryByText('Review case file')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Send decision notice')).toBeInTheDocument();
    expect(calls).toContainEqual({ method: 'DELETE', path: '/api/tasks/task-1' });
  });

  it('shows an error when loading fails and retries', async () => {
    const user = userEvent.setup();
    installFakeApi([todoTask], { failFirstLoad: true });
    render(<App />);

    expect(await screen.findByText(/Unable to reach the tasks service/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('There is a problem');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Review case file')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no tasks', async () => {
    installFakeApi([]);
    render(<App />);

    expect(await screen.findByText('You have no tasks yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a task' })).toBeInTheDocument();
  });

  it('shows a no-results state for filters that match nothing', async () => {
    const user = userEvent.setup();
    installFakeApi([doneTask]);
    render(<App />);
    await screen.findByText('Send decision notice');

    await user.type(screen.getByLabelText('Search tasks'), 'no such task');

    expect(await screen.findByText('No tasks match your filters')).toBeInTheDocument();
  });
});
