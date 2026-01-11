"use client";
import { Check, Minus } from "lucide-react";
import { Checkbox as AriaCheckbox, composeRenderProps } from "react-aria-components";
import type { CheckboxProps } from "react-aria-components";
import { tv } from "tailwind-variants";
import { focusRing } from "@/lib/react-aria-utils";

const checkboxStyles = tv({
  base: "flex gap-2 items-center group font-body text-sm transition relative cursor-pointer [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      false: "text-ink",
      true: "text-muted cursor-not-allowed forced-colors:text-[GrayText]",
    },
  },
});

const boxStyles = tv({
  extend: focusRing,
  base: "w-5 h-5 box-border shrink-0 rounded-md flex items-center justify-center border transition shadow-sm",
  variants: {
    isSelected: {
      false:
        "bg-[color:var(--surface-raised)] border-[color:var(--stroke)] group-pressed:border-[color:var(--accent-border)] group-hover:border-[color:var(--accent-border)]",
      true:
        "bg-[color:var(--accent)] border-[color:var(--accent)] group-pressed:bg-[color:var(--accent-strong)] group-hover:brightness-105 forced-colors:bg-[Highlight] forced-colors:border-[Highlight]",
    },
    isInvalid: {
      true:
        "border-[color:var(--danger)] forced-colors:border-[Mark] group-pressed:border-[color:var(--danger-border)]",
    },
    isDisabled: {
      true:
        "border-[color:var(--stroke)] bg-[color:var(--surface-strong)] forced-colors:border-[GrayText]",
    },
  },
});

const iconStyles =
  "w-3.5 h-3.5 text-[color:var(--accent-contrast)] group-disabled:text-muted forced-colors:text-[HighlightText] drop-shadow-sm";

export function Checkbox(props: CheckboxProps) {
  return (
    <AriaCheckbox
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        checkboxStyles({ ...renderProps, className }),
      )}
    >
      {composeRenderProps(
        props.children,
        (children, { isSelected, isIndeterminate, ...renderProps }) => (
          <>
            <div
              className={boxStyles({ isSelected: isSelected || isIndeterminate, ...renderProps })}
            >
              {isIndeterminate ? (
                <Minus aria-hidden className={iconStyles} />
              ) : isSelected ? (
                <Check aria-hidden className={iconStyles} />
              ) : null}
            </div>
            {children}
          </>
        ),
      )}
    </AriaCheckbox>
  );
}
