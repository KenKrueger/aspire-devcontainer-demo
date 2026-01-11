import { useMemo, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./components/ui/Button";
import { Checkbox } from "./components/ui/Checkbox";
import { GridList, GridListItem } from "./components/ui/GridList";
import { ToggleButton } from "./components/ui/ToggleButton";
import { ToggleButtonGroup } from "./components/ui/ToggleButtonGroup";
import { useTheme } from "./lib/theme";
import { useAppForm } from "./lib/form";
import { AppTextField, AppSubmitButton } from "./components/form";
import { todoCollection, todosQueryKey, type TodoItem } from "./db/todos";
import { postApiTodos } from "./client";

type ThemeMode = "light" | "dark" | "system";

const themeOptions: Array<{ key: ThemeMode; label: string }> = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

function App() {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState<number | null>(null);
  const { theme, setTheme } = useTheme();
  const {
    data: todos = [],
    isLoading,
    isError,
  } = useLiveQuery((q) =>
    q.from({ todo: todoCollection }).orderBy(({ todo }) => todo.createdAt, "desc"),
  );

  const completedCount = useMemo(() => todos.filter((todo) => todo.isCompleted).length, [todos]);
  const selectedThemeKeys = useMemo(() => new Set([theme]), [theme]);
  const loadError = isError ? "Could not load todos." : null;
  const errorMessage = mutationError ?? loadError;
  const loading = isLoading || refreshing;

  const handleThemeChange = (selection: "all" | Iterable<unknown> | unknown) => {
    if (selection === "light" || selection === "dark" || selection === "system") {
      setTheme(selection);
      return;
    }

    if (selection instanceof Set) {
      const [nextValue] = Array.from(selection);
      if (nextValue === "light" || nextValue === "dark" || nextValue === "system") {
        setTheme(nextValue);
      }
    }
  };

  const refreshTodos = async () => {
    setRefreshing(true);
    setMutationError(null);

    try {
      await queryClient.invalidateQueries({ queryKey: todosQueryKey });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Could not refresh todos.");
    } finally {
      setRefreshing(false);
    }
  };

  const createForm = useAppForm({
    defaultValues: {
      title: "",
    },
    validators: {
      onChange: ({ value }) => {
        if (!value.title.trim()) {
          return { fields: { title: "Enter a title before adding a task." } };
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setMutationError(null);

      try {
        const result = await postApiTodos({
          baseUrl: typeof window === "undefined" ? "" : window.location.origin,
          body: {
            title: value.title.trim(),
            notes: null,
            dueDate: null,
            sortOrder: null,
          },
        });

        if (result.error) {
          throw new Error("Could not save your todo.");
        }

        await queryClient.invalidateQueries({ queryKey: todosQueryKey });

        createForm.reset();
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Could not save your todo.");
      }
    },
  });

  const handleToggle = async (todo: TodoItem, nextValue: boolean) => {
    setActiveTodoId(todo.id);
    setMutationError(null);

    try {
      await todoCollection.update(todo.id, (draft) => {
        draft.isCompleted = nextValue;
        draft.updatedAt = new Date().toISOString();
      });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Could not update this todo.");
    } finally {
      setActiveTodoId(null);
    }
  };

  const handleDelete = async (todoId: number) => {
    setActiveTodoId(todoId);
    setMutationError(null);

    try {
      await todoCollection.delete(todoId);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Could not delete this todo.");
    } finally {
      setActiveTodoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Tasks
              </p>
              <h1 className="text-balance text-3xl font-semibold text-slate-900 dark:text-slate-100 md:text-4xl">
                Todo list
              </h1>
              <p className="max-w-2xl text-base text-slate-600 dark:text-slate-400">
                Keep track of the essentials. Add, complete, and clear tasks in one place.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <ToggleButtonGroup
                aria-label="Theme"
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={selectedThemeKeys}
                onSelectionChange={handleThemeChange}
                className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {themeOptions.map((option) => (
                  <ToggleButton
                    id={option.key}
                    key={option.key}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <div className="flex flex-col items-end gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {todos.length} items
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {completedCount} completed
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                createForm.handleSubmit();
              }}
            >
              <div className="flex flex-wrap items-end gap-4">
                <createForm.AppField
                  name="title"
                  children={() => (
                    <AppTextField
                      aria-label="Todo title"
                      placeholder="Add a task"
                      className="min-w-[240px] flex-1"
                    />
                  )}
                />
                <createForm.AppForm>
                  <AppSubmitButton>Add task</AppSubmitButton>
                </createForm.AppForm>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Keep titles short so the list stays easy to scan.
              </p>
            </form>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Todos</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Review what needs attention today.
                </p>
              </div>
              <Button variant="secondary" onPress={refreshTodos} isDisabled={loading}>
                {loading ? "Refreshing" : "Refresh"}
              </Button>
            </div>

            {errorMessage && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Loading your tasks...
              </div>
            ) : todos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No todos yet. Add your first task above.
              </div>
            ) : (
              <GridList
                aria-label="Todo list"
                selectionMode="none"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
              >
                {todos.map((todo) => (
                  <GridListItem id={todo.id} key={todo.id} textValue={todo.title}>
                    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <Checkbox
                        name={`todo-${todo.id}`}
                        isSelected={todo.isCompleted}
                        onChange={(value) => handleToggle(todo, value)}
                        isDisabled={activeTodoId === todo.id}
                        className="items-start"
                      >
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-base font-medium ${
                              todo.isCompleted
                                ? "text-slate-400 dark:text-slate-500 line-through"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {todo.title}
                          </span>
                          {todo.notes && (
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {todo.notes}
                            </span>
                          )}
                        </div>
                      </Checkbox>
                      <Button
                        variant="quiet"
                        onPress={() => handleDelete(todo.id)}
                        isDisabled={activeTodoId === todo.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </GridListItem>
                ))}
              </GridList>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
