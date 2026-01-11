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
    nextDueTodo,
    nextDueStatus,
    nextDueLabel,
    startOfToday,
    soonThreshold,
  } = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const soonWindow = new Date(dayStart);
    soonWindow.setDate(soonWindow.getDate() + 3);

    let overdue = 0;
    let dueSoon = 0;
    let nextDue: TodoItem | null = null;
    let nextDueTime = Number.POSITIVE_INFINITY;

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

      if (dueTime < nextDueTime) {
        nextDueTime = dueTime;
        nextDue = todo;
      }
    }

    let status: "overdue" | "soon" | "future" | null = null;
    let label: string | null = null;
    if (nextDue && Number.isFinite(nextDueTime)) {
      if (nextDueTime < dayStart.getTime()) {
        status = "overdue";
      } else if (nextDueTime <= soonWindow.getTime()) {
        status = "soon";
      } else {
        status = "future";
      }
      label = nextDue.dueDate ? formatDueDate(nextDue.dueDate) : null;
    }

    return {
      overdueCount: overdue,
      dueSoonCount: dueSoon,
      nextDueTodo: nextDue,
      nextDueStatus: status,
      nextDueLabel: label,
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
  const openSummaryText =
    remainingCount === 0
      ? "All caught up for now."
      : overdueCount > 0
        ? `${overdueCount} overdue`
        : dueSoonCount > 0
          ? `${dueSoonCount} due soon`
          : "No deadlines in the next 3 days";
  const openCountTone =
    remainingCount === 0
      ? "text-success"
      : overdueCount > 0
        ? "text-danger"
        : dueSoonCount > 0
          ? "text-[color:var(--accent-strong)]"
          : "text-ink";
  const openCardBorder =
    remainingCount === 0
      ? "border-[color:var(--success-border)]"
      : overdueCount > 0
        ? "border-[color:var(--danger-border)]"
        : dueSoonCount > 0
          ? "border-[color:var(--accent-border)]"
          : "border-stroke";
  const nextDueTextTone = nextDueTodo
    ? nextDueStatus === "overdue"
      ? "text-danger"
      : nextDueStatus === "soon"
        ? "text-[color:var(--accent-strong)]"
        : "text-ink"
    : "text-muted";
  const nextDueCardBorder =
    nextDueStatus === "overdue"
      ? "border-[color:var(--danger-border)]"
      : nextDueStatus === "soon"
        ? "border-[color:var(--accent-border)]"
        : "border-stroke";
  const nextDueSubline = nextDueTodo
    ? nextDueStatus === "overdue"
      ? `Overdue: ${nextDueTodo.title}`
      : nextDueStatus === "soon"
        ? `Due soon: ${nextDueTodo.title}`
        : nextDueTodo.title
    : "Add a due date to shape the pace.";
  const activeFilterTags = useMemo(() => {
    const tags: string[] = [];

    if (statusFilter !== "all") {
      const statusLabel = statusFilter === "open" ? "Open" : "Done";
      tags.push(`Status: ${statusLabel}`);
    }

    if (sortFilter === "due") {
      tags.push("Sort: due date");
    }

    if (trimmedQuery) {
      const trimmed =
        trimmedQuery.length > 24 ? `${trimmedQuery.slice(0, 24)}...` : trimmedQuery;
      tags.push(`Search: ${trimmed}`);
    }

    return tags;
  }, [sortFilter, statusFilter, trimmedQuery]);

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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <header className="flex flex-col gap-3 app-rise" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-surface px-2.5 py-1 text-[0.6rem] font-medium text-ink shadow-tight">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_0_2px_var(--accent-glow)] animate-pulse" />
                Task Studio
              </span>
              <span className="text-[0.6rem] text-muted">{todayLabel}</span>
            </div>
            <div className="relative group">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stroke bg-surface text-muted transition-all hover:bg-surface-strong hover:text-ink"
                aria-label="Settings"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-2 z-50 hidden group-hover:block">
                <div className="rounded-lg border border-stroke bg-surface p-2.5 shadow-soft">
                  <span className="block mb-1.5 text-[0.55rem] uppercase tracking-[0.25em] text-muted">Theme</span>
                  <ToggleButtonGroup
                    aria-label="Theme"
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={selectedThemeKeys}
                    onSelectionChange={handleThemeChange}
                    className="rounded-md border border-stroke bg-surface-strong px-0.5 py-0.5 shadow-none"
                  >
                    {themeOptions.map((option) => (
                      <ToggleButton
                        id={option.key}
                        key={option.key}
                        className="h-6 rounded px-2 text-[0.55rem] font-semibold tracking-[0.15em]"
                      >
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </div>
              </div>
            </div>
          </div>

          {/* Compact stats bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-1.5 rounded-full border ${openCardBorder} bg-surface px-2.5 py-1 shadow-tight transition-all duration-200 hover:shadow-soft cursor-default`}>
              <span className={`font-display text-base font-semibold tabular-nums ${openCountTone}`}>{remainingCount}</span>
              <span className="text-[0.6rem] text-muted">open</span>
              {overdueCount > 0 && (
                <span className="ml-0.5 rounded-full bg-[color:var(--danger-soft)] px-1.5 py-0.5 text-[0.55rem] font-medium text-danger animate-pulse">
                  {overdueCount} overdue
                </span>
              )}
            </div>
            {nextDueTodo && (
              <div className={`inline-flex items-center gap-1.5 rounded-full border ${nextDueCardBorder} bg-surface px-2.5 py-1 shadow-tight transition-all duration-200 hover:shadow-soft cursor-default`}>
                <span className="text-[0.6rem] text-muted">Next:</span>
                <span className={`text-[0.7rem] font-medium ${nextDueTextTone}`}>{nextDueLabel}</span>
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-surface px-2.5 py-1 shadow-tight transition-all duration-200 hover:shadow-soft cursor-default">
              <div className="h-1 w-12 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="text-[0.6rem] font-medium text-muted">{completionRate}%</span>
            </div>
          </div>

        </header>

        <main className="flex flex-col gap-3">
          {/* Compact inline compose form */}
          <section className="app-rise" style={{ animationDelay: "100ms" }}>
            <form
              className="flex flex-col gap-3 rounded-xl border border-[color:var(--accent-border)] bg-gradient-to-r from-[color:var(--accent-soft)] to-surface p-3 shadow-tight transition-all duration-300 hover:shadow-soft focus-within:shadow-soft focus-within:border-[color:var(--accent)] sm:flex-row sm:items-end sm:gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                createForm.handleSubmit();
              }}
            >
              <createForm.AppField
                name="title"
                children={() => (
                  <AppTextField
                    label="New task"
                    aria-label="Todo title"
                    placeholder="What needs to be done?"
                    className="flex-1 min-w-0"
                  />
                )}
              />
              <div className="flex items-end gap-2 sm:gap-3">
                <createForm.AppField
                  name="dueDate"
                  children={() => (
                    <AppTextField
                      label="Due"
                      optionalLabel=""
                      aria-label="Due date"
                      type="date"
                      className="w-[120px] shrink-0"
                    />
                  )}
                />
                <createForm.AppForm>
                  <AppSubmitButton className="h-[38px] px-4 text-[0.6rem] font-semibold uppercase tracking-[0.1em] rounded-lg shadow-tight hover:shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 shrink-0">
                    Add
                  </AppSubmitButton>
                </createForm.AppForm>
              </div>
            </form>
          </section>

          {/* Task list - primary focus */}
          <section
            className="flex flex-col gap-3 rounded-xl border border-stroke bg-surface/80 backdrop-blur-sm p-3 sm:p-4 shadow-tight app-rise"
            style={{ animationDelay: "140ms" }}
          >
            {/* Compact toolbar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">Tasks</span>
                  <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[0.65rem] font-medium text-muted">
                    {visibleTodos.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ToggleButtonGroup
                    aria-label="Status"
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={selectedStatusKeys}
                    onSelectionChange={handleStatusChange}
                    className="rounded-lg border border-stroke bg-surface-strong px-0.5 py-0.5 shadow-none"
                  >
                    {statusOptions.map((option) => (
                      <ToggleButton
                        id={option.key}
                        key={option.key}
                        className="h-6 rounded px-2 text-[0.55rem] font-semibold tracking-[0.08em]"
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
                    className="hidden sm:flex rounded-lg border border-stroke bg-surface-strong px-0.5 py-0.5 shadow-none"
                  >
                    {sortOptions.map((option) => (
                      <ToggleButton
                        id={option.key}
                        key={option.key}
                        className="h-6 rounded px-2 text-[0.55rem] font-semibold tracking-[0.08em]"
                      >
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Button
                    variant="quiet"
                    onPress={refreshTodos}
                    isDisabled={loading}
                    className="h-7 w-7 rounded-lg p-0 text-muted hover:text-ink"
                    aria-label="Refresh"
                  >
                    {loading ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
              <SearchField
                aria-label="Search"
                placeholder="Search tasks..."
                value={searchInput}
                onChange={setSearchInput}
                className="w-full"
              />
            </div>

            {errorMessage && (
              <div
                className="rounded-lg border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-3 py-2 text-[0.75rem] text-[color:var(--danger)]"
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
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stroke bg-surface-strong px-4 py-8 text-center">
                <span className="text-xl mb-2">✨</span>
                <p className="text-sm font-medium text-ink">
                  {todos.length === 0
                    ? "Ready when you are"
                    : trimmedQuery
                      ? `No matches for "${trimmedQuery}"`
                      : statusFilter === "open"
                        ? "All clear!"
                        : "No completed tasks yet"}
                </p>
                <p className="mt-0.5 text-[0.75rem] text-muted">
                  {todos.length === 0 ? "Add your first task above." : "Try adjusting filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <GridList
                  aria-label="Todo list"
                  selectionMode="none"
                  className="w-full border-transparent bg-transparent shadow-none todo-gridlist grid gap-2"
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
                          ? "text-muted"
                          : isOverdue
                            ? "text-[color:var(--danger)]"
                            : isDueSoon
                              ? "text-[color:var(--accent-strong)]"
                              : "text-muted";

                        dueBadge = (
                          <span className={`inline-flex items-center gap-1 text-[0.7rem] ${badgeClass}`}>
                            {isOverdue && <span>⚠️</span>}
                            {formatDueDate(todo.dueDate)}
                          </span>
                        );
                      }
                    }

                    return (
                      <GridListItem id={todo.id} key={todo.id} textValue={todo.title}>
                        <div
                          className={`group flex w-full items-center gap-3 rounded-xl border border-stroke bg-surface px-3 py-2.5 transition-all duration-150 hover:border-[color:var(--accent-border)] hover:bg-surface-strong/30 ${
                            isActive ? "opacity-60" : ""
                          } ${todo.isCompleted ? "bg-surface-strong/40" : ""}`}
                        >
                          <Checkbox
                            name={`todo-${todo.id}`}
                            isSelected={todo.isCompleted}
                            onChange={(value) => handleToggle(todo, value)}
                            isDisabled={isActive}
                            className="shrink-0"
                          />
                          <span
                            className={`min-w-0 flex-1 truncate text-sm ${
                              todo.isCompleted ? "text-muted line-through" : "text-ink"
                            }`}
                          >
                            {todo.title}
                          </span>
                          {dueBadge}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="quiet"
                              onPress={() => navigate({ to: `/todos/${todo.id}` })}
                              isDisabled={isActive}
                              className="h-7 w-7 rounded-lg p-0 text-muted hover:bg-surface-strong hover:text-[color:var(--accent)]"
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
                              className="h-7 w-7 rounded-lg p-0 text-muted hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
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
