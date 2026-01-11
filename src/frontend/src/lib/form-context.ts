"use client";

import { createFormHookContexts } from "@tanstack/react-form";

/**
 * Form context scaffolding for TanStack Form composition.
 *
 * - fieldContext: React context for field state
 * - formContext: React context for form state
 * - useFieldContext: Hook to access field state in custom field components
 * - useFormContext: Hook to access form state in custom form components
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
