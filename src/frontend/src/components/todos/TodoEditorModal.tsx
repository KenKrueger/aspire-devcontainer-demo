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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md"
    >
      <Modal className="w-full max-w-2xl mx-0 sm:mx-4">
        <Dialog
          aria-labelledby="todo-editor-title"
          className="rounded-t-3xl sm:rounded-3xl border-t border-x sm:border border-stroke bg-surface p-5 sm:p-8 shadow-soft outline-none app-rise max-h-[92vh] overflow-y-auto"
        >
          <TodoEditorContent id={id} onClose={handleClose} />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
