/**
 * Seeds the SQLite database with a handful of demo tasks.
 * Usage: npm run seed
 */
import { createDatabase } from '../src/db/database.js';
import { config } from '../src/config.js';
import { TaskRepository } from '../src/tasks/task.repository.js';
import { TaskService } from '../src/tasks/task.service.js';
import type { TaskStatus } from '../src/tasks/task.types.js';

const db = createDatabase(config.databasePath);
const service = new TaskService(new TaskRepository(db));

function inDays(days: number, hour = 17): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const demoTasks: {
  title: string;
  description: string;
  status: TaskStatus;
  dueDateTime: string;
}[] = [
  {
    title: 'Review case file for hearing',
    description: 'Check the bundle is complete before the hearing on Friday.',
    status: 'IN_PROGRESS',
    dueDateTime: inDays(1, 9),
  },
  {
    title: 'Contact the appellant',
    description: 'Confirm attendance and explain the hearing format.',
    status: 'TODO',
    dueDateTime: inDays(2, 12),
  },
  {
    title: 'Upload decision notice',
    description: 'Scan and attach the signed decision notice to the case record.',
    status: 'TODO',
    dueDateTime: inDays(4, 16),
  },
  {
    title: 'Complete safeguarding check',
    description: 'Run through the safeguarding checklist and record the outcome.',
    status: 'DONE',
    dueDateTime: inDays(-1, 10),
  },
  {
    title: 'Prepare hearing notes',
    description: 'Draft the summary of issues for the panel.',
    status: 'IN_PROGRESS',
    dueDateTime: inDays(7, 11),
  },
];

for (const task of demoTasks) {
  service.create(task);
}

console.log(`Seeded ${demoTasks.length} demo tasks into ${config.databasePath}`);
db.close();
