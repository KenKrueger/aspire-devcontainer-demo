"use client";
import type { ReactNode } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import type { TextFieldProps as AriaTextFieldProps, ValidationResult } from "react-aria-components";
import { tv } from "tailwind-variants";
import { Description, FieldError, Input, Label, fieldBorderStyles } from "@/components/ui/Field";
import { composeTailwindRenderProps, focusRing } from "@/lib/react-aria-utils";

const inputStyles = tv({
  extend: focusRing,
  base: "border-2 rounded-xl min-h-12 font-body text-base py-0 px-4 box-border bg-surface text-ink transition-all duration-200 placeholder:text-muted/50 hover:border-[color:var(--accent-border)]/50",
  variants: {
    isFocused: fieldBorderStyles.variants.isFocusWithin,
    isInvalid: fieldBorderStyles.variants.isInvalid,
    isDisabled: fieldBorderStyles.variants.isDisabled,
  },
});

export interface TextFieldProps extends AriaTextFieldProps {
  label?: ReactNode;
  description?: string;
  placeholder?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function TextField({ label, description, errorMessage, ...props }: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      className={composeTailwindRenderProps(props.className, "flex flex-col gap-2 font-body")}
    >
      {label && <Label>{label}</Label>}
      <Input className={inputStyles} />
      <div className="flex h-4 items-center">
        {description && <Description>{description}</Description>}
      </div>
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}
