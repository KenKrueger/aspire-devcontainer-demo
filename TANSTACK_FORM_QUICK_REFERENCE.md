# TanStack Form Quick Reference Guide

A quick reference for developers implementing TanStack Form in this project.

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Field Adapters](#field-adapters)
4. [Validation](#validation)
5. [Common Patterns](#common-patterns)
6. [API Reference](#api-reference)

---

## Installation

```bash
cd src/frontend
pnpm add @tanstack/react-form zod @tanstack/zod-form-adapter
```

---

## Basic Usage

### Simple Form

```tsx
import { useForm } from '@tanstack/react-form'

function MyForm() {
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
    },
    onSubmit: async ({ value }) => {
      console.log('Submitted:', value)
      // Handle submission
    },
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      form.handleSubmit()
    }}>
      <form.Field name="name">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      
      <button type="submit">Submit</button>
    </form>
  )
}
```

### With Custom Form Hook

```tsx
import { useAppForm } from '@/lib/form/createAppForm'

function MyForm() {
  const form = useAppForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => {
      // Handle submission
    },
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      form.handleSubmit()
    }}>
      <form.Field name="name">
        {(field) => (
          <TextFieldAdapter label="Name" />
        )}
      </form.Field>
    </form>
  )
}
```

---

## Field Adapters

### TextField Adapter

```tsx
// src/lib/form/adapters/TextFieldAdapter.tsx
import { useFieldContext } from '@/lib/form/createAppForm'
import { TextField } from '@/components/ui/TextField'

export function TextFieldAdapter({ label, ...props }) {
  const field = useFieldContext<string>()
  
  return (
    <TextField
      label={label}
      value={field.state.value}
      onChange={field.handleChange}
      errorMessage={field.state.meta.errors[0]}
      isInvalid={field.state.meta.errors.length > 0}
      isDisabled={field.form.state.isSubmitting}
      {...props}
    />
  )
}
```

### Usage

```tsx
<form.Field name="title">
  {(field) => (
    <TextFieldAdapter
      label="Task Title"
      placeholder="Enter title"
    />
  )}
</form.Field>
```

---

## Validation

### With Zod Schema

```tsx
import { z } from 'zod'
import { zodValidator } from '@tanstack/zod-form-adapter'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
})

const form = useAppForm({
  defaultValues: { title: '', email: '' },
  validators: {
    onSubmit: zodValidator(schema),
  },
  onSubmit: async ({ value }) => {
    // value is fully typed and validated
  },
})
```

### Field-Level Validation

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

### Async Validation

```tsx
<form.Field
  name="username"
  validators={{
    onBlur: async ({ value }) => {
      const isAvailable = await checkUsernameAvailability(value)
      return isAvailable ? undefined : 'Username is taken'
    },
  }}
>
  {(field) => <TextFieldAdapter label="Username" />}
</form.Field>
```

---

## Common Patterns

### Form with Loading State

```tsx
const form = useAppForm({
  defaultValues: { title: '' },
  onSubmit: async ({ value }) => {
    setLoading(true)
    try {
      await api.createTodo(value)
    } finally {
      setLoading(false)
    }
  },
})

<Button
  type="submit"
  isDisabled={form.state.isSubmitting}
>
  {form.state.isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

### Reset Form After Submit

```tsx
const form = useAppForm({
  defaultValues: { title: '' },
  onSubmit: async ({ value }) => {
    await api.createTodo(value)
    form.reset() // Clear form after successful submission
  },
})
```

### Conditional Fields

```tsx
<form.Field name="hasNotes">
  {(field) => (
    <Checkbox
      isSelected={field.state.value}
      onChange={field.handleChange}
    >
      Add notes
    </Checkbox>
  )}
</form.Field>

<form.Subscribe selector={(state) => state.values.hasNotes}>
  {(hasNotes) => hasNotes && (
    <form.Field name="notes">
      {(field) => <TextAreaAdapter label="Notes" />}
    </form.Field>
  )}
</form.Subscribe>
```

### Dependent Validation

```tsx
<form.Field
  name="confirmEmail"
  validators={{
    onChange: ({ value, formValue }) => {
      if (value !== formValue.email) {
        return 'Emails must match'
      }
      return undefined
    },
  }}
>
  {(field) => <TextFieldAdapter label="Confirm Email" />}
</form.Field>
```

### Form-Level Error

```tsx
const form = useAppForm({
  defaultValues: { title: '' },
  onSubmit: async ({ value }) => {
    try {
      await api.createTodo(value)
    } catch (error) {
      form.setErrorMap({
        onSubmit: 'Failed to save. Please try again.',
      })
    }
  },
})

{form.state.errors.length > 0 && (
  <div role="alert" className="text-red-600">
    {form.state.errors[0]}
  </div>
)}
```

### Optimistic Updates

```tsx
const form = useAppForm({
  defaultValues: { title: '' },
  onSubmit: async ({ value }) => {
    // Add optimistically
    const tempId = Date.now()
    addTodo({ ...value, id: tempId })
    
    try {
      const result = await api.createTodo(value)
      // Replace with real data
      replaceTodo(tempId, result)
    } catch (error) {
      // Rollback on error
      removeTodo(tempId)
      throw error
    }
  },
})
```

### Dynamic Fields

```tsx
const form = useAppForm({
  defaultValues: {
    tags: [''],
  },
})

form.useField({
  name: 'tags',
  mode: 'array',
})

// Add tag
const addTag = () => {
  form.pushFieldValue('tags', '')
}

// Remove tag
const removeTag = (index: number) => {
  form.removeFieldValue('tags', index)
}

// Render
{form.state.values.tags.map((_, index) => (
  <form.Field key={index} name={`tags[${index}]`}>
    {(field) => (
      <div>
        <TextFieldAdapter label={`Tag ${index + 1}`} />
        <Button onPress={() => removeTag(index)}>Remove</Button>
      </div>
    )}
  </form.Field>
))}

<Button onPress={addTag}>Add Tag</Button>
```

---

## API Reference

### useForm / useAppForm Options

```tsx
{
  defaultValues: TFormData,           // Initial form values
  validators?: {
    onChange?: ValidatorFn,           // Validate on any field change
    onBlur?: ValidatorFn,             // Validate on any field blur
    onSubmit?: ValidatorFn,           // Validate on form submit
  },
  onSubmit: (data: {                  // Submit handler
    value: TFormData,
    formApi: FormApi<TFormData>
  }) => void | Promise<void>,
}
```

### Field Component Props

```tsx
<form.Field
  name="fieldName"                     // Field name (type-safe)
  validators?: {
    onChange?: FieldValidatorFn,       // Validate on change
    onBlur?: FieldValidatorFn,         // Validate on blur
  }
  children: (field: FieldApi) => React.ReactNode
/>
```

### Field API (field object in children)

```tsx
field.state.value                      // Current value
field.state.meta.errors                // Array of error messages
field.state.meta.isValidating          // Is currently validating
field.state.meta.isTouched             // Has been touched
field.handleChange(value)              // Update field value
field.handleBlur()                     // Trigger blur
field.form                             // Access to form API
```

### Form API (form object)

```tsx
form.state.values                      // All form values
form.state.errors                      // Form-level errors
form.state.isSubmitting                // Is currently submitting
form.state.isValidating                // Is currently validating
form.state.canSubmit                   // Can submit (valid & not submitting)
form.handleSubmit()                    // Trigger submit
form.reset()                           // Reset to default values
form.setFieldValue(name, value)        // Set field value
form.setFieldMeta(name, meta)          // Set field metadata
form.validateAllFields()               // Validate all fields
form.pushFieldValue(name, value)       // Add to array field
form.removeFieldValue(name, index)     // Remove from array field
```

### Form Subscribe

Subscribe to specific form state:

```tsx
<form.Subscribe selector={(state) => state.values.fieldName}>
  {(value) => <div>Current value: {value}</div>}
</form.Subscribe>
```

### Validation Function Types

```tsx
type ValidatorFn<TFormData> = (data: {
  value: TFormData,
  formValue: TFormData
}) => string | undefined | Promise<string | undefined>

type FieldValidatorFn<TValue, TFormData> = (data: {
  value: TValue,
  formValue: TFormData,
  fieldApi: FieldApi<TValue, TFormData>
}) => string | undefined | Promise<string | undefined>
```

---

## Zod Schema Patterns

### Basic Types

```tsx
z.string()                             // String
z.number()                             // Number
z.boolean()                            // Boolean
z.date()                               // Date object
z.enum(['a', 'b', 'c'])                // Enum
z.literal('exact')                     // Literal value
```

### Strings

```tsx
z.string()
  .min(3, 'Too short')                 // Min length
  .max(100, 'Too long')                // Max length
  .email('Invalid email')              // Email format
  .url('Invalid URL')                  // URL format
  .regex(/^[A-Z]/, 'Must start with uppercase')
  .trim()                              // Auto-trim
  .optional()                          // Optional field
  .nullable()                          // Can be null
```

### Numbers

```tsx
z.number()
  .min(0, 'Must be positive')          // Min value
  .max(100, 'Too large')               // Max value
  .int('Must be integer')              // Integer only
  .positive('Must be positive')        // > 0
  .nonnegative('Cannot be negative')   // >= 0
```

### Objects

```tsx
z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
})
```

### Arrays

```tsx
z.array(z.string())                    // Array of strings
  .min(1, 'At least one required')     // Min length
  .max(10, 'Too many items')           // Max length
```

### Optional & Nullable

```tsx
z.string().optional()                  // string | undefined
z.string().nullable()                  // string | null
z.string().nullish()                   // string | null | undefined
```

### Refinements (Custom Validation)

```tsx
z.string().refine(
  (val) => val.includes('@'),
  { message: 'Must contain @' }
)
```

### Transforms

```tsx
z.string().transform((val) => val.toLowerCase())
z.string().trim()                      // Built-in transform
```

---

## Best Practices

### ✅ DO

- Use Zod schemas for form-level validation
- Use field validators for immediate feedback
- Create reusable field components
- Keep forms composable and testable
- Reset form after successful submission
- Handle loading states properly
- Display clear error messages
- Use TypeScript for type safety

### ❌ DON'T

- Don't mix form state with other component state unnecessarily
- Don't forget to handle submission errors
- Don't validate on every keystroke for complex operations (use `onBlur`)
- Don't create overly complex forms (split into steps if needed)
- Don't forget accessibility (use proper labels, ARIA attributes)

---

## Troubleshooting

### TypeScript Errors

**Error: Field name not recognized**
- Solution: Ensure field name matches `defaultValues` keys exactly
- Check: TypeScript should auto-complete valid field names

**Error: Type mismatch in validator**
- Solution: Ensure validator return type is `string | undefined`
- Check: Async validators should return `Promise<string | undefined>`

### Validation Issues

**Validation not triggering**
- Check: Validator is in correct location (`onChange`, `onBlur`, `onSubmit`)
- Check: Validator function returns `undefined` for valid state

**Form submits despite errors**
- Check: Use `onSubmit` validator or field validators
- Check: Async validators complete before submission

### Performance Issues

**Too many re-renders**
- Solution: Use `form.Subscribe` with selector for specific values
- Solution: Use field-level components instead of form-level subscriptions

---

## Further Reading

- [TanStack Form Docs](https://tanstack.com/form/latest/docs/overview)
- [Form Composition Guide](https://tanstack.com/form/latest/docs/framework/react/guides/form-composition)
- [Zod Documentation](https://zod.dev/)
- [Implementation Plan](./TANSTACK_FORM_IMPLEMENTATION_PLAN.md)
- [Issue/Plan](./TANSTACK_FORM_ISSUE.md)

---

*Last Updated: 2026-01-11*
