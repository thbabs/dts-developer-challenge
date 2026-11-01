import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import type { Task } from '../types/task';
import { fromDateTimeLocalValue } from '../utils/datetime';
import { TaskFormDialog } from './TaskFormDialog';

const existingTask: Task = {
  id: 'task-1',
  title: 'Review case file',
  description: 'Check the bundle',
  status: 'TODO',
  dueDateTime: '2026-12-01T09:30:00.000Z',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
};

function renderDialog(props: Partial<Parameters<typeof TaskFormDialog>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  render(<TaskFormDialog onSubmit={onSubmit} onClose={onClose} {...props} />);

  return { onSubmit, onClose };
}

describe('TaskFormDialog', () => {
  it('renders an accessible create dialog', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Create a task' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^title/i)).toHaveValue('');
    expect(screen.getByLabelText(/due date and time/i)).not.toHaveValue('');
  });

  it('submits a trimmed, ISO-dated task', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.type(screen.getByLabelText(/^title/i), '  Prepare hearing notes  ');
    await user.type(screen.getByLabelText(/description/i), '  Summary of issues  ');

    const dueInput = screen.getByLabelText(/due date and time/i) as HTMLInputElement;
    const expectedDueDate = fromDateTimeLocalValue(dueInput.value);

    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Prepare hearing notes',
      description: 'Summary of issues',
      status: 'TODO',
      dueDateTime: expectedDueDate,
    });
  });

  it('sends null when the optional description is blank', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.type(screen.getByLabelText(/^title/i), 'Task without description');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Task without description', description: null }),
    );
  });

  it('blocks submission and shows an error when the title is empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText('Enter a task title.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^title/i)).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('prefills the form and submits changes in edit mode', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({ task: existingTask });

    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^title/i)).toHaveValue('Review case file');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Check the bundle');

    await user.clear(screen.getByLabelText(/^title/i));
    await user.type(screen.getByLabelText(/^title/i), 'Review updated case file');
    await user.selectOptions(screen.getByLabelText('Status'), 'DONE');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Review updated case file',
      description: 'Check the bundle',
      status: 'DONE',
      dueDateTime: existingTask.dueDateTime,
    });
  });

  it('maps server-side validation details onto fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(400, 'The request body contains invalid data.', [
          { field: 'title', message: 'Title is already in use.' },
        ]),
      );

    render(<TaskFormDialog onSubmit={onSubmit} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(/^title/i), 'Duplicate');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText('Title is already in use.')).toBeInTheDocument();
  });

  it('shows a general error when the request fails without field details', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(500, 'An unexpected error occurred.'));

    render(<TaskFormDialog onSubmit={onSubmit} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(/^title/i), 'Will fail');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText('An unexpected error occurred.')).toBeInTheDocument();
  });

  it('clears a field error when the user edits the field', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Create task' }));
    expect(await screen.findByText('Enter a task title.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^title/i), 'Now valid');

    expect(screen.queryByText('Enter a task title.')).not.toBeInTheDocument();
  });

  it('closes with the cancel button and the Escape key', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes when the backdrop is clicked', async () => {
    const { onClose } = renderDialog();

    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
