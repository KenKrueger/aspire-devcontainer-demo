import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Button } from "@/components/ui/Button";
import { useAppForm } from "@/lib/form";
import { AppCheckbox, AppSubmitButton, AppTextField } from "@/components/form";
import { todoCollection, type TodoItem } from "@/db/todos";

export const Route = createFileRoute("/todos/$id")({
  component: TodoEditor,
});

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

function TodoEditor() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const todoId = useMemo(() => Number(params.id), [params.id]);
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

        navigate({ to: "/" });
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
      <div className="app-shell">
        <div className="mx-auto w-full max-w-3xl px-6 py-12">
          <div className="rounded-3xl border border-stroke bg-surface-raised p-8 shadow-soft app-rise">
            <h1 className="font-display text-2xl text-ink">Todo not found</h1>
            <p className="mt-3 text-sm text-muted">That ID doesn&apos;t look valid.</p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                onPress={() => navigate({ to: "/" })}
                className="h-9 rounded-full px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted">Edit</p>
            <h1 className="font-display text-3xl text-ink">Task details</h1>
          </div>
          <Button
            variant="secondary"
            onPress={() => navigate({ to: "/" })}
            className="h-9 rounded-full px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
          >
            Back
          </Button>
        </div>

        <div className="mt-6 rounded-3xl border border-stroke bg-surface-raised p-8 shadow-soft app-rise">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-stroke bg-surface-strong px-4 py-10 text-center text-sm text-muted">
              Loading your task...
            </div>
          ) : isError || !todo ? (
            <div className="rounded-2xl border border-dashed border-stroke bg-surface-strong px-4 py-10 text-center text-sm text-muted">
              Todo not found.
            </div>
          ) : (
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                editForm.handleSubmit();
              }}
            >
              {saveError && (
                <div
                  className="rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger)] shadow-tight"
                  role="alert"
                >
                  {saveError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.32em] text-muted">
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
                <span className="rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-soft)] px-3 py-1 text-info">
                  Created {formatDetailDate(todo.createdAt)}
                </span>
                <span className="rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-soft)] px-3 py-1 text-info">
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

              <div className="flex flex-wrap items-end gap-4">
                <editForm.AppField
                  name="dueDate"
                  children={() => (
                    <AppTextField
                      label="Due date"
                      optionalLabel="optional"
                      aria-label="Due date"
                      type="date"
                      className="w-full sm:w-[220px]"
                    />
                  )}
                />
                <editForm.AppField
                  name="isCompleted"
                  children={() => <AppCheckbox>Completed</AppCheckbox>}
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onPress={() => editForm.reset(toEditValues(todo))}
                  className="h-9 rounded-full px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
                >
                  Reset
                </Button>
                <editForm.AppForm>
                  <AppSubmitButton className="h-11 px-6 text-[0.7rem] font-semibold uppercase tracking-[0.32em] rounded-full">
                    Save
                  </AppSubmitButton>
                </editForm.AppForm>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
