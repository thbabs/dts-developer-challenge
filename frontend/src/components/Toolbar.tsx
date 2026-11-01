import type { StatusFilter } from '../utils/tasks';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
];

interface ToolbarProps {
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: Record<StatusFilter, number>;
  resultCount: number;
}

export function Toolbar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  counts,
  resultCount,
}: ToolbarProps) {
  return (
    <section className="toolbar" aria-label="Filter tasks">
      <div className="filter-tabs" role="group" aria-label="Filter by status">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`filter-tab ${filter === value ? 'filter-tab--active' : ''}`}
            aria-pressed={filter === value}
            onClick={() => onFilterChange(value)}
          >
            {label}
            <span className="filter-tab__count">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="search">
        <label className="visually-hidden" htmlFor="task-search">
          Search tasks
        </label>
        <span className="search__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8.5" cy="8.5" r="5.75" />
            <path d="M13 13l4.5 4.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id="task-search"
          type="search"
          className="search__input"
          placeholder="Search tasks"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search ? (
          <button
            type="button"
            className="search__clear"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null}
      </div>

      <p className="toolbar__result" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'task' : 'tasks'} shown
      </p>
    </section>
  );
}
