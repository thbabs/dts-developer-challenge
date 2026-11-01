import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, getErrorMessage } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('unwraps the data envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: '1' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/tasks')).resolves.toEqual([{ id: '1' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/tasks',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    );
  });

  it('sends JSON content type when there is a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'x' }) });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/tasks',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null, 204)));

    await expect(apiRequest('/api/tasks/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('turns API errors into ApiError instances', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'The request body contains invalid data.',
              details: [{ field: 'title', message: 'title must not be empty.' }],
            },
          },
          400,
        ),
      ),
    );

    const error = await apiRequest('/api/tasks', { method: 'POST' }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The request body contains invalid data.',
      details: [{ field: 'title', message: 'title must not be empty.' }],
    });
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json');
        },
      } as unknown as Response),
    );

    await expect(apiRequest('/api/tasks')).rejects.toMatchObject({
      status: 502,
      message: 'The request failed (HTTP 502).',
    });
  });

  it('reports network failures with a helpful message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/api/tasks')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('Unable to reach the tasks service'),
    });
  });
});

describe('getErrorMessage', () => {
  it('extracts a message from errors', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage(new ApiError(500, 'server error'))).toBe('server error');
    expect(getErrorMessage('nope')).toBe('Something went wrong. Please try again.');
  });
});
