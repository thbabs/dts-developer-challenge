import type { TaskSummary } from '../utils/tasks';

const CARDS: { key: keyof TaskSummary; label: string; tone: string }[] = [
  { key: 'todo', label: 'To do', tone: 'neutral' },
  { key: 'inProgress', label: 'In progress', tone: 'amber' },
  { key: 'done', label: 'Done', tone: 'green' },
  { key: 'overdue', label: 'Overdue', tone: 'red' },
];

export function SummaryCards({ summary }: { summary: TaskSummary }) {
  return (
    <section className="summary" aria-label="Task summary">
      {CARDS.map(({ key, label, tone }) => (
        <div key={key} className={`summary-card summary-card--${tone}`}>
          <span className="summary-card__value">{summary[key]}</span>
          <span className="summary-card__label">{label}</span>
        </div>
      ))}
    </section>
  );
}
