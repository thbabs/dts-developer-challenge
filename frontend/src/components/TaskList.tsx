import type { Task, TaskStatus } from '../types/task';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  hasAnyTasks: boolean;
  onCreate: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>;
}

export function TaskList({
  tasks,
  hasAnyTasks,
  onCreate,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden="true">
          ✓
        </div>
        <h2>{hasAnyTasks ? 'No tasks match your filters' : 'You have no tasks yet'}</h2>
        <p>
          {hasAnyTasks
            ? 'Try a different status or search term.'
            : 'Create your first task to keep track of your casework.'}
        </p>
        {hasAnyTasks ? null : (
          <button type="button" className="button button--primary" onClick={onCreate}>
            Create a task
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
