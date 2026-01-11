"use client";
import { composeRenderProps, Button as RACButton } from "react-aria-components";
import type { ButtonProps as RACButtonProps } from "react-aria-components";
import { tv } from "tailwind-variants";
import { focusRing } from "@/lib/react-aria-utils";

export interface ButtonProps extends RACButtonProps {
  /** @default 'primary' */
  variant?: "primary" | "secondary" | "destructive" | "quiet";
}

let button = tv({
  extend: focusRing,
  base: "relative inline-flex items-center justify-center gap-2 border-2 border-transparent h-10 box-border px-5 py-0 [&:has(>svg:only-child)]:px-0 [&:has(>svg:only-child)]:h-9 [&:has(>svg:only-child)]:w-9 font-body text-sm font-semibold text-center transition-all duration-200 rounded-xl cursor-pointer [-webkit-tap-highlight-color:transparent]",
  variants: {
    variant: {
      primary:
        "bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-tight hover:bg-[color:var(--accent-strong)] hover:shadow-soft hover:-translate-y-0.5 pressed:bg-[color:var(--accent-strong)] pressed:translate-y-0",
      secondary:
        "border-[color:var(--stroke)] bg-surface text-ink hover:bg-[color:var(--surface-strong)] hover:border-[color:var(--accent-border)]/50 pressed:bg-[color:var(--surface-strong)]",
      destructive:
        "bg-[color:var(--danger)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--danger)]/90 hover:-translate-y-0.5 pressed:bg-[color:var(--danger)]/80 pressed:translate-y-0",
      quiet:
        "border-0 bg-transparent text-muted hover:text-ink hover:bg-[color:var(--surface-strong)] pressed:bg-[color:var(--surface-strong)]",
    },
    isDisabled: {
      true:
        "border-transparent bg-[color:var(--surface-strong)] text-muted cursor-not-allowed opacity-60 forced-colors:text-[GrayText] hover:transform-none",
    },
    isPending: {
      true: "text-transparent",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
  compoundVariants: [
    {
      variant: "quiet",
      isDisabled: true,
      class: "bg-transparent dark:bg-transparent",
    },
  ],
});

export function Button(props: ButtonProps) {
  const spinnerTone =
    props.variant === "secondary" || props.variant === "quiet"
      ? "text-ink"
      : "text-[color:var(--accent-contrast)]";

  return (
    <RACButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({ ...renderProps, variant: props.variant, className }),
      )}
    >
      {composeRenderProps(props.children, (children, { isPending }) => (
        <>
          {children}
          {isPending && (
            <span aria-hidden className="flex absolute inset-0 justify-center items-center">
              <svg
                className={`w-4 h-4 ${spinnerTone} animate-spin`}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="4" fill="none" className="opacity-25" />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  pathLength="100"
                  strokeDasharray="60 140"
                  strokeDashoffset="0"
                />
              </svg>
            </span>
          )}
        </>
      ))}
    </RACButton>
  );
}
