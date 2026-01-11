"use client";
import { type CSSProperties } from "react";
import {
  UNSTABLE_ToastRegion as ToastRegion,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastContent as ToastContent,
  type ToastProps,
  Button,
  Text,
} from "react-aria-components";
import { XIcon } from "lucide-react";
import { composeTailwindRenderProps } from "@/lib/react-aria-utils";
import { flushSync } from "react-dom";

interface MyToastContent {
  title: string;
  description?: string;
  action?: {
    label: string;
    onAction: () => void | Promise<void>;
  };
}

export const queue = new ToastQueue<MyToastContent>({
  wrapUpdate(fn) {
    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        flushSync(fn);
      });
    } else {
      fn();
    }
  },
});

export function MyToastRegion() {
  return (
    <ToastRegion
      queue={queue}
      className="fixed bottom-4 right-4 flex flex-col-reverse gap-2 rounded-lg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[color:var(--ring)] focus-visible:outline-offset-2"
    >
      {({ toast }) => (
        <MyToast toast={toast}>
          <ToastContent className="flex flex-col flex-1 min-w-0">
            <Text slot="title" className="font-semibold text-[color:var(--accent-contrast)] text-sm">
              {toast.content.title}
            </Text>
            {toast.content.description && (
              <Text
                slot="description"
                className="text-xs text-[color:var(--accent-contrast)] opacity-80"
              >
                {toast.content.description}
              </Text>
            )}
          </ToastContent>

          {toast.content.action && (
            <Button
              aria-label={toast.content.action.label}
              onPress={async () => {
                await toast.content.action?.onAction();
                toast.onClose?.();
              }}
              className="flex flex-none appearance-none h-8 rounded-full bg-[color:var(--accent-contrast)]/15 border border-[color:var(--accent-contrast)]/40 text-[color:var(--accent-contrast)] px-3 text-xs font-semibold outline-none hover:bg-[color:var(--accent-contrast)]/25 pressed:bg-[color:var(--accent-contrast)]/30 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[color:var(--accent-contrast)] focus-visible:outline-offset-2 [-webkit-tap-highlight-color:transparent]"
            >
              {toast.content.action.label}
            </Button>
          )}

          <Button
            slot="close"
            aria-label="Close"
            className="flex flex-none appearance-none w-8 h-8 rounded-full bg-transparent border-none text-[color:var(--accent-contrast)] p-0 outline-none hover:bg-[color:var(--accent-contrast)]/15 pressed:bg-[color:var(--accent-contrast)]/20 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[color:var(--accent-contrast)] focus-visible:outline-offset-2 items-center justify-center [-webkit-tap-highlight-color:transparent]"
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </MyToast>
      )}
    </ToastRegion>
  );
}

export function MyToast(props: ToastProps<MyToastContent>) {
  return (
    <Toast
      {...props}
      style={{ viewTransitionName: props.toast.key } as CSSProperties}
      className={composeTailwindRenderProps(
        props.className,
        "flex items-center gap-4 bg-[color:var(--accent)] px-4 py-3 rounded-2xl outline-none border border-[color:var(--accent-border)] shadow-tight forced-colors:outline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[color:var(--ring)] focus-visible:outline-offset-2 [view-transition-class:toast] font-body w-[260px]",
      )}
    />
  );
}
