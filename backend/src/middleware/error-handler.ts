import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors.js';
import { silentLogger, type Logger } from '../logger.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
};

export function createErrorHandler(logger: Logger = silentLogger): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
      return;
    }

    // Body-parser raises a SyntaxError for malformed JSON bodies.
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'The request body is not valid JSON.',
        },
      });
      return;
    }

    logger.error('Unhandled request error', {
      method: req.method,
      path: req.originalUrl,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  };
}
