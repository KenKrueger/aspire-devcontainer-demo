"use client";

import type { CheckboxProps } from "react-aria-components";
import { Checkbox } from "@/components/ui/Checkbox";
import { useFieldContext } from "@/lib/form-context";

export interface AppCheckboxProps extends Omit<CheckboxProps, "isSelected" | "onChange"> {
  /** Label text displayed next to the checkbox */
  children?: React.ReactNode;
}

/**
 * Pre-bound Checkbox component for use with TanStack Form.
 *
 * Must be used within a `form.AppField` context. Automatically handles:
 * - Checked state binding from form state
 * - Change handler
 * - Validation state
 *
 * @example
 * ```tsx
 * <form.AppField name="isComplete" children={() => <AppCheckbox>Mark as complete</AppCheckbox>} />
 * ```
 */
export function AppCheckbox({ children, ...props }: AppCheckboxProps) {
  const field = useFieldContext<boolean>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Checkbox
      {...props}
      name={field.name}
      isSelected={field.state.value}
      onChange={(isSelected) => field.handleChange(isSelected)}
      isInvalid={isInvalid}
    >
      {children}
    </Checkbox>
  );
}
