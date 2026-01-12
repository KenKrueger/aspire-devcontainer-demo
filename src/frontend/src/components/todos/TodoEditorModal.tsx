import { useNavigate } from "@tanstack/react-router";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { TodoEditorContent } from "./TodoEditorContent";

export type TodoEditorModalProps = {
  id: string | number;
};

export function TodoEditorModal({ id }: TodoEditorModalProps) {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate({ to: "/" });
  };

  return (
    <ModalOverlay
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        }
      }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-xl mx-4">
        <Dialog
          aria-labelledby="todo-editor-title"
          className="rounded-3xl border border-stroke bg-surface-raised p-6 shadow-soft outline-none app-rise"
        >
          <TodoEditorContent id={id} onClose={handleClose} />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
