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
      <div className="flex flex-col gap-5">
        <header className="flex items-start justify-between gap-4 pb-3 border-b border-stroke/30">
          <div className="flex-1 min-w-0">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-muted/60 mb-1 font-medium">Task Details</p>
            <h2 id="todo-editor-title" className="font-display text-2xl sm:text-3xl font-semibold text-ink">
              Not Found
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted/50 hover:text-ink hover:bg-surface-strong/60 transition-all"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="rounded-xl border border-dashed border-stroke/70 bg-surface-strong/30 px-6 py-12 text-center">
          <p className="text-sm text-muted/70">That ID doesn&apos;t look valid.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onPress={onClose}
            className="h-10 rounded-lg px-5 text-[0.7rem] font-medium uppercase tracking-[0.2em]"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <header className="flex items-start justify-between gap-4 pb-3 border-b border-stroke/30">
          <div className="flex-1 min-w-0">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-muted/60 mb-1 font-medium">Task Details</p>
            <h2 id="todo-editor-title" className="font-display text-2xl sm:text-3xl font-semibold text-ink">
              Loading...
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted/50 hover:text-ink hover:bg-surface-strong/60 transition-all"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="rounded-xl border border-dashed border-stroke/70 bg-surface-strong/30 px-6 py-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
            <span className="text-sm font-medium text-ink/70">Loading your task...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !todo) {
    return (
      <div className="flex flex-col gap-5">
        <header className="flex items-start justify-between gap-4 pb-3 border-b border-stroke/30">
          <div className="flex-1 min-w-0">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-muted/60 mb-1 font-medium">Task Details</p>
            <h2 id="todo-editor-title" className="font-display text-2xl sm:text-3xl font-semibold text-ink">
              Not Found
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted/50 hover:text-ink hover:bg-surface-strong/60 transition-all"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="rounded-xl border border-dashed border-stroke/70 bg-surface-strong/30 px-6 py-12 text-center">
          <p className="text-sm text-muted/70">Could not find this todo.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onPress={onClose}
            className="h-10 rounded-lg px-5 text-[0.7rem] font-medium uppercase tracking-[0.2em]"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4 pb-3 border-b border-stroke/30 app-fade-in" style={{ animationDelay: "50ms" }}>
        <div className="flex-1 min-w-0">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-muted/60 mb-1 font-medium">Edit Task</p>
          <h2 id="todo-editor-title" className="font-display text-2xl sm:text-3xl font-semibold text-ink tracking-tight line-clamp-2">
            {todo.title || "Task details"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted/50 hover:text-ink hover:bg-surface-strong/60 transition-all"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          editForm.handleSubmit();
        }}
      >
        {saveError && (
          <div
            className="rounded-lg border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger)] shadow-tight app-scale-in"
            role="alert"
            aria-live="assertive"
          >
            {saveError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.25em] font-medium app-fade-in" style={{ animationDelay: "100ms" }}>
          <span className={`rounded-full border px-3 py-1 ${statusChipClass}`}>
            {todo.isCompleted ? "Done" : "Open"}
          </span>
          {dueStatus && (
            <span
              className={`rounded-full border px-3 py-1 ${
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
          <span className="rounded-full border border-stroke bg-surface-strong/50 px-3 py-1 text-muted/70">
            Created {formatDetailDate(todo.createdAt)}
          </span>
          <span className="rounded-full border border-stroke bg-surface-strong/50 px-3 py-1 text-muted/70">
            Updated {formatDetailDate(todo.updatedAt)}
          </span>
        </div>

        <div className="space-y-4 app-fade-in" style={{ animationDelay: "150ms" }}>
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
                placeholder="Add optional notes..."
                description="Optional details about this task"
              />
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <editForm.AppField
              name="dueDate"
              children={() => (
                <AppTextField
                  label="Due date"
                  optionalLabel="optional"
                  aria-label="Due date"
                  type="date"
                />
              )}
            />
            <div className="flex items-end pb-2">
              <editForm.AppField
                name="isCompleted"
                children={() => <AppCheckbox>Mark as completed</AppCheckbox>}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-stroke/30 app-fade-in" style={{ animationDelay: "200ms" }}>
          <Button
            variant="secondary"
            onPress={() => editForm.reset(toEditValues(todo))}
            className="h-10 rounded-lg px-5 text-[0.7rem] font-medium uppercase tracking-[0.2em]"
          >
            Reset
          </Button>
          <div className="flex-1" />
          <Button
            variant="quiet"
            onPress={onClose}
            className="h-10 rounded-lg px-5 text-[0.7rem] font-medium uppercase tracking-[0.2em]"
          >
            Cancel
          </Button>
          <editForm.AppForm>
            <AppSubmitButton className="h-10 px-6 text-[0.7rem] font-semibold uppercase tracking-[0.2em] rounded-lg shadow-sm hover:shadow-md transition-shadow">
              Save Changes
            </AppSubmitButton>
          </editForm.AppForm>
        </div>
      </form>
    </div>
  );
}
