import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "./components/ui/Button";
import { Checkbox } from "./components/ui/Checkbox";
import { GridList, GridListItem } from "./components/ui/GridList";
import { ToggleButton } from "./components/ui/ToggleButton";
import { ToggleButtonGroup } from "./components/ui/ToggleButtonGroup";
import { SearchField } from "./components/ui/SearchField";
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

const headerDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const formatDueDate = (value: string) => dueDateFormatter.format(new Date(value));
const formatHeaderDate = (value: Date) => headerDateFormatter.format(value);

function App() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const statusFilter: StatusFilter = search.status ?? "all";
  const sortFilter: SortFilter = search.sort === "due" ? "due" : "newest";
  const queryFilter = search.q ?? "";
  const trimmedQuery = queryFilter.trim();

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
  const openTodos = useMemo(() => todos.filter((todo) => !todo.isCompleted), [todos]);
  const {
    overdueCount,
    dueSoonCount,
    startOfToday,
    soonThreshold,
  } = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const soonWindow = new Date(dayStart);
    soonWindow.setDate(soonWindow.getDate() + 3);

    let overdue = 0;
    let dueSoon = 0;
    for (const todo of openTodos) {
      if (!todo.dueDate) {
        continue;
      }

      const dueTime = Date.parse(todo.dueDate);
      if (Number.isNaN(dueTime)) {
        continue;
      }

      if (dueTime < dayStart.getTime()) {
        overdue += 1;
      } else if (dueTime <= soonWindow.getTime()) {
        dueSoon += 1;
      }
    }

    return {
      overdueCount: overdue,
      dueSoonCount: dueSoon,
      startOfToday: dayStart,
      soonThreshold: soonWindow,
    };
  }, [openTodos]);
  const todayLabel = useMemo(() => formatHeaderDate(new Date()), []);
  const selectedThemeKeys = useMemo(() => new Set([theme]), [theme]);
  const selectedStatusKeys = useMemo(() => new Set([statusFilter]), [statusFilter]);
  const selectedSortKeys = useMemo(() => new Set([sortFilter]), [sortFilter]);
  const loadError = isError ? "Could not load todos." : null;
  const errorMessage = mutationError ?? loadError;
  const loading = isLoading || refreshing;
  const hasMounted = useRef(false);
  const openCountTone =
    remainingCount === 0
      ? "text-success"
      : overdueCount > 0
        ? "text-danger"
        : dueSoonCount > 0
          ? "text-[color:var(--accent-strong)]"
          : "text-ink";

  useEffect(() => {
    setSearchInput(queryFilter);
  }, [queryFilter]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    queryClient.invalidateQueries({ queryKey: todosQueryKey });
  }, [queryClient, sortFilter, statusFilter, trimmedQuery]);

  useEffect(() => {
    const normalized = searchInput.trim();

    if (normalized === trimmedQuery) {
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
  }, [navigate, searchInput, trimmedQuery]);

  const visibleTodos = useMemo(() => {
    const normalizedQuery = trimmedQuery.toLowerCase();

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
  }, [sortFilter, statusFilter, todos, trimmedQuery]);

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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-10">
        <header className="relative z-20 flex flex-col gap-4 app-rise" style={{ animationDelay: "60ms" }}>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Tasks
              </h1>
              <span className="text-xs text-muted mt-0.5">{todayLabel}</span>
            </div>
            <div className="relative group">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted/50 transition-all hover:text-muted"
                aria-label="Settings"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block">
                <div className="rounded-md border border-stroke bg-surface p-2 shadow-tight">
                  <span className="block mb-1 text-[0.6rem] uppercase tracking-widest text-muted/60">Theme</span>
                  <ToggleButtonGroup
                    aria-label="Theme"
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={selectedThemeKeys}
                    onSelectionChange={handleThemeChange}
                    className="rounded border border-stroke bg-surface-strong px-0.5 py-0.5 shadow-none"
                  >
                    {themeOptions.map((option) => (
                      <ToggleButton
                        id={option.key}
                        key={option.key}
                        className="h-5 rounded px-2 text-[0.55rem] font-medium"
                      >
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </div>
              </div>
            </div>
          </div>

          {/* Minimal progress indicator */}
          <div className="flex items-center gap-3 text-xs">
            <span className={`tabular-nums font-medium ${openCountTone}`}>{remainingCount} open</span>
            <div className="flex-1 h-px bg-stroke" />
            <span className="tabular-nums text-muted/60">{completionRate}%</span>
          </div>
        </header>

        <main className="flex flex-col gap-3">
          {/* Minimal compose form */}
          <section className="app-rise" style={{ animationDelay: "100ms" }}>
            <form
              className="flex gap-2 items-center"
              onSubmit={(e) => {
                e.preventDefault();
                createForm.handleSubmit();
              }}
            >
              <createForm.AppField
                name="title"
                children={() => (
                  <AppTextField
                    aria-label="New task"
                    placeholder="Add a task..."
                    className="flex-1 min-w-0"
                  />
                )}
              />
              <createForm.AppField
                name="dueDate"
                children={() => (
                  <AppTextField
                    aria-label="Due date"
                    type="date"
                    className="w-[130px] shrink-0 hidden sm:block"
                  />
                )}
              />
              <createForm.AppForm>
                <AppSubmitButton className="h-10 px-4 text-xs font-medium rounded-md shrink-0">
                  <span className="hidden sm:inline">Add</span>
                  <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </AppSubmitButton>
              </createForm.AppForm>
            </form>
          </section>

          {/* Divider */}
          <div className="h-px bg-stroke/60 app-rise" style={{ animationDelay: "120ms" }} />

          {/* Task list */}
          <section
            className="flex flex-col gap-3 app-rise"
            style={{ animationDelay: "140ms" }}
          >
            {/* Toolbar - inline with search */}
            <div className="flex items-center gap-3">
              <SearchField
                aria-label="Search"
                placeholder="Search..."
                value={searchInput}
                onChange={setSearchInput}
                className="flex-1 min-w-0"
              />
              <div className="flex items-center gap-1 shrink-0">
                <ToggleButtonGroup
                  aria-label="Status"
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={selectedStatusKeys}
                  onSelectionChange={handleStatusChange}
                  className="rounded border border-stroke bg-surface-strong/50 px-0.5 py-0.5 shadow-none"
                >
                  {statusOptions.map((option) => (
                    <ToggleButton
                      id={option.key}
                      key={option.key}
                      className="h-6 rounded px-2 text-[0.65rem] font-medium"
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
                  className="hidden sm:flex rounded border border-stroke bg-surface-strong/50 px-0.5 py-0.5 shadow-none"
                >
                  {sortOptions.map((option) => (
                    <ToggleButton
                      id={option.key}
                      key={option.key}
                      className="h-6 rounded px-2 text-[0.65rem] font-medium"
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <Button
                  variant="quiet"
                  onPress={refreshTodos}
                  isDisabled={loading}
                  className="h-6 w-6 rounded p-0 text-muted/40 hover:text-ink"
                  aria-label="Refresh"
                >
                  {loading ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  )}
                </Button>
              </div>
            </div>

            {errorMessage && (
              <div
                className="rounded-md border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-2.5 py-1.5 text-[0.7rem] text-[color:var(--danger)]"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-stroke bg-surface-strong px-4 py-8 text-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                <span className="text-sm text-muted">Loading...</span>
              </div>
            ) : visibleTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted">
                  {todos.length === 0
                    ? "No tasks yet"
                    : trimmedQuery
                      ? `No matches for "${trimmedQuery}"`
                      : statusFilter === "open"
                        ? "All done!"
                        : "Nothing completed"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stroke/40">
                <GridList
                  aria-label="Todo list"
                  selectionMode="none"
                  className="w-full border-transparent bg-transparent shadow-none todo-gridlist"
                >
                  {visibleTodos.map((todo) => {
                    const isActive = activeTodoId === todo.id;
                    let dueBadge = null;

                    if (todo.dueDate) {
                      const dueTime = Date.parse(todo.dueDate);
                      if (!Number.isNaN(dueTime)) {
                        const isOverdue = dueTime < startOfToday.getTime();
                        const isDueSoon =
                          dueTime >= startOfToday.getTime() &&
                          dueTime <= soonThreshold.getTime();
                        const badgeClass = todo.isCompleted
                          ? "text-muted/50"
                          : isOverdue
                            ? "text-[color:var(--danger)]"
                            : isDueSoon
                              ? "text-[color:var(--accent-strong)]"
                              : "text-muted/60";

                        dueBadge = (
                          <span className={`text-xs tabular-nums ${badgeClass}`}>
                            {isOverdue && "! "}
                            {formatDueDate(todo.dueDate)}
                          </span>
                        );
                      }
                    }

                    return (
                      <GridListItem id={todo.id} key={todo.id} textValue={todo.title}>
                        <div
                          className={`group flex w-full items-center gap-3 py-3 transition-colors ${
                            isActive ? "opacity-50" : ""
                          }`}
                        >
                          <Checkbox
                            name={`todo-${todo.id}`}
                            isSelected={todo.isCompleted}
                            onChange={(value) => handleToggle(todo, value)}
                            isDisabled={isActive}
                            className="shrink-0"
                          />
                          <span
                            className={`min-w-0 flex-1 text-sm ${
                              todo.isCompleted ? "text-muted/50 line-through" : "text-ink"
                            }`}
                          >
                            {todo.title}
                          </span>
                          {dueBadge}
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="quiet"
                              onPress={() => navigate({ to: `/todos/${todo.id}` })}
                              isDisabled={isActive}
                              className="h-7 w-7 rounded-md p-0 text-muted/40 hover:text-ink hover:bg-surface-strong"
                              aria-label="Edit"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                              </svg>
                            </Button>
                            <Button
                              variant="quiet"
                              onPress={() => handleDelete(todo.id)}
                              isDisabled={isActive}
                              className="h-7 w-7 rounded-md p-0 text-muted/40 hover:text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)]"
                              aria-label="Delete"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </GridListItem>
                    );
                  })}
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
