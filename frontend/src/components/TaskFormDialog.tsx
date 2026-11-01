import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, getErrorMessage } from '../api/client';
import type { Task, TaskInput, TaskStatus } from '../types/task';
import { STATUS_LABELS, TASK_STATUSES } from '../types/task';
import { defaultDueDate, fromDateTimeLocalValue, toDateTimeLocalValue } from '../utils/datetime';

interface TaskFormDialogProps {
  task?: Task;
  onClose: () => void;
  onSubmit: (input: TaskInput) => Promise<void>;
}

type FieldName = 'title' | 'description' | 'status' | 'dueDateTime';
type FieldErrors = Partial<Record<FieldName | 'form', string>>;

export function TaskFormDialog({ task, onClose, onSubmit }: TaskFormDialogProps) {
  const isEditing = Boolean(task);
  const fieldId = useId();
  const headingId = `${fieldId}-heading`;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'TODO');
  const [dueDateTime, setDueDateTime] = useState(
    task ? toDateTimeLocalValue(task.dueDateTime) : defaultDueDate(),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    titleInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      nextErrors.title = 'Enter a task title.';
    } else if (trimmedTitle.length > 200) {
      nextErrors.title = 'Title must be 200 characters or fewer.';
    }

    if (description.trim().length > 2000) {
      nextErrors.description = 'Description must be 2000 characters or fewer.';
    }

    if (!dueDateTime) {
      nextErrors.dueDateTime = 'Enter a due date and time.';
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const validationErrors = validate();
    const isoDueDate = fromDateTimeLocalValue(dueDateTime);
    if (!validationErrors.dueDateTime && !isoDueDate) {
      validationErrors.dueDateTime = 'Enter a valid due date and time.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        status,
        dueDateTime: isoDueDate as string,
      });
    } catch (error) {
      if (error instanceof ApiError && error.details.length > 0) {
        const nextErrors: FieldErrors = {};
        for (const issue of error.details) {
          if (
            issue.field === 'title' ||
            issue.field === 'description' ||
            issue.field === 'status' ||
            issue.field === 'dueDateTime'
          ) {
            nextErrors[issue.field] = issue.message;
          } else {
            nextErrors.form = issue.message;
          }
        }
        setErrors(nextErrors);
      } else {
        setSubmitError(getErrorMessage(error));
      }
      setSubmitting(false);
    }
  }

  const titleError = errors.title;
  const descriptionError = errors.description;
  const dueDateError = errors.dueDateTime;
  const statusError = errors.status;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        ref={dialogRef}
      >
        <div className="modal__header">
          <h2 className="modal__title" id={headingId}>
            {isEditing ? 'Edit task' : 'Create a task'}
          </h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit} noValidate>
          {submitError ? (
            <div className="form-error" role="alert">
              {submitError}
            </div>
          ) : null}
          {errors.form ? (
            <div className="form-error" role="alert">
              {errors.form}
            </div>
          ) : null}

          <div className={`form-group${titleError ? ' form-group--error' : ''}`}>
            <label className="form-label" htmlFor={`${fieldId}-title`}>
              Title <span className="form-required">(required)</span>
            </label>
            {titleError ? (
              <p className="form-error-message" id={`${fieldId}-title-error`}>
                {titleError}
              </p>
            ) : null}
            <input
              ref={titleInputRef}
              id={`${fieldId}-title`}
              className="form-input"
              type="text"
              value={title}
              maxLength={200}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setTitle(event.target.value);
                if (titleError) {
                  setErrors((current) => ({ ...current, title: undefined }));
                }
              }}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? `${fieldId}-title-error` : undefined}
            />
          </div>

          <div className={`form-group${descriptionError ? ' form-group--error' : ''}`}>
            <label className="form-label" htmlFor={`${fieldId}-description`}>
              Description <span className="form-hint">(optional)</span>
            </label>
            {descriptionError ? (
              <p className="form-error-message" id={`${fieldId}-description-error`}>
                {descriptionError}
              </p>
            ) : null}
            <textarea
              id={`${fieldId}-description`}
              className="form-input form-textarea"
              rows={4}
              value={description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                setDescription(event.target.value);
                if (descriptionError) {
                  setErrors((current) => ({ ...current, description: undefined }));
                }
              }}
              aria-invalid={descriptionError ? true : undefined}
              aria-describedby={descriptionError ? `${fieldId}-description-error` : undefined}
            />
          </div>

          <div className="form-row">
            <div className={`form-group${dueDateError ? ' form-group--error' : ''}`}>
              <label className="form-label" htmlFor={`${fieldId}-due`}>
                Due date and time <span className="form-required">(required)</span>
              </label>
              {dueDateError ? (
                <p className="form-error-message" id={`${fieldId}-due-error`}>
                  {dueDateError}
                </p>
              ) : null}
              <input
                id={`${fieldId}-due`}
                className="form-input"
                type="datetime-local"
                value={dueDateTime}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setDueDateTime(event.target.value);
                  if (dueDateError) {
                    setErrors((current) => ({ ...current, dueDateTime: undefined }));
                  }
                }}
                aria-invalid={dueDateError ? true : undefined}
                aria-describedby={dueDateError ? `${fieldId}-due-error` : undefined}
              />
            </div>

            <div className={`form-group${statusError ? ' form-group--error' : ''}`}>
              <label className="form-label" htmlFor={`${fieldId}-status`}>
                Status
              </label>
              {statusError ? (
                <p className="form-error-message" id={`${fieldId}-status-error`}>
                  {statusError}
                </p>
              ) : null}
              <span className="select-wrap">
                <select
                  id={`${fieldId}-status`}
                  className="form-input form-select"
                  value={status}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    setStatus(event.target.value as TaskStatus);
                  }}
                >
                  {TASK_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          </div>

          <div className="modal__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="button button--primary" disabled={submitting}>
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
