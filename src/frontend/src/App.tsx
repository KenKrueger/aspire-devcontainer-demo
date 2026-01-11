import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "./components/ui/Button";
import { Checkbox } from "./components/ui/Checkbox";
import { GridList, GridListItem } from "./components/ui/GridList";
import { TextField } from "./components/ui/TextField";
import { ToggleButton } from "./components/ui/ToggleButton";
import { ToggleButtonGroup } from "./components/ui/ToggleButtonGroup";
import { deleteApiTodosById, getApiTodos, patchApiTodosById, postApiTodos } from "./client";
import { useTheme } from "./lib/theme";

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
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = newTitle.trim();
    if (!trimmed) {
      setError("Enter a title before adding a task.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await postApiTodos({
        baseUrl: apiBaseUrl,
        body: {
          ...emptyRequest,
          title: trimmed,
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

      setNewTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your todo.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Tasks
              </p>
              <h1 className="text-balance text-3xl font-semibold text-slate-900 md:text-4xl">
                Todo list
              </h1>
              <p className="max-w-2xl text-base text-slate-600">
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
                className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
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
              <div className="flex flex-col items-end gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold text-slate-900">{todos.length} items</span>
                <span className="text-slate-500">{completedCount} completed</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <form className="flex flex-col gap-4" onSubmit={handleCreate}>
              <div className="flex flex-wrap items-end gap-4">
                <TextField
                  aria-label="Todo title"
                  name="title"
                  value={newTitle}
                  onChange={setNewTitle}
                  placeholder="Add a task"
                  className="min-w-[240px] flex-1"
                />
                <Button type="submit" isDisabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add task"}
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Keep titles short so the list stays easy to scan.
              </p>
            </form>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-slate-900">Todos</h2>
                <p className="text-sm text-slate-500">Review what needs attention today.</p>
              </div>
              <Button variant="secondary" onPress={loadTodos} isDisabled={loading}>
                {loading ? "Refreshing" : "Refresh"}
              </Button>
            </div>

            {error && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Loading your tasks...
              </div>
            ) : todos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No todos yet. Add your first task above.
              </div>
            ) : (
              <GridList
                aria-label="Todo list"
                selectionMode="none"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 shadow-sm"
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
                              todo.isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                            }`}
                          >
                            {todo.title}
                          </span>
                          {todo.notes && (
                            <span className="text-sm text-slate-500">{todo.notes}</span>
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
