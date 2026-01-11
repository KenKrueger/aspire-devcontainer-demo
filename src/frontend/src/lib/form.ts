"use client";

import { createFormHook, type FormOptions } from "@tanstack/react-form";
import { fieldContext, formContext } from "@/lib/form-context";
import { AppTextField } from "@/components/form/AppTextField";
import { AppCheckbox } from "@/components/form/AppCheckbox";
import { AppSubmitButton } from "@/components/form/AppSubmitButton";

/**
 * Pre-configured TanStack Form hook with pre-bound field and form components.
 *
 * Provides:
 * - `useAppForm`: Form hook with AppField and AppForm components
 * - `withForm`: HOC for breaking large forms into smaller pieces
 *
 * @example
 * ```tsx
 * const form = useAppForm({
 *   defaultValues: { title: "", isComplete: false },
 *   onSubmit: async ({ value }) => console.log(value),
 * });
 *
 * return (
 *   <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
 *     <form.AppField name="title" children={() => <AppTextField label="Title" />} />
 *     <form.AppField name="isComplete" children={() => <AppCheckbox>Complete</AppCheckbox>} />
 *     <form.AppForm>
 *       <AppSubmitButton>Save</AppSubmitButton>
 *     </form.AppForm>
 *   </form>
 * );
 * ```
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    AppTextField,
    AppCheckbox,
  },
  formComponents: {
    AppSubmitButton,
  },
});

// Re-export formOptions for creating shared form configurations
export { formOptions } from "@tanstack/react-form";
export type { FormOptions };
