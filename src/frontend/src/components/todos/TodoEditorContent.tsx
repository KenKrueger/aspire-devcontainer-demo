import { useEffect, useMemo, useState } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Button } from "@/components/ui/Button";
import { useAppForm } from "@/lib/form";
import { AppCheckbox, AppSubmitButton, AppTextField } from "@/components/form";
import { todoCollection, type TodoItem } from "@/db/todos";

export type TodoEditorContentProps = {
  id: string | number;
  onClose?: () => void;
  onSaved?: (todo: TodoItem) => void;
};

type EditValues = {
  title: string;
  notes: string;
  dueDate: string;
  isCompleted: boolean;
};

const dueDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const detailDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatDueDate = (value: string) => dueDateFormatter.format(new Date(value));
const formatDetailDate = (value: string) => detailDateFormatter.format(new Date(value));

function toEditValues(todo: TodoItem): EditValues {
  return {
    title: todo.title,
    notes: todo.notes ?? "",
    dueDate: todo.dueDate ? todo.dueDate.slice(0, 10) : "",
    isCompleted: todo.isCompleted,
  };
}

export function TodoEditorContent({ id, onClose, onSaved }: TodoEditorContentProps) {
  const todoId = useMemo(() => Number(id), [id]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    data: todo,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      Number.isFinite(todoId)
        ? q
            .from({ todo: todoCollection })
            .where(({ todo }) => eq(todo.id, todoId))
            .findOne()
        : null,
    [todoId],
  );

  const dueStatus = useMemo(() => {
    if (!todo?.dueDate) {
      return null;
    }

    const dueTime = Date.parse(todo.dueDate);
    if (Number.isNaN(dueTime)) {
      return null;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const soonThreshold = new Date(startOfToday);
    soonThreshold.setDate(soonThreshold.getDate() + 3);

    return {
      isOverdue: dueTime < startOfToday.getTime(),
      isDueSoon: dueTime >= startOfToday.getTime() && dueTime <= soonThreshold.getTime(),
      label: formatDueDate(todo.dueDate),
    };
  }, [todo]);

  const statusChipClass = todo?.isCompleted
    ? "border-stroke bg-surface-strong text-muted"
    : "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-ink";

  const editForm = useAppForm({
    defaultValues: {
      title: "",
      notes: "",
      dueDate: "",
      isCompleted: false,
    },
    validators: {
      onChange: ({ value }) => {
        if (!value.title.trim()) {
          return { fields: { title: "Enter a title before saving." } };
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      if (!Number.isFinite(todoId)) {
        return;
      }

      setSaveError(null);

      try {
        await todoCollection.update(todoId, (draft) => {
          draft.title = value.title.trim();
          draft.notes = value.notes.trim();

          const dueDate = value.dueDate.trim();
          draft.dueDate = dueDate ? new Date(dueDate).toISOString() : null;

          draft.isCompleted = value.isCompleted;
          draft.updatedAt = new Date().toISOString();
        });

        if (onSaved && todo) {
          onSaved(todo);
        }
        onClose?.();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not save this todo.");
      }
    },
  });

  useEffect(() => {
    if (!todo) {
      return;
    }

    editForm.reset(toEditValues(todo));
  }, [editForm, todo]);

  if (!Number.isFinite(todoId)) {
    return (
      <div className="flex flex-col gap-4">
        <h2 id="todo-editor-title" className="font-display text-xl text-ink">
          Todo not found
        </h2>
        <p className="text-sm text-muted">That ID doesn&apos;t look valid.</p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onPress={onClose}
            className="h-9 rounded-full px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h2 id="todo-editor-title" className="font-display text-xl text-ink">
          Loading...
        </h2>
        <div className="rounded-2xl border border-dashed border-stroke bg-surface-strong px-4 py-10 text-center text-sm text-muted">
          Loading your task...
        </div>
      </div>
    );
  }

  if (isError || !todo) {
    return (
      <div className="flex flex-col gap-4">
        <h2 id="todo-editor-title" className="font-display text-xl text-ink">
          Todo not found
        </h2>
        <div className="rounded-2xl border border-dashed border-stroke bg-surface-strong px-4 py-10 text-center text-sm text-muted">
          Could not find this todo.
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onPress={onClose}
            className="h-9 rounded-full px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted/70 mb-0.5">Edit Task</p>
          <h2 id="todo-editor-title" className="font-display text-lg sm:text-xl text-ink truncate">
            {todo.title || "Task details"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-muted/60 hover:text-ink hover:bg-surface-strong transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          editForm.handleSubmit();
        }}
      >
        {saveError && (
          <div
            className="rounded-xl border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-3 py-2.5 text-xs text-[color:var(--danger)] shadow-tight"
            role="alert"
            aria-live="assertive"
          >
            {saveError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-[0.55rem] uppercase tracking-[0.25em] text-muted">
          <span className={`rounded-full border px-2.5 py-0.5 ${statusChipClass}`}>
            {todo.isCompleted ? "Done" : "Open"}
          </span>
          {dueStatus && (
            <span
              className={`rounded-full border px-2.5 py-0.5 ${
                dueStatus.isOverdue
                  ? "border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                  : dueStatus.isDueSoon
                    ? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-ink"
                    : "border-stroke bg-surface-strong text-muted"
              }`}
            >
              {dueStatus.isOverdue ? "Overdue" : dueStatus.isDueSoon ? "Due soon" : "Due"}{" "}
              {dueStatus.label}
            </span>
          )}
          <span className="rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-soft)] px-2.5 py-0.5 text-info">
            Created {formatDetailDate(todo.createdAt)}
          </span>
          <span className="rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-soft)] px-2.5 py-0.5 text-info">
            Updated {formatDetailDate(todo.updatedAt)}
          </span>
        </div>

        <editForm.AppField
          name="title"
          children={() => (
            <AppTextField
              label="Title"
              aria-label="Todo title"
              placeholder="Update the task title"
            />
          )}
        />

        <editForm.AppField
          name="notes"
          children={() => (
            <AppTextField
              label="Notes"
              aria-label="Notes"
              placeholder="Optional notes"
              description="Optional"
            />
          )}
        />

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <editForm.AppField
            name="dueDate"
            children={() => (
              <AppTextField
                label="Due date"
                optionalLabel="optional"
                aria-label="Due date"
                type="date"
                className="col-span-1"
              />
            )}
          />
          <div className="col-span-1 flex items-end pb-1.5">
            <editForm.AppField
              name="isCompleted"
              children={() => <AppCheckbox>Completed</AppCheckbox>}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-stroke/50">
          <Button
            variant="secondary"
            onPress={() => editForm.reset(toEditValues(todo))}
            className="h-9 rounded-lg px-3 text-[0.6rem] font-medium uppercase tracking-[0.2em]"
          >
            Reset
          </Button>
          <div className="flex-1" />
          <Button
            variant="quiet"
            onPress={onClose}
            className="h-9 rounded-lg px-3 text-[0.6rem] font-medium uppercase tracking-[0.2em]"
          >
            Cancel
          </Button>
          <editForm.AppForm>
            <AppSubmitButton className="h-9 px-4 text-[0.6rem] font-semibold uppercase tracking-[0.2em] rounded-lg">
              Save
            </AppSubmitButton>
          </editForm.AppForm>
        </div>
      </form>
    </div>
  );
}
