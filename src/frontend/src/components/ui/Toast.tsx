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
      className="fixed bottom-4 right-4 flex flex-col-reverse gap-2 rounded-lg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
    >
      {({ toast }) => (
        <MyToast toast={toast}>
          <ToastContent className="flex flex-col flex-1 min-w-0">
            <Text slot="title" className="font-semibold text-white text-sm">
              {toast.content.title}
            </Text>
            {toast.content.description && (
              <Text slot="description" className="text-xs text-white">
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
              className="flex flex-none appearance-none h-8 rounded-md bg-white/15 border-none text-white px-3 text-xs font-semibold outline-none hover:bg-white/20 pressed:bg-white/25 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 [-webkit-tap-highlight-color:transparent]"
            >
              {toast.content.action.label}
            </Button>
          )}

          <Button
            slot="close"
            aria-label="Close"
            className="flex flex-none appearance-none w-8 h-8 rounded-sm bg-transparent border-none text-white p-0 outline-none hover:bg-white/10 pressed:bg-white/15 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 items-center justify-center [-webkit-tap-highlight-color:transparent]"
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
        "flex items-center gap-4 bg-blue-600 px-4 py-3 rounded-lg outline-none forced-colors:outline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 [view-transition-class:toast] font-sans w-[260px]",
      )}
    />
  );
}
