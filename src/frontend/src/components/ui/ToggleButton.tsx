"use client";
import { ToggleButton as RACToggleButton, composeRenderProps } from "react-aria-components";
import type { ToggleButtonProps } from "react-aria-components";
import { tv } from "tailwind-variants";
import { focusRing } from "@/lib/react-aria-utils";

let styles = tv({
  extend: focusRing,
  base: "relative inline-flex items-center justify-center gap-2 border border-[color:var(--stroke)] h-9 box-border px-3.5 [&:has(>svg:only-child)]:px-0 [&:has(>svg:only-child)]:h-8 [&:has(>svg:only-child)]:aspect-square font-body text-sm text-center transition rounded-full cursor-pointer forced-color-adjust-none [-webkit-tap-highlight-color:transparent]",
  variants: {
    isSelected: {
      false:
        "bg-[color:var(--surface-raised)] text-muted hover:bg-[color:var(--surface-strong)] pressed:bg-[color:var(--surface-strong)] forced-colors:bg-[ButtonFace]! forced-colors:text-[ButtonText]!",
      true:
        "bg-[color:var(--accent-soft)] border-[color:var(--accent-border)] text-ink shadow-tight forced-colors:bg-[Highlight]! forced-colors:text-[HighlightText]!",
    },
    isDisabled: {
      true:
        "border-transparent bg-[color:var(--surface-strong)] text-muted forced-colors:bg-[ButtonFace]! forced-colors:text-[GrayText]!",
    },
  },
});

export function ToggleButton(props: ToggleButtonProps) {
  return (
    <RACToggleButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, className }),
      )}
    />
  );
}
