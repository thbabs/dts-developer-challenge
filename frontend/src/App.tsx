import { useMemo, useState } from 'react';
import { getErrorMessage } from './api/client';
import { DeleteTaskDialog } from './components/DeleteTaskDialog';
import { ErrorBanner } from './components/ErrorBanner';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { TaskFormDialog } from './components/TaskFormDialog';
import { TaskList } from './components/TaskList';
import { Toolbar } from './components/Toolbar';
import { useTasks } from './hooks/useTasks';
import type { Task, TaskInput, TaskStatus } from './types/task';
import { filterTasks, summarise, type StatusFilter } from './utils/tasks';

type DialogState = { mode: 'create' } | { mode: 'edit'; task: Task };

export default function App() {
  const { tasks, status, error, reload, create, update, changeStatus, remove } = useTasks();

  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const summary = useMemo(() => summarise(tasks), [tasks]);
  const visibleTasks = useMemo(
    () => filterTasks(tasks, { status: filter, search }),
    [tasks, filter, search],
  );

  const counts: Record<StatusFilter, number> = {
    ALL: summary.total,
    TODO: summary.todo,
    IN_PROGRESS: summary.inProgress,
    DONE: summary.done,
  };

  async function handleSave(input: TaskInput) {
    if (dialog?.mode === 'edit') {
      await update(dialog.task.id, input);
    } else {
      await create(input);
    }
    setActionError(null);
    setDialog(null);
  }

  async function handleStatusChange(task: Task, nextStatus: TaskStatus) {
    setActionError(null);
    try {
      await changeStatus(task.id, nextStatus);
    } catch (statusError) {
      setActionError(getErrorMessage(statusError));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }
    await remove(deleteTarget.id);
    setDeleteTarget(null);
  }

  const isLoading = status === 'loading';
  const hasLoaded = status === 'ready';

  return (
    <div className="page">
      <Header />

      <main className="container page__main" id="main-content">
        <section className="page-intro">
          <div>
            <h1 className="page-intro__title">My tasks</h1>
            <p className="page-intro__subtitle">
              Keep track of your casework and see what needs your attention next.
            </p>
          </div>
          <button
            type="button"
            className="button button--primary button--large"
            onClick={() => setDialog({ mode: 'create' })}
          >
            <span aria-hidden="true">+</span> Create task
          </button>
        </section>

        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}

        {actionError ? (
          <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        ) : null}

        {hasLoaded ? <SummaryCards summary={summary} /> : null}

        <Toolbar
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          counts={counts}
          resultCount={visibleTasks.length}
        />

        <section aria-busy={isLoading} aria-label="Task list">
          {isLoading && tasks.length === 0 ? (
            <>
              <p className="visually-hidden" role="status">
                Loading tasks…
              </p>
              <div className="task-list" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="task-card task-card--skeleton" />
                ))}
              </div>
            </>
          ) : (
            <TaskList
              tasks={visibleTasks}
              hasAnyTasks={tasks.length > 0}
              onCreate={() => setDialog({ mode: 'create' })}
              onEdit={(task) => setDialog({ mode: 'edit', task })}
              onDelete={setDeleteTarget}
              onStatusChange={handleStatusChange}
            />
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span>HMCTS caseworker tasks</span>
          <span>Built for the DTS Developer Technical Test</span>
        </div>
      </footer>

      {dialog ? (
        <TaskFormDialog
          task={dialog.mode === 'edit' ? dialog.task : undefined}
          onClose={() => setDialog(null)}
          onSubmit={handleSave}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteTaskDialog
          task={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
