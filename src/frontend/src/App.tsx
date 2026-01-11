import { useEffect, useMemo, useState } from "react";
import { Button } from "./components/ui/Button";
import { Checkbox } from "./components/ui/Checkbox";
import { GridList, GridListItem } from "./components/ui/GridList";
import { ToggleButton } from "./components/ui/ToggleButton";
import { ToggleButtonGroup } from "./components/ui/ToggleButtonGroup";
import { deleteApiTodosById, getApiTodos, patchApiTodosById, postApiTodos } from "./client";
import { useTheme } from "./lib/theme";
import { useAppForm } from "./lib/form";
import { AppTextField, AppSubmitButton } from "./components/form";

type TodoItem = {
  id: number;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  sortOrder: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

const apiBaseUrl = typeof window === "undefined" ? "" : window.location.origin;

const emptyRequest = {
  title: null,
  notes: null,
  dueDate: null,
  sortOrder: null,
};

const parseTodos = (data: unknown): TodoItem[] => (Array.isArray(data) ? (data as TodoItem[]) : []);

const parseTodo = (data: unknown): TodoItem | null =>
  data && typeof data === "object" ? (data as TodoItem) : null;

type ThemeMode = "light" | "dark" | "system";

const themeOptions: Array<{ key: ThemeMode; label: string }> = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTodoId, setActiveTodoId] = useState<number | null>(null);
  const { theme, setTheme } = useTheme();

  const completedCount = useMemo(() => todos.filter((todo) => todo.isCompleted).length, [todos]);
  const selectedThemeKeys = useMemo(() => new Set([theme]), [theme]);

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

  const loadTodos = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getApiTodos({ baseUrl: apiBaseUrl });

      if (result.error) {
        throw new Error("Could not load todos.");
      }

      setTodos(parseTodos(result.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load todos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

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
      setError(null);

      try {
        const result = await postApiTodos({
          baseUrl: apiBaseUrl,
          body: {
            ...emptyRequest,
            title: value.title.trim(),
          },
        });

        if (result.error) {
          throw new Error("Could not save your todo.");
        }

        const created = parseTodo(result.data);
        if (created) {
          setTodos((prev) => [created, ...prev]);
        } else {
          await loadTodos();
        }

        createForm.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save your todo.");
      }
    },
  });

  const handleToggle = async (todo: TodoItem, nextValue: boolean) => {
    setActiveTodoId(todo.id);
    setError(null);

    try {
      const result = await patchApiTodosById({
        baseUrl: apiBaseUrl,
        path: { id: todo.id },
        body: {
          ...emptyRequest,
          isCompleted: nextValue,
        },
      });

      if (result.error) {
        throw new Error("Could not update this todo.");
      }

      const updated = parseTodo(result.data);
      if (updated) {
        setTodos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        await loadTodos();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this todo.");
    } finally {
      setActiveTodoId(null);
    }
  };

  const handleDelete = async (todoId: number) => {
    setActiveTodoId(todoId);
    setError(null);

    try {
      const result = await deleteApiTodosById({
        baseUrl: apiBaseUrl,
        path: { id: todoId },
      });

      if (result.error) {
        throw new Error("Could not delete this todo.");
      }

      setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this todo.");
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
                name="theme"
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
              <Button variant="secondary" onPress={loadTodos} isDisabled={loading}>
                {loading ? "Refreshing" : "Refresh"}
              </Button>
            </div>

            {error && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                role="alert"
              >
                {error}
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
