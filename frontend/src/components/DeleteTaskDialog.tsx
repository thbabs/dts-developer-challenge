import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';
import type { Task } from '../types/task';

interface DeleteTaskDialogProps {
  task: Task;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteTaskDialog({ task, onCancel, onConfirm }: DeleteTaskDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const deletingRef = useRef(deleting);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    deletingRef.current = deleting;
  }, [deleting]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deletingRef.current) {
        event.preventDefault();
        onCancelRef.current();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      setDeleting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) {
          onCancel();
        }
      }}
    >
      <div className="modal modal--small" role="alertdialog" aria-modal="true" aria-labelledby="delete-heading" aria-describedby="delete-description">
        <div className="modal__header">
          <h2 className="modal__title" id="delete-heading">
            Delete this task?
          </h2>
        </div>

        <p id="delete-description" className="modal__text">
          “{task.title}” will be permanently deleted. This cannot be undone.
        </p>

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="modal__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onCancel}
            disabled={deleting}
            ref={cancelRef}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete task'}
          </button>
        </div>
      </div>
    </div>
  );
}
