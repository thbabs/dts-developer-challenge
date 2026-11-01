import type { RequestHandler } from 'express';
import type { ZodIssue, ZodType } from 'zod';
import { ValidationError, type FieldIssue } from '../errors.js';

function issuesFrom(error: { issues: ZodIssue[] }): FieldIssue[] {
  return error.issues.flatMap((issue): FieldIssue[] => {
    // Zod reports unknown fields once, with no path of their own.
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({
        field: key,
        message: `Unknown field "${key}".`,
      }));
    }

    return [
      {
        field: issue.path.map(String).join('.') || 'body',
        message: issue.message,
      },
    ];
  });
}

/** Validates and replaces `req.body` with the parsed payload. */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError(issuesFrom(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates `req.query` and exposes the parsed value on `res.locals.query`.
 * Express 5 defines `req.query` as a read-only getter, so we don't reassign it.
 */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ValidationError(issuesFrom(result.error)));
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
