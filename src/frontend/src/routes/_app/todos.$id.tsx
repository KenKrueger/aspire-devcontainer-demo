import { createFileRoute } from "@tanstack/react-router";
import { TodoEditorModal } from "@/components/todos";

export const Route = createFileRoute("/_app/todos/$id")({
  component: TodoEditorRoute,
});

function TodoEditorRoute() {
  const { id } = Route.useParams();

  return <TodoEditorModal id={id} />;
}
