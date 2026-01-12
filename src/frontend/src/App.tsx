import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Checkbox } from "./components/ui/Checkbox";
import { GridList, GridListItem } from "./components/ui/GridList";
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

type TodoSearch = {
  status?: "open" | "done";
  sort?: "due";
  q?: string;
};

const statusOptions: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "done", label: "Done" },
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
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as TodoSearch;
  const statusFilter: StatusFilter = search.status ?? "all";
  const sortFilter: SortFilter = search.sort === "due" ? "due" : "newest";
  const queryFilter = search.q ?? "";
  const trimmedQuery = queryFilter.trim();

  const [searchInput, setSearchInput] = useState(queryFilter);

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  }, [queryClient, sortFilter, statusFilter, trimmedQuery]);

  useEffect(() => {
    const normalized = searchInput.trim();

    if (normalized === trimmedQuery) {
      return;
    }

    const handle = window.setTimeout(() => {
      navigate({
        to: ".",
        search: (prev: TodoSearch) => ({
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
      to: ".",
      search: (prev: TodoSearch) => ({
        ...prev,
        status: nextValue === "all" ? undefined : nextValue,
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-8 sm:py-8">
        <header className="relative z-20 flex items-center justify-between app-rise" style={{ animationDelay: "60ms" }}>
          <div className="flex flex-col">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-ink">
              Tasks
            </h1>
            <span className="text-[0.6rem] sm:text-[0.65rem] text-muted/60 tracking-widest uppercase font-medium">{todayLabel}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`text-[0.6rem] sm:text-[0.65rem] uppercase tracking-widest font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm ${
              remainingCount === 0 
                ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
                : overdueCount > 0
                  ? "bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                  : dueSoonCount > 0
                    ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                    : "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
            }`}>
              {remainingCount} open
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-muted/50 transition-all hover:text-muted hover:bg-surface-strong/50 shadow-sm hover:shadow"
                aria-label="Settings"
                aria-expanded={settingsOpen}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              {settingsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setSettingsOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 app-scale-in">
                    <div className="rounded-xl border border-stroke bg-surface p-3 shadow-soft min-w-[160px]">
                      <span className="block mb-3 text-[0.65rem] uppercase tracking-widest text-muted/60 font-semibold px-1">Theme</span>
                      <div className="flex flex-col gap-1">
                        {themeOptions.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              setTheme(option.key);
                              setSettingsOpen(false);
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              theme === option.key
                                ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)] shadow-sm"
                                : "text-ink hover:bg-surface-strong/60 hover:shadow-sm"
                            }`}
                          >
                            {option.key === "light" && (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                              </svg>
                            )}
                            {option.key === "dark" && (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                              </svg>
                            )}
                            {option.key === "system" && (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                              </svg>
                            )}
                            <span className="flex-1">{option.label}</span>
                            {theme === option.key && (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex flex-col gap-4">
          {/* Compose form */}
          <section className="app-rise" style={{ animationDelay: "100ms" }}>
            <form
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center p-3 sm:p-4 -mx-3 rounded-xl sm:rounded-2xl bg-surface border border-stroke/40 shadow-sm hover:shadow-md transition-shadow"
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
                    placeholder="Add a new task..."
                    className="flex-1 min-w-0"
                  />
                )}
              />
              <div className="flex gap-2 sm:gap-3">
                <createForm.AppField
                  name="dueDate"
                  children={() => (
                    <AppTextField
                      aria-label="Due date"
                      type="date"
                      className="flex-1 sm:w-[140px] sm:shrink-0"
                    />
                  )}
                />
                <createForm.AppForm>
                  <AppSubmitButton className="h-11 px-5 sm:px-6 text-sm font-semibold rounded-xl shrink-0 shadow-sm hover:shadow-md transition-shadow uppercase tracking-wide whitespace-nowrap">
                    <span className="hidden sm:inline">Add Task</span>
                    <span className="sm:hidden">Add</span>
                  </AppSubmitButton>
                </createForm.AppForm>
              </div>
            </form>
          </section>

          {/* Task list */}
          <section
            className="flex flex-col gap-2 app-rise"
            style={{ animationDelay: "120ms" }}
          >
            {/* Filter pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-strong/40 shadow-sm">
                {statusOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleStatusChange(option.key)}
                    className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-all uppercase tracking-wider ${
                      statusFilter === option.key
                        ? "bg-[color:var(--accent)] text-white shadow-md"
                        : "text-muted hover:text-ink hover:bg-surface-strong/60"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <SearchField
                  aria-label="Search"
                  placeholder="Search..."
                  value={searchInput}
                  onChange={setSearchInput}
                  className="flex-1 sm:w-32 md:w-48"
                />
                <button
                  type="button"
                  onClick={refreshTodos}
                  disabled={loading}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-muted/50 hover:text-ink hover:bg-surface-strong/60 transition-all shadow-sm hover:shadow disabled:opacity-50"
                  aria-label="Refresh"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-[2px] border-current border-t-transparent" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                className="rounded-lg border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger)] shadow-sm app-scale-in flex items-start gap-2"
                role="alert"
              >
                <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span className="flex-1 font-medium">{errorMessage}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-stroke/70 bg-surface-strong/30 px-4 py-12 text-center app-fade-in">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                <span className="text-sm font-medium text-ink/70">Loading tasks...</span>
              </div>
            ) : visibleTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center app-fade-in">
                <div className="w-16 h-16 mb-5 rounded-2xl bg-surface-strong/60 flex items-center justify-center shadow-sm">
                  <svg className="w-8 h-8 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-ink/80 mb-2">
                  {todos.length === 0
                    ? "No tasks yet"
                    : trimmedQuery
                      ? "No matches found"
                      : statusFilter === "open"
                        ? "All done!"
                        : "Nothing completed"}
                </p>
                <p className="text-sm text-muted/60 max-w-xs">
                  {todos.length === 0
                    ? "Add your first task above to get started"
                    : trimmedQuery
                      ? `Try a different search term`
                      : statusFilter === "open"
                        ? "Time to celebrate 🎉"
                        : "Complete some tasks to see them here"}
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
                          <span className={`text-xs tabular-nums font-medium transition-colors ${badgeClass}`}>
                            {isOverdue && "⚠️ "}
                            {formatDueDate(todo.dueDate)}
                          </span>
                        );
                      }
                    }

                    return (
                      <GridListItem id={todo.id} key={todo.id} textValue={todo.title}>
                        <div
                          className={`group flex w-full items-center gap-3 py-3 px-3 -mx-3 rounded-xl transition-all hover:bg-surface-strong/50 hover:shadow-sm ${
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
                          <button
                            type="button"
                            onClick={() => !isActive && handleToggle(todo, !todo.isCompleted)}
                            disabled={isActive}
                            className={`min-w-0 flex-1 text-left text-[0.9rem] leading-snug transition-all cursor-pointer hover:opacity-80 ${
                              todo.isCompleted ? "text-muted/50 line-through decoration-muted/40 decoration-1" : "text-ink font-medium"
                            }`}
                          >
                            {todo.title}
                          </button>
                          {dueBadge}
                          <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => navigate({ to: `/todos/${todo.id}` })}
                              disabled={isActive}
                              className="h-9 w-9 rounded-lg flex items-center justify-center text-muted/30 hover:text-ink hover:bg-surface-strong/70 transition-all shadow-sm hover:shadow"
                              aria-label="Edit"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(todo.id)}
                              disabled={isActive}
                              className="h-9 w-9 rounded-lg flex items-center justify-center text-muted/30 hover:text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)] transition-all shadow-sm hover:shadow"
                              aria-label="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
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
