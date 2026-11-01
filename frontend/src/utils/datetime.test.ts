import { describe, expect, it } from 'vitest';
import {
  defaultDueDate,
  formatDateTime,
  fromDateTimeLocalValue,
  isOverdue,
  toDateTimeLocalValue,
} from './datetime';

describe('formatDateTime', () => {
  it('formats an ISO timestamp for display', () => {
    const iso = new Date(2026, 11, 1, 9, 30).toISOString();
    const formatted = formatDateTime(iso);

    expect(formatted).toContain('Dec 2026');
    expect(formatted).toContain('09:30');
    expect(formatted).toContain('Tue');
  });

  it('handles an invalid date', () => {
    expect(formatDateTime('not-a-date')).toBe('Unknown date');
  });
});

describe('datetime-local conversion', () => {
  it('round-trips a UTC timestamp', () => {
    const iso = '2026-12-01T09:30:00.000Z';
    const local = toDateTimeLocalValue(iso);

    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDateTimeLocalValue(local)).toBe(iso);
  });

  it('returns an empty string for an invalid timestamp', () => {
    expect(toDateTimeLocalValue('nope')).toBe('');
  });

  it('returns null for empty or invalid local values', () => {
    expect(fromDateTimeLocalValue('')).toBeNull();
    expect(fromDateTimeLocalValue('not-a-date')).toBeNull();
  });
});

describe('defaultDueDate', () => {
  it('defaults to tomorrow at 17:00', () => {
    const now = new Date(2026, 10, 1, 10, 15);
    const value = defaultDueDate(now);

    expect(value).toBe('2026-11-02T17:00');
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-11-01T12:00:00.000Z').getTime();

  it('is true when the due date has passed and the task is not done', () => {
    expect(isOverdue('2026-11-01T11:00:00.000Z', 'TODO', now)).toBe(true);
    expect(isOverdue('2026-11-01T11:00:00.000Z', 'IN_PROGRESS', now)).toBe(true);
  });

  it('is false for done tasks and future due dates', () => {
    expect(isOverdue('2026-11-01T11:00:00.000Z', 'DONE', now)).toBe(false);
    expect(isOverdue('2026-11-02T11:00:00.000Z', 'TODO', now)).toBe(false);
  });
});
