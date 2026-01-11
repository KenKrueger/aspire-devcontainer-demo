"use client";

import type { ReactNode } from "react";
import { TextField, type TextFieldProps } from "@/components/ui/TextField";
import { useFieldContext } from "@/lib/form-context";

export interface AppTextFieldProps extends Omit<TextFieldProps, "value" | "onChange" | "onBlur"> {
  /** Label text displayed above the input */
  label?: ReactNode;
  /** Optional hint rendered inline with the label */
  optionalLabel?: string;
  /** Description text displayed below the input */
  description?: string;
}

/**
 * Pre-bound TextField component for use with TanStack Form.
 *
 * Must be used within a `form.AppField` context. Automatically handles:
 * - Value binding from form state
 * - Change and blur handlers
 * - Validation state and error display
 *
 * @example
 * ```tsx
 * <form.AppField name="title" children={() => <AppTextField label="Title" />} />
 * ```
 */
export function AppTextField({
  label,
  optionalLabel,
  description,
  ...props
}: AppTextFieldProps) {
  const field = useFieldContext<string>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorMessage = field.state.meta.errors.join(", ");
  const labelContent =
    label && optionalLabel ? (
      <span className="inline-flex items-baseline gap-2">
        <span>{label}</span>
        <span className="text-[0.6rem] font-medium normal-case tracking-normal text-muted/70">
          ({optionalLabel})
        </span>
      </span>
    ) : (
      label
    );

  return (
    <TextField
      {...props}
      name={field.name}
      value={field.state.value}
      onChange={(value) => field.handleChange(value)}
      onBlur={field.handleBlur}
      isInvalid={isInvalid}
      label={labelContent}
      description={description}
      errorMessage={isInvalid ? errorMessage : undefined}
    />
  );
}
