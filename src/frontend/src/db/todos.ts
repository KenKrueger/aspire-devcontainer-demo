import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { deleteApiTodosById, getApiTodos, patchApiTodosById } from "../client";
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

const toUpdateRequest = (changes: Partial<TodoItem>) => ({
  title: changes.title ?? null,
  notes: changes.notes ?? null,
  dueDate: changes.dueDate ?? null,
  sortOrder:
    changes.sortOrder !== undefined && changes.sortOrder !== null
      ? String(changes.sortOrder)
      : null,
  isCompleted: changes.isCompleted ?? null,
});

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
      const result = await getApiTodos({ baseUrl: apiBaseUrl });

      if (result.error) {
        throw new Error("Could not load todos.");
      }

      return parseTodos(result.data);
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
