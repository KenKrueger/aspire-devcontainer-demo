"use client";
import {
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
  Button,
  composeRenderProps,
} from "react-aria-components";
import type { GridListItemProps, GridListProps } from "react-aria-components";
import { tv } from "tailwind-variants";
import { Checkbox } from "@/components/ui/Checkbox";
import { composeTailwindRenderProps, focusRing } from "@/lib/react-aria-utils";

export function GridList<T extends object>({ children, ...props }: GridListProps<T>) {
  return (
    <AriaGridList
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "overflow-auto w-[200px] relative bg-[color:var(--surface)] border border-[color:var(--stroke)] rounded-2xl font-body empty:flex empty:items-center empty:justify-center empty:italic empty:text-sm",
      )}
    >
      {children}
    </AriaGridList>
  );
}

const itemStyles = tv({
  extend: focusRing,
  base: "relative flex gap-3 cursor-default select-none py-2 px-3 text-sm text-ink border-t border-[color:var(--stroke)] border-transparent first:border-t-0 first:rounded-t-2xl last:rounded-b-2xl last:mb-0 -outline-offset-2",
  variants: {
    isSelected: {
      false:
        "hover:bg-[color:var(--surface-strong)] pressed:bg-[color:var(--surface-strong)]",
      true:
        "bg-[color:var(--accent-soft)] hover:bg-[color:var(--accent-soft)] pressed:bg-[color:var(--accent-soft)] border-y-[color:var(--accent-border)] z-20",
    },
    isDisabled: {
      true: "text-muted forced-colors:text-[GrayText] z-10",
    },
  },
});

export function GridListItem({ children, ...props }: GridListItemProps) {
  let textValue = typeof children === "string" ? children : undefined;
  return (
    <AriaGridListItem textValue={textValue} {...props} className={itemStyles}>
      {composeRenderProps(
        children,
        (children, { selectionMode, selectionBehavior, allowsDragging }) => (
          <>
            {/* Add elements for drag and drop and selection. */}
            {allowsDragging && <Button slot="drag">≡</Button>}
            {selectionMode !== "none" && selectionBehavior === "toggle" && (
              <Checkbox slot="selection" />
            )}
            {children}
          </>
        ),
      )}
    </AriaGridListItem>
  );
}
