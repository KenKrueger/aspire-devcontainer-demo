import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  deleteApiTodosById,
  patchApiTodosById,
  postApiTodosByIdRestore,
} from "../client";
import { queryClient } from "./query-client";

export type TodoItem = {
  id: number;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  sortOrder: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export const todosQueryKey = ["todos"] as const;

const apiBaseUrl = typeof window === "undefined" ? "" : window.location.origin;

const toUpdateRequest = (changes: Partial<TodoItem>) => {
  const dueDate = changes.dueDate;

  return {
    title: changes.title ?? null,
    notes: changes.notes ?? null,
    dueDate: dueDate ?? null,
    clearDueDate: dueDate === null,
    sortOrder:
      changes.sortOrder !== undefined && changes.sortOrder !== null
        ? String(changes.sortOrder)
        : null,
    isCompleted: changes.isCompleted ?? null,
  };
};

const parseTodos = (data: unknown): TodoItem[] => (Array.isArray(data) ? (data as TodoItem[]) : []);

const getMutationPayload = (mutation: {
  changes?: Partial<TodoItem>;
  modified?: Partial<TodoItem>;
  original?: TodoItem;
}) => mutation.changes ?? mutation.modified ?? {};

export const todoCollection = createCollection(
  queryCollectionOptions<TodoItem, unknown, typeof todosQueryKey, number>({
    queryKey: todosQueryKey,
    queryClient,
     queryFn: async () => {
       const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);

       const status = params?.get("status");
       const completed = status === "open" ? false : status === "done" ? true : undefined;
       const sort = params?.get("sort") === "due" ? "due" : undefined;
       const q = params?.get("q")?.trim();

       const query = new URLSearchParams();
       query.set("page", "1");
       query.set("pageSize", "100");

       if (completed !== undefined) {
         query.set("completed", String(completed));
       }

       if (sort) {
         query.set("sort", sort);
       }

       if (q) {
         query.set("q", q);
       }

       const response = await fetch(`${apiBaseUrl}/api/todos?${query.toString()}`);

       if (!response.ok) {
         throw new Error("Could not load todos.");
       }

       const data: unknown = await response.json();
       return parseTodos(data);
     },
    getKey: (item) => item.id,
    onUpdate: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      const changes = getMutationPayload(mutation);
      const targetId = mutation.original?.id ?? changes.id;

      if (!targetId) {
        throw new Error("Could not determine which todo to update.");
      }

      const result = await patchApiTodosById({
        baseUrl: apiBaseUrl,
        path: { id: targetId },
        body: toUpdateRequest(changes),
      });

      if (result.error) {
        throw new Error("Could not update this todo.");
      }

      await queryClient.invalidateQueries({ queryKey: todosQueryKey });
    },
    onDelete: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      const targetId = mutation.original?.id;

      if (!targetId) {
        throw new Error("Could not determine which todo to delete.");
      }

      const result = await deleteApiTodosById({
        baseUrl: apiBaseUrl,
        path: { id: targetId },
      });

      if (result.error) {
        throw new Error("Could not delete this todo.");
      }

      await queryClient.invalidateQueries({ queryKey: todosQueryKey });
    },
  }),
);

export const restoreTodo = async (todoId: number) => {
  const result = await postApiTodosByIdRestore({
    baseUrl: apiBaseUrl,
    path: { id: todoId },
  });

  if (result.error) {
    throw new Error("Could not restore this todo.");
  }

  await queryClient.invalidateQueries({ queryKey: todosQueryKey });
};
