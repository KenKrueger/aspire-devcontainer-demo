"use client";
import {
  composeRenderProps,
  Button as RACButton,
  type ButtonProps as RACButtonProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";
import { focusRing } from "@/lib/react-aria-utils";

export interface ButtonProps extends RACButtonProps {
  /** @default 'primary' */
  variant?: "primary" | "secondary" | "destructive" | "icon";
}

let button = tv({
  extend: focusRing,
  base: "relative inline-flex items-center justify-center border-0 font-body text-sm text-center transition rounded-full cursor-pointer p-1 text-muted bg-transparent hover:bg-[color:var(--surface-strong)] pressed:bg-[color:var(--surface-strong)] disabled:bg-transparent [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      true:
        "bg-[color:var(--surface-strong)] text-muted forced-colors:text-[GrayText] border-transparent",
    },
  },
});

export function FieldButton(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({ ...renderProps, className }),
      )}
    >
      {props.children}
    </RACButton>
  );
}
