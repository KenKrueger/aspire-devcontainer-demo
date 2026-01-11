"use client";
import type { ReactNode } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import type { TextFieldProps as AriaTextFieldProps, ValidationResult } from "react-aria-components";
import { tv } from "tailwind-variants";
import { Description, FieldError, Input, Label, fieldBorderStyles } from "@/components/ui/Field";
import { composeTailwindRenderProps, focusRing } from "@/lib/react-aria-utils";

const inputStyles = tv({
  extend: focusRing,
  base: "border rounded-md min-h-10 font-body text-sm py-0 px-3 box-border bg-surface text-ink transition-colors placeholder:text-muted/40 hover:border-[color:var(--stroke)]",
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
      className={composeTailwindRenderProps(props.className, "flex flex-col gap-1 font-body")}
    >
      {label && <Label>{label}</Label>}
      <Input className={inputStyles} />
      {description && (
        <div className="flex items-center">
          <Description>{description}</Description>
        </div>
      )}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}
