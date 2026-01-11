import { FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";
import { Button } from "./components/ui/Button";
import { Checkbox } from "./components/ui/Checkbox";
import { GridList, GridListItem } from "./components/ui/GridList";
import { TextField } from "./components/ui/TextField";
import { deleteApiTodosById, getApiTodos, patchApiTodosById, postApiTodos } from "./client";

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

function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState<number | null>(null);

  const completedCount = useMemo(() => todos.filter((todo) => todo.isCompleted).length, [todos]);

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
      setError("Give your task a tiny title first.");
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
    <div className="todo-shell">
      <div className="todo-shell__content">
        <header className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 pt-16">
          <div className="todo-badge">Sprinkle List</div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-balance text-4xl font-semibold text-neutral-900 md:text-5xl">
                Your tiny tasks, big sparkle energy.
              </h1>
              <p className="max-w-xl text-base text-neutral-600">
                Capture the essentials, tap to complete, and keep the day light. This is your
                friendly corner for a few important things.
              </p>
            </div>
            <div className="todo-chip">
              <span className="text-sm font-semibold text-neutral-800">{todos.length} total</span>
              <span className="text-xs font-medium text-neutral-500">{completedCount} done</span>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-16 pt-8">
          <section className="todo-card p-6">
            <form className="flex flex-col gap-4" onSubmit={handleCreate}>
              <div className="flex flex-wrap items-end gap-4">
                <TextField
                  aria-label="Todo title"
                  value={newTitle}
                  onChange={setNewTitle}
                  placeholder="Add a tiny task"
                  className="min-w-[240px] flex-1"
                />
                <Button type="submit" isDisabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add task"}
                </Button>
              </div>
              <p className="text-sm text-neutral-500">
                Keep it short, keep it sweet. You can always add more later.
              </p>
            </form>
          </section>

          <section className="todo-card flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-neutral-900">Today’s spark list</h2>
                <p className="text-sm text-neutral-500">
                  Tap the checkbox to celebrate a tiny win.
                </p>
              </div>
              <Button variant="secondary" onPress={loadTodos} isDisabled={loading}>
                {loading ? "Refreshing" : "Refresh"}
              </Button>
            </div>

            {error && (
              <div className="todo-alert" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="todo-placeholder">Loading your tasks...</div>
            ) : todos.length === 0 ? (
              <div className="todo-placeholder">
                No todos yet. Add one above and make it sparkle.
              </div>
            ) : (
              <GridList
                aria-label="Todo list"
                selectionMode="none"
                className="w-full bg-white/80 border-white/40 shadow-sm"
              >
                {todos.map((todo) => (
                  <GridListItem id={todo.id} key={todo.id} textValue={todo.title}>
                    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <Checkbox
                        isSelected={todo.isCompleted}
                        onChange={(value) => handleToggle(todo, value)}
                        isDisabled={activeTodoId === todo.id}
                        className="items-start"
                      >
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-base font-medium ${
                              todo.isCompleted
                                ? "text-neutral-400 line-through"
                                : "text-neutral-900"
                            }`}
                          >
                            {todo.title}
                          </span>
                          {todo.notes && (
                            <span className="text-sm text-neutral-500">{todo.notes}</span>
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
