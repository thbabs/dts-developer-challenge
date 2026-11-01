import type { FieldIssue } from '../types/task';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: FieldIssue[];
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: FieldIssue[];

  constructor(status: number, message: string, details: FieldIssue[] = [], code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

interface RequestOptions extends RequestInit {
  body?: string;
}

/**
 * Thin fetch wrapper that unwraps the API's `{ data }` envelope and turns
 * error responses into ApiError instances.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      'Unable to reach the tasks service. Check that the API is running and try again.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | (ApiErrorBody & { data?: unknown })
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.message ?? `The request failed (HTTP ${response.status}).`,
      payload?.error?.details ?? [],
      payload?.error?.code,
    );
  }

  return payload?.data as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
