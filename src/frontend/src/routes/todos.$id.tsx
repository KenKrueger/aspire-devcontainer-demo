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
          <div className="rounded-3xl border border-stroke bg-surface p-8 shadow-soft">
            <h1 className="font-display text-2xl text-ink">Todo not found</h1>
            <p className="mt-3 text-sm text-muted">That ID doesn&apos;t look valid.</p>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onPress={() => navigate({ to: "/" })}>
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
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted">Edit</p>
            <h1 className="font-display text-3xl text-ink">Task details</h1>
          </div>
          <Button variant="secondary" onPress={() => navigate({ to: "/" })}>
            Back
          </Button>
        </div>

        <div className="mt-6 rounded-3xl border border-stroke bg-surface p-8 shadow-soft">
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
                  className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-tight dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                  role="alert"
                >
                  {saveError}
                </div>
              )}

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
                  />
                )}
              />

              <div className="flex flex-wrap items-end gap-4">
                <editForm.AppField
                  name="dueDate"
                  children={() => (
                    <AppTextField
                      label="Due date"
                      aria-label="Due date"
                      type="date"
                      className="w-[220px]"
                    />
                  )}
                />
                <editForm.AppField name="isCompleted" children={() => <AppCheckbox>Completed</AppCheckbox>} />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button variant="secondary" onPress={() => editForm.reset(toEditValues(todo))}>
                  Reset
                </Button>
                <editForm.AppForm>
                  <AppSubmitButton className="h-11 px-6 text-[0.7rem] font-semibold uppercase tracking-[0.3em] bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)]/90">
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
