import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "./components/ui/Button";
import { Checkbox } from "./components/ui/Checkbox";
import { GridList, GridListItem } from "./components/ui/GridList";
import { ToggleButton } from "./components/ui/ToggleButton";
import { ToggleButtonGroup } from "./components/ui/ToggleButtonGroup";
import { TextField } from "./components/ui/TextField";
import { useTheme } from "./lib/theme";
import { useAppForm } from "./lib/form";
import { AppTextField, AppSubmitButton } from "./components/form";
import { queue as toastQueue } from "./components/ui/Toast";
import { restoreTodo, todoCollection, todosQueryKey, type TodoItem } from "./db/todos";
import { postApiTodos } from "./client";

type ThemeMode = "light" | "dark" | "system";

const themeOptions: Array<{ key: ThemeMode; label: string }> = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

type StatusFilter = "all" | "open" | "done";
type SortFilter = "newest" | "due";

const statusOptions: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "done", label: "Done" },
];

const sortOptions: Array<{ key: SortFilter; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "due", label: "Due" },
];


const dueDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const formatDueDate = (value: string) => dueDateFormatter.format(new Date(value));

function App() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const statusFilter: StatusFilter = search.status ?? "all";
  const sortFilter: SortFilter = search.sort === "due" ? "due" : "newest";
  const queryFilter = search.q ?? "";

  const [searchInput, setSearchInput] = useState(queryFilter);

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
  const remainingCount = todos.length - completedCount;
  const completionRate = todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);
  const selectedThemeKeys = useMemo(() => new Set([theme]), [theme]);
  const selectedStatusKeys = useMemo(() => new Set([statusFilter]), [statusFilter]);
  const selectedSortKeys = useMemo(() => new Set([sortFilter]), [sortFilter]);
  const loadError = isError ? "Could not load todos." : null;
  const errorMessage = mutationError ?? loadError;
  const loading = isLoading || refreshing;
  const hasMounted = useRef(false);

  useEffect(() => {
    setSearchInput(queryFilter);
  }, [queryFilter]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    queryClient.invalidateQueries({ queryKey: todosQueryKey });
  }, [queryClient, queryFilter, sortFilter, statusFilter]);

  useEffect(() => {
    const normalized = searchInput.trim();

    if (normalized === queryFilter) {
      return;
    }

    const handle = window.setTimeout(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          q: normalized ? normalized : undefined,
        }),
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [navigate, queryFilter, searchInput]);

  const visibleTodos = useMemo(() => {
    const normalizedQuery = queryFilter.trim().toLowerCase();

    const filtered = (() => {
      const byStatus = (() => {
        if (statusFilter === "open") {
          return todos.filter((todo) => !todo.isCompleted);
        }

        if (statusFilter === "done") {
          return todos.filter((todo) => todo.isCompleted);
        }

        return todos;
      })();

      if (!normalizedQuery) {
        return byStatus;
      }

      return byStatus.filter((todo) => {
        const haystack = `${todo.title} ${todo.notes ?? ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    })();

    if (sortFilter === "newest") {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const aDue = a.dueDate ? Date.parse(a.dueDate) : null;
      const bDue = b.dueDate ? Date.parse(b.dueDate) : null;

      if (aDue == null && bDue == null) {
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }

      if (aDue == null) return 1;
      if (bDue == null) return -1;

      if (aDue !== bDue) {
        return aDue - bDue;
      }

      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [queryFilter, sortFilter, statusFilter, todos]);

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

  const handleStatusChange = (selection: "all" | Iterable<unknown> | unknown) => {
    const nextValue = (() => {
      if (selection === "all" || selection === "open" || selection === "done") {
        return selection;
      }

      if (selection instanceof Set) {
        const [value] = Array.from(selection);
        if (value === "all" || value === "open" || value === "done") {
          return value;
        }
      }

      return null;
    })();

    if (!nextValue) {
      return;
    }

    navigate({
      search: (prev) => ({
        ...prev,
        status: nextValue === "all" ? undefined : nextValue,
      }),
    });
  };

  const handleSortChange = (selection: "all" | Iterable<unknown> | unknown) => {
    const nextValue = (() => {
      if (selection === "newest" || selection === "due") {
        return selection;
      }

      if (selection instanceof Set) {
        const [value] = Array.from(selection);
        if (value === "newest" || value === "due") {
          return value;
        }
      }

      return null;
    })();

    if (!nextValue) {
      return;
    }

    navigate({
      search: (prev) => ({
        ...prev,
        sort: nextValue === "newest" ? undefined : "due",
      }),
    });
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
      dueDate: "",
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
        const dueDate = value.dueDate.trim();

        const result = await postApiTodos({
          baseUrl: typeof window === "undefined" ? "" : window.location.origin,
          body: {
            title: value.title.trim(),
            notes: null,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
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

      toastQueue.add({
        title: "Moved to trash",
        description: "Hidden from your list. Undo if needed.",
        action: {
          label: "Undo",
          onAction: async () => {
            try {
              await restoreTodo(todoId);
            } catch (err) {
              setMutationError(err instanceof Error ? err.message : "Could not restore this todo.");
            }
          },
        },
      });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Could not delete this todo.");
    } finally {
      setActiveTodoId(null);
    }
  };

  return (
    <div className="app-shell">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 lg:py-16">
        <header
          className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] app-rise"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.45em] text-muted">
              <span className="inline-flex items-center gap-2 rounded-full border border-stroke bg-surface px-4 py-2 text-[0.65rem] font-semibold text-muted shadow-tight">
                <span className="h-2 w-2 rounded-full bg-[color:var(--accent)] shadow-[0_0_0_4px_var(--accent-glow)]" />
                Task atelier
              </span>
              <span className="text-[0.7rem]">Curate the essentials</span>
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-4xl leading-tight text-ink md:text-5xl">
                A studio board for the <span className="text-[color:var(--accent)]">essential</span>
              </h1>
              <p className="max-w-2xl text-base text-muted md:text-lg">
                Shape a calm queue, celebrate momentum, and keep the most important work visible.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="rounded-2xl border border-stroke bg-surface px-5 py-3 shadow-tight">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Status</p>
                <p className="mt-2 font-display text-2xl text-ink">{remainingCount} open</p>
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted">
                <span>{todos.length} total tasks</span>
                <span>{completedCount} completed</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-5 lg:items-end">
            <ToggleButtonGroup
              aria-label="Theme"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={selectedThemeKeys}
              onSelectionChange={handleThemeChange}
              className="rounded-full border border-stroke bg-surface px-2 py-1 shadow-none"
            >
              {themeOptions.map((option) => (
                <ToggleButton
                  id={option.key}
                  key={option.key}
                  className="h-8 rounded-full px-4 text-[0.6rem] font-semibold tracking-[0.28em] text-muted !bg-transparent hover:bg-black/5 dark:hover:bg-white/10 data-[selected]:text-ink data-[selected]:!bg-[color:var(--accent)]/15 data-[selected]:shadow-[inset_0_0_0_1px_var(--stroke)]"
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <div className="w-full max-w-sm rounded-3xl border border-stroke bg-surface px-6 py-5 shadow-soft">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-muted">
                <span>Momentum</span>
                <span className="text-sm font-semibold tracking-normal text-ink">
                  {completionRate}%
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted">
                <span>{remainingCount} remaining</span>
                <span>{completedCount} done</span>
              </div>
            </div>
          </div>
        </header>

        <main className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section
            className="flex flex-col gap-6 rounded-3xl border border-stroke bg-surface px-6 py-7 shadow-soft app-rise"
            style={{ animationDelay: "140ms" }}
          >
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.4em] text-muted">Compose</p>
              <h2 className="font-display text-2xl text-ink">Add a new task</h2>
              <p className="text-sm text-muted">
                Keep the title short, then shape the details as the work evolves.
              </p>
            </div>
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
                      label="Task title"
                      aria-label="Todo title"
                      placeholder="Sketch the next priority"
                      className="min-w-[220px] flex-1"
                    />
                  )}
                />
                <createForm.AppField
                  name="dueDate"
                  children={() => (
                    <AppTextField
                      label="Due date"
                      aria-label="Due date"
                      type="date"
                      className="w-[190px]"
                    />
                  )}
                />
                <createForm.AppForm>
                  <AppSubmitButton className="h-11 px-6 text-[0.7rem] font-semibold uppercase tracking-[0.3em] bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)]/90">
                    Add task
                  </AppSubmitButton>
                </createForm.AppForm>
              </div>
            </form>
          </section>

          <section
            className="flex flex-col gap-5 rounded-3xl border border-stroke bg-surface px-6 py-7 shadow-soft app-rise"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-[0.4em] text-muted">Queue</p>
                <h2 className="font-display text-2xl text-ink">Today&apos;s lineup</h2>
                <p className="text-sm text-muted">Review, refine, and close the loop.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <TextField
                  aria-label="Search"
                  placeholder="Search"
                  value={searchInput}
                  onChange={setSearchInput}
                  className="w-[220px]"
                />
                <ToggleButtonGroup
                  aria-label="Status"
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={selectedStatusKeys}
                  onSelectionChange={handleStatusChange}
                  className="rounded-full border border-stroke bg-surface px-2 py-1 shadow-none"
                >
                  {statusOptions.map((option) => (
                    <ToggleButton
                      id={option.key}
                      key={option.key}
                      className="h-8 rounded-full px-4 text-[0.6rem] font-semibold tracking-[0.28em] text-muted !bg-transparent hover:bg-black/5 dark:hover:bg-white/10 data-[selected]:text-ink data-[selected]:!bg-[color:var(--accent)]/15 data-[selected]:shadow-[inset_0_0_0_1px_var(--stroke)]"
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <ToggleButtonGroup
                  aria-label="Sort"
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={selectedSortKeys}
                  onSelectionChange={handleSortChange}
                  className="rounded-full border border-stroke bg-surface px-2 py-1 shadow-none"
                >
                  {sortOptions.map((option) => (
                    <ToggleButton
                      id={option.key}
                      key={option.key}
                      className="h-8 rounded-full px-4 text-[0.6rem] font-semibold tracking-[0.28em] text-muted !bg-transparent hover:bg-black/5 dark:hover:bg-white/10 data-[selected]:text-ink data-[selected]:!bg-[color:var(--accent)]/15 data-[selected]:shadow-[inset_0_0_0_1px_var(--stroke)]"
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Button
                  variant="secondary"
                  onPress={refreshTodos}
                  isDisabled={loading}
                  className="h-9 px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] bg-surface-strong"
                >
                  {loading ? "Refreshing" : "Refresh"}
                </Button>
              </div>
            </div>

            {errorMessage && (
              <div
                className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-tight dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-dashed border-stroke bg-surface-strong px-4 py-10 text-center text-sm text-muted">
                Loading your tasks...
              </div>
            ) : visibleTodos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stroke bg-surface-strong px-4 py-10 text-center text-sm text-muted">
                {todos.length === 0
                  ? "No tasks yet. Add your first entry in the composer."
                  : queryFilter.trim()
                    ? `No matches for "${queryFilter.trim()}".`
                    : statusFilter === "open"
                      ? "No open tasks right now."
                      : "No completed tasks yet."}
              </div>
            ) : (
              <div className="rounded-3xl bg-surface-strong p-4 shadow-tight ring-1 ring-black/5 dark:ring-white/10">
                <GridList
                  aria-label="Todo list"
                  selectionMode="none"
                  className="w-full border-transparent bg-transparent shadow-none todo-gridlist grid gap-3"
                >
                  {visibleTodos.map((todo) => (
                    <GridListItem id={todo.id} key={todo.id} textValue={todo.title}>
                      <div className="group flex w-full flex-col gap-4 rounded-2xl border border-stroke bg-surface p-4 shadow-tight transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--accent)]">
                        <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <Checkbox
                            name={`todo-${todo.id}`}
                            isSelected={todo.isCompleted}
                            onChange={(value) => handleToggle(todo, value)}
                            isDisabled={activeTodoId === todo.id}
                            className="items-center text-base"
                          >
                            <div className="flex flex-col gap-2">
                              <span
                                className={`text-base font-medium ${
                                  todo.isCompleted ? "text-muted line-through" : "text-ink"
                                }`}
                              >
                                {todo.title}
                              </span>
                              {todo.notes && (
                                <span className="text-sm text-muted">{todo.notes}</span>
                              )}
                              {todo.dueDate && (
                                <span className="text-[0.65rem] uppercase tracking-[0.35em] text-muted">
                                  Due {formatDueDate(todo.dueDate)}
                                </span>
                              )}
                            </div>
                          </Checkbox>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[0.65rem] font-semibold uppercase tracking-[0.35em] ${
                                todo.isCompleted ? "text-muted" : "text-[color:var(--accent)]"
                              }`}
                            >
                              {todo.isCompleted ? "Done" : "Open"}
                            </span>
                            <Button
                              variant="quiet"
                              onPress={() => navigate({ to: `/todos/${todo.id}` })}
                              isDisabled={activeTodoId === todo.id}
                              className="h-9 px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted hover:text-[color:var(--accent)]"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="quiet"
                              onPress={() => handleDelete(todo.id)}
                              isDisabled={activeTodoId === todo.id}
                              className="h-9 px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted hover:text-[color:var(--accent)]"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </GridListItem>
                  ))}
                </GridList>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
