"use client";

import { Button, type ButtonProps } from "@/components/ui/Button";
import { useFormContext } from "@/lib/form-context";

export interface AppSubmitButtonProps extends Omit<
  ButtonProps,
  "type" | "isDisabled" | "isPending"
> {
  /** Text shown while the form is submitting */
  pendingText?: string;
  /** Whether to disable when form cannot submit (default: true) */
  disableWhenInvalid?: boolean;
}

/**
 * Pre-bound submit button component for use with TanStack Form.
 *
 * Must be used within a `form.AppForm` context. Automatically handles:
 * - Disabled state when form is invalid or submitting
 * - Pending spinner during form submission
 * - Reactive updates via form.Subscribe
 *
 * @example
 * ```tsx
 * <form.AppForm>
 *   <AppSubmitButton>Save</AppSubmitButton>
 * </form.AppForm>
 * ```
 */
export function AppSubmitButton({
  children,
  disableWhenInvalid = true,
  ...props
}: AppSubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button
          {...props}
          type="submit"
          isDisabled={disableWhenInvalid ? !canSubmit || isSubmitting : isSubmitting}
          isPending={isSubmitting}
        >
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}
