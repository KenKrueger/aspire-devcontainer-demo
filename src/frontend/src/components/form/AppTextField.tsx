"use client";

import { TextField, type TextFieldProps } from "@/components/ui/TextField";
import { useFieldContext } from "@/lib/form-context";

export interface AppTextFieldProps extends Omit<TextFieldProps, "value" | "onChange" | "onBlur"> {
  /** Label text displayed above the input */
  label?: string;
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
export function AppTextField({ label, description, ...props }: AppTextFieldProps) {
  const field = useFieldContext<string>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorMessage = field.state.meta.errors.join(", ");

  return (
    <TextField
      {...props}
      name={field.name}
      value={field.state.value}
      onChange={(value) => field.handleChange(value)}
      onBlur={field.handleBlur}
      isInvalid={isInvalid}
      label={label}
      description={description}
      errorMessage={isInvalid ? errorMessage : undefined}
    />
  );
}
