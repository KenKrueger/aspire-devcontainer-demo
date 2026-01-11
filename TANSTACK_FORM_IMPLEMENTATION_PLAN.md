# TanStack Form Implementation Plan

## Executive Summary

This document provides a comprehensive plan for implementing TanStack Form in the aspire-devcontainer-demo application. The plan focuses on leveraging TanStack Form's powerful composition patterns, type-safety, and validation capabilities while maintaining seamless integration with the existing React Aria Components UI library.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [TanStack Form Overview](#tanstack-form-overview)
3. [Implementation Strategy](#implementation-strategy)
4. [Form Composition Patterns](#form-composition-patterns)
5. [Integration with React Aria Components](#integration-with-react-aria-components)
6. [Validation Strategy](#validation-strategy)
7. [Migration Path](#migration-path)
8. [Code Examples](#code-examples)
9. [Testing Strategy](#testing-strategy)
10. [Resources](#resources)

---

## Current State Analysis

### Existing Architecture

The application currently uses:
- **Frontend**: React 19 with TypeScript
- **UI Library**: React Aria Components with Tailwind CSS
- **State Management**: React hooks (useState, useEffect)
- **API Client**: Generated from OpenAPI using @hey-api/client-fetch
- **Backend**: ASP.NET Core with Minimal APIs

### Current Form Implementation

The main form in `App.tsx` (lines 236-253) handles todo creation:

```tsx
<form className="flex flex-col gap-4" onSubmit={handleCreate}>
  <div className="flex flex-wrap items-end gap-4">
    <TextField
      aria-label="Todo title"
      name="title"
      value={newTitle}
      onChange={setNewTitle}
      placeholder="Add a task"
      className="min-w-[240px] flex-1"
    />
    <Button type="submit" isDisabled={isSubmitting}>
      {isSubmitting ? "Adding..." : "Add task"}
    </Button>
  </div>
</form>
```

**Current Limitations:**
- Manual state management with `useState`
- Manual validation logic in event handlers
- No built-in field-level validation
- Limited composition and reusability
- Error handling mixed with business logic

---

## TanStack Form Overview

### Key Features

1. **Type-Safe**: Full TypeScript support with inference
2. **Headless**: No UI assumptions, works with any component library
3. **Composable**: Built-in support for field composition and form sections
4. **Validation**: Multiple validation strategies (on blur, on change, on submit)
5. **Performance**: Minimal re-renders with granular subscriptions
6. **Framework-Agnostic**: Core logic can be shared across frameworks

### Core Concepts

#### 1. Form Instance
```tsx
const form = useForm({
  defaultValues: { title: '', notes: '' },
  onSubmit: async ({ value }) => {
    // Handle submission
  },
})
```

#### 2. Field Components
```tsx
<form.Field
  name="title"
  validators={{
    onChange: ({ value }) => value.length < 3 ? 'Too short' : undefined
  }}
>
  {(field) => (
    <Input
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
    />
  )}
</form.Field>
```

#### 3. Form Composition
Create reusable form hooks with pre-configured field components:

```tsx
const { fieldContext, formContext, useFieldContext } = createFormHookContexts()
const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, DateField, TextArea },
})
```

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)

**Goals:**
- Install TanStack Form dependencies
- Create form composition infrastructure
- Build React Aria Component adapters

**Tasks:**
1. Install `@tanstack/react-form` and validation libraries
2. Create `src/frontend/src/lib/form/` directory structure
3. Implement form hook contexts and utilities
4. Create field adapters for existing React Aria Components

**Deliverables:**
- Form composition hooks (`useAppForm`, `createFormHookContexts`)
- Field adapters for TextField, Checkbox, DatePicker
- Type-safe field component registry

### Phase 2: Todo Form Migration (Week 2)

**Goals:**
- Migrate existing todo creation form to TanStack Form
- Implement validation with schema library (Zod)
- Add field-level error handling

**Tasks:**
1. Create todo form schema with Zod
2. Replace manual state management with `useForm`
3. Implement field-level validation
4. Add optimistic updates
5. Improve error messaging

**Deliverables:**
- Migrated todo creation form
- Zod validation schema
- Enhanced UX with better error handling

### Phase 3: Advanced Features (Week 3)

**Goals:**
- Implement form composition for complex scenarios
- Create reusable form components
- Add multi-step form capabilities (future-proofing)

**Tasks:**
1. Create composed field components (e.g., TitleWithNotesField)
2. Implement form sections for grouping
3. Add dynamic field arrays for multi-item editing
4. Create form templates for common patterns

**Deliverables:**
- Reusable form component library
- Form composition patterns documentation
- Example multi-step form structure

### Phase 4: Testing & Documentation (Week 4)

**Goals:**
- Write comprehensive tests
- Document patterns and best practices
- Create developer guides

**Tasks:**
1. Write unit tests for form utilities
2. Write integration tests for forms
3. Document form patterns and conventions
4. Create developer guide with examples

**Deliverables:**
- Test coverage > 80%
- Comprehensive documentation
- Developer onboarding guide

---

## Form Composition Patterns

### Pattern 1: Custom Form Hook

Create a custom form hook that pre-binds UI components:

```tsx
// src/lib/form/createAppForm.ts
import { createFormHookContexts, createFormHook } from '@tanstack/react-form'
import { TextField } from '@/components/ui/TextField'
import { DatePicker } from '@/components/ui/DatePicker'
import { TextArea } from '@/components/ui/TextArea'

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts()

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    DatePicker,
    TextArea,
  },
  formComponents: {},
})
```

**Benefits:**
- Type-safe field names
- Pre-configured component bindings
- Reduced boilerplate
- Consistent form behavior

### Pattern 2: Field Adapters

Create adapters that bridge TanStack Form with React Aria Components:

```tsx
// src/lib/form/adapters/TextFieldAdapter.tsx
import { useFieldContext } from '@/lib/form/createAppForm'
import { TextField as AriaTextField } from '@/components/ui/TextField'

export function TextFieldAdapter({ label, ...props }) {
  const field = useFieldContext<string>()
  
  return (
    <AriaTextField
      label={label}
      value={field.state.value}
      onChange={field.handleChange}
      errorMessage={field.state.meta.errors[0]}
      isInvalid={field.state.meta.errors.length > 0}
      {...props}
    />
  )
}
```

**Benefits:**
- Seamless integration with existing UI components
- Automatic error handling
- Consistent field behavior
- Easy to extend

### Pattern 3: Composed Fields

Create higher-level field components that combine multiple inputs:

```tsx
// src/components/forms/TodoFormFields.tsx
export function TodoTitleField() {
  return (
    <form.AppField
      name="title"
      validators={{
        onChange: ({ value }) => {
          if (!value) return 'Title is required'
          if (value.length < 3) return 'Title must be at least 3 characters'
          if (value.length > 200) return 'Title must be less than 200 characters'
          return undefined
        }
      }}
    >
      {(field) => (
        <TextFieldAdapter
          label="Task Title"
          placeholder="Enter task title"
        />
      )}
    </form.AppField>
  )
}

export function TodoFormFieldGroup() {
  return (
    <div className="flex flex-col gap-4">
      <TodoTitleField />
      <TodoNotesField />
      <TodoDueDateField />
    </div>
  )
}
```

**Benefits:**
- Encapsulates field logic
- Reusable across different forms
- Easy to test in isolation
- Self-documenting

### Pattern 4: Form Sections

Organize complex forms into logical sections:

```tsx
export function TodoBasicInfoSection() {
  return (
    <section className="flex flex-col gap-4">
      <h3>Basic Information</h3>
      <TodoTitleField />
      <TodoNotesField />
    </section>
  )
}

export function TodoSchedulingSection() {
  return (
    <section className="flex flex-col gap-4">
      <h3>Scheduling</h3>
      <TodoDueDateField />
      <TodoReminderField />
    </section>
  )
}
```

---

## Integration with React Aria Components

### Strategy

The integration strategy focuses on creating a thin adapter layer that connects TanStack Form's field state management with React Aria Components' accessibility features.

### Key Integration Points

1. **Value Binding**: Connect field value to React Aria component
2. **Change Handlers**: Wire up field.handleChange to React Aria events
3. **Validation State**: Map TanStack Form validation to React Aria's validation props
4. **Error Messages**: Display field errors using React Aria's FieldError component
5. **Disabled State**: Sync form submission state with component disabled state

### Adapter Implementation

```tsx
// src/lib/form/adapters/createFieldAdapter.tsx
import { useFieldContext } from '@/lib/form/createAppForm'
import type { ComponentType } from 'react'

export function createFieldAdapter<TValue, TProps>(
  Component: ComponentType<TProps>
) {
  return function FieldAdapter(props: Omit<TProps, 'value' | 'onChange'>) {
    const field = useFieldContext<TValue>()
    
    return (
      <Component
        {...props}
        value={field.state.value}
        onChange={field.handleChange}
        isInvalid={field.state.meta.errors.length > 0}
        errorMessage={field.state.meta.errors[0]}
        isDisabled={field.form.state.isSubmitting}
      />
    )
  }
}
```

### Example Usage

```tsx
import { TextField } from '@/components/ui/TextField'
import { createFieldAdapter } from '@/lib/form/adapters/createFieldAdapter'

const TextFieldAdapter = createFieldAdapter<string, TextFieldProps>(TextField)

// Usage in form
<form.Field name="title">
  {(field) => <TextFieldAdapter label="Title" placeholder="Enter title" />}
</form.Field>
```

### Benefits

- **Maintains Accessibility**: React Aria Components' ARIA support is preserved
- **Type Safety**: Full TypeScript support with inference
- **Minimal Changes**: Existing components don't need modification
- **Progressive Enhancement**: Can adopt incrementally

---

## Validation Strategy

### Multi-Layer Validation

Implement validation at multiple levels:

1. **Client-side Schema Validation** (Primary)
2. **Field-level Validation** (Interactive feedback)
3. **Server-side Validation** (Security and business rules)

### Zod Schema Integration

```tsx
// src/lib/schemas/todoSchema.ts
import { z } from 'zod'

export const todoSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  notes: z
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional(),
  dueDate: z
    .date()
    .min(new Date(), 'Due date must be in the future')
    .optional(),
  sortOrder: z
    .number()
    .int()
    .min(0)
    .optional(),
})

export type TodoFormData = z.infer<typeof todoSchema>
```

### Form Integration

```tsx
import { zodValidator } from '@tanstack/zod-form-adapter'
import { todoSchema } from '@/lib/schemas/todoSchema'

const form = useForm({
  defaultValues: {
    title: '',
    notes: '',
    dueDate: undefined,
  },
  validators: {
    onSubmit: zodValidator(todoSchema),
  },
  onSubmit: async ({ value }) => {
    // value is fully typed and validated
    await createTodo(value)
  },
})
```

### Field-Level Validation

For immediate user feedback:

```tsx
<form.Field
  name="title"
  validators={{
    onChange: ({ value }) => {
      if (!value) return 'Title is required'
      if (value.length < 3) return 'Title must be at least 3 characters'
      return undefined
    },
    onBlur: ({ value }) => {
      // Additional validation on blur
      return undefined
    },
  }}
>
  {(field) => <TextFieldAdapter label="Title" />}
</form.Field>
```

### Server Validation Integration

Handle server-side validation errors:

```tsx
const form = useForm({
  // ... other config
  onSubmit: async ({ value }) => {
    try {
      const result = await postApiTodos({ body: value })
      if (result.error) {
        // Map server errors to form fields
        if (result.error.fieldErrors) {
          Object.entries(result.error.fieldErrors).forEach(([field, errors]) => {
            form.setFieldMeta(field, meta => ({
              ...meta,
              errors: errors as string[],
            }))
          })
        }
        return
      }
      // Success handling
    } catch (error) {
      // Handle network errors
    }
  },
})
```

---

## Migration Path

### Step-by-Step Migration

#### Step 1: Install Dependencies

```bash
cd src/frontend
pnpm add @tanstack/react-form zod @tanstack/zod-form-adapter
```

#### Step 2: Create Form Infrastructure

1. Create directory structure:
```
src/lib/form/
├── createAppForm.ts        # Custom form hook
├── adapters/
│   ├── TextFieldAdapter.tsx
│   ├── CheckboxAdapter.tsx
│   └── DatePickerAdapter.tsx
└── utils/
    └── formHelpers.ts
```

2. Implement form composition hooks
3. Create field adapters for existing components

#### Step 3: Create Schemas

```
src/lib/schemas/
├── todoSchema.ts
└── index.ts
```

#### Step 4: Migrate Todo Form

Replace the current form implementation in `App.tsx`:

**Before:**
```tsx
const [newTitle, setNewTitle] = useState("")
const [isSubmitting, setIsSubmitting] = useState(false)

const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  const trimmed = newTitle.trim()
  if (!trimmed) {
    setError("Enter a title before adding a task.")
    return
  }
  // ... submission logic
}
```

**After:**
```tsx
const form = useAppForm({
  defaultValues: {
    title: '',
    notes: '',
    dueDate: null,
  },
  validators: {
    onSubmit: zodValidator(todoSchema),
  },
  onSubmit: async ({ value }) => {
    const result = await postApiTodos({ 
      baseUrl: apiBaseUrl,
      body: value,
    })
    // ... handle result
  },
})
```

#### Step 5: Update Form UI

Replace the form JSX with TanStack Form components:

```tsx
<form onSubmit={(e) => {
  e.preventDefault()
  form.handleSubmit()
}}>
  <form.Field name="title">
    {(field) => (
      <TextFieldAdapter
        label="Task Title"
        placeholder="Add a task"
      />
    )}
  </form.Field>
  
  <Button
    type="submit"
    isDisabled={form.state.isSubmitting}
  >
    {form.state.isSubmitting ? 'Adding...' : 'Add task'}
  </Button>
</form>
```

#### Step 6: Test and Iterate

1. Test form submission
2. Test validation feedback
3. Test error handling
4. Verify accessibility
5. Check performance

---

## Code Examples

### Example 1: Complete Todo Creation Form

```tsx
// src/components/forms/TodoCreateForm.tsx
import { useAppForm } from '@/lib/form/createAppForm'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { todoSchema } from '@/lib/schemas/todoSchema'
import { TextFieldAdapter } from '@/lib/form/adapters/TextFieldAdapter'
import { Button } from '@/components/ui/Button'
import { postApiTodos } from '@/client'

interface TodoCreateFormProps {
  onSuccess?: (todo: TodoItem) => void
  onError?: (error: Error) => void
}

export function TodoCreateForm({ onSuccess, onError }: TodoCreateFormProps) {
  const form = useAppForm({
    defaultValues: {
      title: '',
      notes: '',
      dueDate: null,
      sortOrder: 0,
    },
    validators: {
      onSubmit: zodValidator(todoSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await postApiTodos({
          baseUrl: window.location.origin,
          body: {
            title: value.title,
            notes: value.notes || null,
            dueDate: value.dueDate || null,
            sortOrder: value.sortOrder || null,
          },
        })

        if (result.error) {
          throw new Error('Could not save your todo.')
        }

        const created = parseTodo(result.data)
        if (created) {
          onSuccess?.(created)
          form.reset()
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        onError?.(error)
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="flex flex-wrap items-end gap-4">
        <form.Field name="title">
          {(field) => (
            <TextFieldAdapter
              label="Task Title"
              placeholder="Add a task"
              className="min-w-[240px] flex-1"
            />
          )}
        </form.Field>

        <Button
          type="submit"
          isDisabled={form.state.isSubmitting}
        >
          {form.state.isSubmitting ? 'Adding...' : 'Add task'}
        </Button>
      </div>

      {form.state.errors.length > 0 && (
        <div role="alert" className="text-sm text-red-600">
          {form.state.errors[0]}
        </div>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Keep titles short so the list stays easy to scan.
      </p>
    </form>
  )
}
```

### Example 2: Reusable Field Component

```tsx
// src/components/forms/fields/TodoTitleField.tsx
import { useFieldContext } from '@/lib/form/createAppForm'
import { TextField } from '@/components/ui/TextField'

export function TodoTitleField() {
  return (
    <form.AppField
      name="title"
      validators={{
        onChange: ({ value }) => {
          if (!value || value.trim().length === 0) {
            return 'Title is required'
          }
          if (value.length < 3) {
            return 'Title must be at least 3 characters'
          }
          if (value.length > 200) {
            return 'Title cannot exceed 200 characters'
          }
          return undefined
        },
      }}
    >
      {(field) => (
        <TextField
          label="Task Title"
          placeholder="Enter a descriptive title"
          value={field.state.value}
          onChange={field.handleChange}
          errorMessage={field.state.meta.errors[0]}
          isInvalid={field.state.meta.errors.length > 0}
          description="A clear, concise description of the task"
        />
      )}
    </form.AppField>
  )
}
```

### Example 3: Multi-Step Form (Future Enhancement)

```tsx
// src/components/forms/TodoMultiStepForm.tsx
import { useState } from 'react'
import { useAppForm } from '@/lib/form/createAppForm'

type FormStep = 'basic' | 'details' | 'scheduling' | 'review'

export function TodoMultiStepForm() {
  const [currentStep, setCurrentStep] = useState<FormStep>('basic')

  const form = useAppForm({
    defaultValues: {
      // Step 1: Basic
      title: '',
      // Step 2: Details
      notes: '',
      category: '',
      priority: 'medium',
      // Step 3: Scheduling
      dueDate: null,
      reminder: false,
      reminderDate: null,
    },
    onSubmit: async ({ value }) => {
      // Submit all data
    },
  })

  const steps: Record<FormStep, React.ReactNode> = {
    basic: <BasicInfoStep />,
    details: <DetailsStep />,
    scheduling: <SchedulingStep />,
    review: <ReviewStep />,
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator currentStep={currentStep} />
      
      <form onSubmit={(e) => {
        e.preventDefault()
        if (currentStep === 'review') {
          form.handleSubmit()
        } else {
          // Move to next step
          const nextStep = getNextStep(currentStep)
          setCurrentStep(nextStep)
        }
      }}>
        {steps[currentStep]}
        
        <div className="flex justify-between mt-6">
          {currentStep !== 'basic' && (
            <Button
              variant="secondary"
              onPress={() => setCurrentStep(getPreviousStep(currentStep))}
            >
              Previous
            </Button>
          )}
          
          <Button type="submit">
            {currentStep === 'review' ? 'Create Task' : 'Next'}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

---

## Testing Strategy

### Unit Tests

Test form utilities and validation logic:

```tsx
// src/lib/form/__tests__/todoSchema.test.ts
import { describe, it, expect } from 'vitest'
import { todoSchema } from '@/lib/schemas/todoSchema'

describe('todoSchema', () => {
  it('validates a valid todo', () => {
    const result = todoSchema.safeParse({
      title: 'Buy groceries',
      notes: 'Milk, eggs, bread',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = todoSchema.safeParse({
      title: '',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('required')
  })

  it('rejects title that is too long', () => {
    const result = todoSchema.safeParse({
      title: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('200')
  })
})
```

### Integration Tests

Test form behavior with React Testing Library:

```tsx
// src/components/forms/__tests__/TodoCreateForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoCreateForm } from '../TodoCreateForm'

describe('TodoCreateForm', () => {
  it('renders form fields', () => {
    render(<TodoCreateForm />)
    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
  })

  it('shows validation error for empty title', async () => {
    const user = userEvent.setup()
    render(<TodoCreateForm />)
    
    const submitButton = screen.getByRole('button', { name: /add task/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it('submits valid form data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    render(<TodoCreateForm onSuccess={onSuccess} />)
    
    const titleInput = screen.getByLabelText(/task title/i)
    await user.type(titleInput, 'Buy groceries')
    
    const submitButton = screen.getByRole('button', { name: /add task/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup()
    render(<TodoCreateForm />)
    
    const titleInput = screen.getByLabelText(/task title/i)
    await user.type(titleInput, 'Buy groceries')
    
    const submitButton = screen.getByRole('button', { name: /add task/i })
    await user.click(submitButton)
    
    expect(submitButton).toBeDisabled()
  })
})
```

### E2E Tests (with Playwright)

Test complete user workflows:

```tsx
// e2e/todoForm.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Todo Form', () => {
  test('creates a new todo', async ({ page }) => {
    await page.goto('/')
    
    // Fill in the form
    await page.fill('[aria-label="Task Title"]', 'Buy groceries')
    await page.click('button:has-text("Add task")')
    
    // Verify todo appears in list
    await expect(page.locator('text=Buy groceries')).toBeVisible()
  })

  test('shows validation error for short title', async ({ page }) => {
    await page.goto('/')
    
    await page.fill('[aria-label="Task Title"]', 'Hi')
    await page.click('button:has-text("Add task")')
    
    await expect(page.locator('text=Title must be at least 3 characters')).toBeVisible()
  })
})
```

---

## Resources

### Official Documentation

1. **TanStack Form**
   - Official Docs: https://tanstack.com/form/latest/docs/overview
   - React Guide: https://tanstack.com/form/latest/docs/framework/react/quick-start
   - Form Composition: https://tanstack.com/form/latest/docs/framework/react/guides/form-composition
   - API Reference: https://tanstack.com/form/latest/docs/framework/react/reference/useForm

2. **Shadcn UI + TanStack Form**
   - Integration Guide: https://ui.shadcn.com/docs/forms/tanstack-form
   - Example Repository: https://github.com/FatahChan/shadcn-tanstack-form
   - Live Demo: https://fatahchan.github.io/shadcn-tanstack-form/

3. **React Aria Components**
   - Official Docs: https://react-spectrum.adobe.com/react-aria/
   - Form Components: https://react-spectrum.adobe.com/react-aria/forms.html
   - Accessibility: https://react-spectrum.adobe.com/react-aria/accessibility.html

4. **Zod Validation**
   - Official Docs: https://zod.dev/
   - Error Handling: https://zod.dev/ERROR_HANDLING
   - TypeScript Integration: https://zod.dev/?id=type-inference

### Community Resources

1. **Blog Posts**
   - "Seamless Forms with shadcn/ui and TanStack Form": https://dev.to/felipestanzani/seamless-forms-with-shadcnui-and-tanstack-form-mng
   - "TanStack Form: Setup and Simple Validation": https://leonardomontini.dev/tanstack-form-setup-validation/

2. **Video Tutorials**
   - TanStack Form Introduction (YouTube)
   - Building Type-Safe Forms (YouTube)

3. **GitHub Examples**
   - TanStack Form Examples: https://github.com/TanStack/form/tree/main/examples
   - React Aria Form Examples: https://github.com/adobe/react-spectrum/tree/main/examples

### Package Versions (Recommended)

```json
{
  "dependencies": {
    "@tanstack/react-form": "^0.29.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@tanstack/zod-form-adapter": "^0.29.0"
  }
}
```

---

## Success Criteria

### Technical Criteria

- ✅ All forms use TanStack Form for state management
- ✅ Field validation is implemented with Zod schemas
- ✅ Form composition patterns are established
- ✅ React Aria Components integration is seamless
- ✅ Type safety is maintained throughout
- ✅ No TypeScript errors or warnings
- ✅ Test coverage > 80%

### User Experience Criteria

- ✅ Immediate validation feedback (no page refresh)
- ✅ Clear, helpful error messages
- ✅ Accessible forms (WCAG 2.1 AA compliant)
- ✅ Smooth form submission (loading states)
- ✅ Form persists values during validation
- ✅ No performance degradation

### Developer Experience Criteria

- ✅ Intuitive API for creating new forms
- ✅ Reusable field components
- ✅ Clear documentation and examples
- ✅ Easy to test forms
- ✅ TypeScript inference works as expected
- ✅ Consistent patterns across codebase

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Foundation | Week 1 | Form infrastructure, adapters |
| Phase 2: Migration | Week 2 | Migrated todo form with validation |
| Phase 3: Advanced Features | Week 3 | Composed components, patterns |
| Phase 4: Testing & Docs | Week 4 | Tests, documentation, guides |

**Total Timeline:** 4 weeks

---

## Risk Assessment

### Low Risk
- ✅ TanStack Form is stable and production-ready
- ✅ React Aria Components are designed for composition
- ✅ No breaking changes to existing API contracts

### Medium Risk
- ⚠️ Learning curve for team members
- ⚠️ Migration effort for existing forms
- ⚠️ Potential for over-engineering simple forms

**Mitigation Strategies:**
1. Start with simple forms and gradually adopt advanced features
2. Provide training sessions and documentation
3. Create reusable patterns to reduce complexity
4. Keep escape hatches for special cases

### High Risk
- ❌ None identified

---

## Next Steps

1. **Review and Approve Plan** - Stakeholder sign-off
2. **Set Up Development Environment** - Install dependencies
3. **Start Phase 1** - Build form infrastructure
4. **Weekly Check-ins** - Track progress and adjust as needed

---

## Appendix A: File Structure

Proposed directory structure for form-related code:

```
src/frontend/src/
├── lib/
│   ├── form/
│   │   ├── createAppForm.ts          # Custom form hook
│   │   ├── adapters/
│   │   │   ├── TextFieldAdapter.tsx
│   │   │   ├── CheckboxAdapter.tsx
│   │   │   ├── DatePickerAdapter.tsx
│   │   │   ├── TextAreaAdapter.tsx
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── formHelpers.ts
│   │       └── validationHelpers.ts
│   └── schemas/
│       ├── todoSchema.ts
│       ├── userSchema.ts
│       └── index.ts
├── components/
│   └── forms/
│       ├── TodoCreateForm.tsx
│       ├── TodoEditForm.tsx
│       ├── fields/
│       │   ├── TodoTitleField.tsx
│       │   ├── TodoNotesField.tsx
│       │   └── TodoDueDateField.tsx
│       └── __tests__/
│           ├── TodoCreateForm.test.tsx
│           └── TodoEditForm.test.tsx
└── App.tsx
```

---

## Appendix B: Common Patterns

### Pattern: Form with Optimistic Updates

```tsx
const form = useAppForm({
  defaultValues: { title: '' },
  onSubmit: async ({ value }) => {
    // Optimistically update UI
    const tempId = Date.now()
    addTodoOptimistically({ ...value, id: tempId })
    
    try {
      const result = await postApiTodos({ body: value })
      // Replace temp with real data
      replaceTodo(tempId, result.data)
    } catch (error) {
      // Rollback on error
      removeTodo(tempId)
      throw error
    }
  },
})
```

### Pattern: Dependent Fields

```tsx
<form.Field
  name="dueDate"
  validators={{
    onChange: ({ value, formValue }) => {
      if (value && formValue.reminder && !formValue.reminderDate) {
        return 'Reminder date is required when reminder is enabled'
      }
      return undefined
    },
  }}
>
  {(field) => <DatePickerAdapter label="Due Date" />}
</form.Field>
```

### Pattern: Dynamic Field Arrays

```tsx
const form = useAppForm({
  defaultValues: {
    subtasks: [{ title: '', completed: false }]
  },
})

form.useField({
  name: 'subtasks',
  mode: 'array'
})

// Add subtask
form.pushFieldValue('subtasks', { title: '', completed: false })

// Remove subtask
form.removeFieldValue('subtasks', index)
```

---

*This implementation plan is a living document and should be updated as the project progresses.*
