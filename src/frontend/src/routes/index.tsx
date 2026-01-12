import { createFileRoute, Outlet } from "@tanstack/react-router";
import App from "../App";

type StatusSearch = "open" | "done";
type SortSearch = "due";

type TodoSearch = {
  status?: StatusSearch;
  sort?: SortSearch;
  q?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): TodoSearch => {
    const next: TodoSearch = {};

    const status = search.status;
    if (status === "open" || status === "done") {
      next.status = status;
    }

    const sort = search.sort;
    if (sort === "due") {
      next.sort = sort;
    }

    const q = search.q;
    if (typeof q === "string") {
      const trimmed = q.trim();
      if (trimmed) {
        next.q = trimmed.slice(0, 80);
      }
    }

    return next;
  },
  component: IndexLayout,
});

function IndexLayout() {
  return (
    <>
      <App />
      <Outlet />
    </>
  );
}

