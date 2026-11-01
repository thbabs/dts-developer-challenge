import { useState, type ChangeEvent } from 'react';
import type { Task, TaskStatus } from '../types/task';
import { STATUS_LABELS, TASK_STATUSES } from '../types/task';
import { formatDateTime, isOverdue } from '../utils/datetime';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>;
}

export function TaskItem({ task, onEdit, onDelete, onStatusChange }: TaskItemProps) {
  const [updating, setUpdating] = useState(false);
  const overdue = isOverdue(task.dueDateTime, task.status);

  async function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as TaskStatus;
    if (nextStatus === task.status) {
      return;
    }

    setUpdating(true);
    try {
      await onStatusChange(task, nextStatus);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <article
      className={`task-card task-card--${task.status.toLowerCase()}${overdue ? ' task-card--overdue' : ''}`}
      aria-labelledby={`task-title-${task.id}`}
    >
      <div className="task-card__main">
        <div className="task-card__heading">
          <h3 className="task-card__title" id={`task-title-${task.id}`}>
            {task.title}
          </h3>
          {overdue ? <span className="tag tag--red">Overdue</span> : null}
        </div>

        {task.description ? <p className="task-card__description">{task.description}</p> : null}

        <p className={`task-card__due${overdue ? ' task-card__due--overdue' : ''}`}>
          <span aria-hidden="true">◷</span>
          <span className="visually-hidden">Due </span>
          <time dateTime={task.dueDateTime}>{formatDateTime(task.dueDateTime)}</time>
        </p>

        <div className="task-card__actions">
          <button type="button" className="link-button" onClick={() => onEdit(task)}>
            Edit
          </button>
          <span className="task-card__divider" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            className="link-button link-button--danger"
            onClick={() => onDelete(task)}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="task-card__status">
        <label className="status-select" htmlFor={`status-${task.id}`}>
          <span className="status-select__label">Status</span>
          <span className="select-wrap">
            <select
              id={`status-${task.id}`}
              value={task.status}
              disabled={updating}
              onChange={handleStatusChange}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </span>
        </label>
        <span className="status-dot" aria-hidden="true" />
      </div>
    </article>
  );
}
