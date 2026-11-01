export interface FieldIssue {
  field: string;
  message: string;
}

/** Base class for errors that map to a known HTTP response. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details: FieldIssue[]) {
    super(400, 'VALIDATION_ERROR', 'The request body contains invalid data.', details);
  }
}

export class TaskNotFoundError extends AppError {
  constructor(id: string) {
    super(404, 'TASK_NOT_FOUND', `No task was found with id "${id}".`);
  }
}
