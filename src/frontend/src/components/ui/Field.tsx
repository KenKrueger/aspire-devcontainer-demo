"use client";
import {
  FieldError as RACFieldError,
  Group,
  Input as RACInput,
  Label as RACLabel,
  Text,
  composeRenderProps,
} from "react-aria-components";
import type {
  FieldErrorProps,
  GroupProps,
  InputProps,
  LabelProps,
  TextProps,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";
import { composeTailwindRenderProps, focusRing } from "@/lib/react-aria-utils";

export function Label(props: LabelProps) {
  return (
    <RACLabel
      {...props}
      className={twMerge(
        "font-body text-[0.7rem] text-muted font-medium cursor-default w-fit",
        props.className,
      )}
    />
  );
}

export function Description(props: TextProps) {
  return (
    <Text
      {...props}
      slot="description"
      className={twMerge("text-xs text-muted", props.className)}
    />
  );
}

export function FieldError(props: FieldErrorProps) {
  return (
    <RACFieldError
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "text-xs text-[color:var(--danger)] forced-colors:text-[Mark]",
      )}
    />
  );
}

export const fieldBorderStyles = tv({
  base: "transition",
  variants: {
    isFocusWithin: {
      false:
        "border-[color:var(--stroke)] hover:border-[color:var(--accent-border)] forced-colors:border-[ButtonBorder]",
      true: "border-[color:var(--accent)] forced-colors:border-[Highlight]",
    },
    isInvalid: {
      true: "border-[color:var(--danger)] forced-colors:border-[Mark]",
    },
    isDisabled: {
      true: "border-[color:var(--stroke)] opacity-60 forced-colors:border-[GrayText]",
    },
  },
});

export const fieldGroupStyles = tv({
  extend: focusRing,
  base: "group flex items-center h-9 box-border bg-[color:var(--surface-raised)] text-ink forced-colors:bg-[Field] border rounded-lg overflow-hidden transition",
  variants: fieldBorderStyles.variants,
});

export function FieldGroup(props: GroupProps) {
  return (
    <Group
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        fieldGroupStyles({ ...renderProps, className }),
      )}
    />
  );
}

export function Input(props: InputProps) {
  return (
    <RACInput
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "px-2.5 py-0 min-h-9 flex-1 min-w-0 border-0 outline outline-0 bg-transparent font-body text-sm text-ink placeholder:text-muted disabled:text-muted disabled:placeholder:text-muted [-webkit-tap-highlight-color:transparent]",
      )}
    />
  );
}
