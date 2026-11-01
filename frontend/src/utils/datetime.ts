const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const pad = (value: number) => String(value).padStart(2, '0');

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

/** Converts an ISO timestamp to the value format used by <input type="datetime-local">. */
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T');
}

/** Converts a datetime-local value to an ISO string, or null when unparseable. */
export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Tomorrow at 17:00 local time — a helpful default for new tasks. */
export function defaultDueDate(now = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return toDateTimeLocalValue(date.toISOString());
}

export function isOverdue(iso: string, status: string, now = Date.now()): boolean {
  if (status === 'DONE') {
    return false;
  }
  const due = new Date(iso).getTime();
  return !Number.isNaN(due) && due < now;
}
