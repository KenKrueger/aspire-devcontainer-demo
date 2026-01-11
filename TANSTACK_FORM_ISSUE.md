# Issue: Implement TanStack Form

## Summary

Implement TanStack Form as the primary form state management solution for the application, replacing manual React state management with a type-safe, composable, and validation-ready form library.

## Motivation

The current form implementation in the application uses manual state management with React hooks, which has several limitations:

1. **Manual Validation**: Validation logic is embedded in event handlers, making it difficult to test and reuse
2. **Limited Composition**: No standardized way to create reusable form components
3. **Type Safety Gaps**: Form data types are manually managed without automatic inference
4. **Error Handling**: Error states and messages require manual state management
5. **Scalability**: Adding new forms or complex validation requires significant boilerplate

TanStack Form addresses these issues with:
- Built-in validation support (with Zod, Yup, etc.)
- Powerful form composition patterns
- Full TypeScript support with automatic type inference
- Minimal re-renders and optimized performance
- Seamless integration with React Aria Components

## Goals

1. ✅ Replace manual form state management with TanStack Form
2. ✅ Implement type-safe validation with Zod schemas
3. ✅ Create reusable form composition patterns
4. ✅ Maintain seamless integration with React Aria Components
5. ✅ Improve developer experience with better APIs and patterns
6. ✅ Enhance user experience with better validation feedback

## Non-Goals

- ❌ Replacing React Aria Components (we keep the existing UI library)
- ❌ Changing API contracts or backend validation
- ❌ Implementing features not related to forms
- ❌ Full application rewrite

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Install Dependencies:**
```bash
cd src/frontend
pnpm add @tanstack/react-form zod @tanstack/zod-form-adapter
```

**Create Form Infrastructure:**
- [ ] Set up `src/lib/form/` directory structure
- [ ] Implement `createAppForm.ts` with custom form hooks
- [ ] Create field adapters for React Aria Components:
  - [ ] TextFieldAdapter
  - [ ] CheckboxAdapter
  - [ ] DatePickerAdapter
  - [ ] TextAreaAdapter

**Create Schemas:**
- [ ] Set up `src/lib/schemas/` directory
- [ ] Implement `todoSchema.ts` with Zod validation rules

**Deliverables:**
- Custom form hook (`useAppForm`)
- Field adapters for all used React Aria Components
- Validation schemas

### Phase 2: Migration (Week 2)

**Migrate Todo Creation Form:**
- [ ] Update `App.tsx` to use TanStack Form
- [ ] Replace `useState` with `useForm`
- [ ] Implement field-level validation
- [ ] Add Zod schema validation on submit
- [ ] Update error handling
- [ ] Test form submission flow

**Create Form Components:**
- [ ] Extract todo form into `TodoCreateForm.tsx`
- [ ] Create reusable field components in `components/forms/fields/`

**Deliverables:**
- Fully migrated todo creation form
- Improved validation and error handling
- Better user feedback

### Phase 3: Advanced Features (Week 3)

**Implement Form Composition:**
- [ ] Create composed field components (e.g., `TodoTitleField`)
- [ ] Implement form sections for grouping
- [ ] Add support for field dependencies
- [ ] Create form templates for common patterns

**Future-Proofing:**
- [ ] Design multi-step form structure (implementation optional)
- [ ] Document dynamic field array patterns
- [ ] Create examples for complex scenarios

**Deliverables:**
- Reusable form component library
- Documentation for form composition patterns
- Examples for advanced use cases

### Phase 4: Testing & Documentation (Week 4)

**Testing:**
- [ ] Write unit tests for form utilities (coverage > 80%)
- [ ] Write unit tests for validation schemas
- [ ] Write integration tests for form components
- [ ] Add E2E tests with Playwright (if applicable)

**Documentation:**
- [ ] Developer guide for creating new forms
- [ ] Best practices documentation
- [ ] Code examples and patterns
- [ ] Migration guide for existing forms

**Deliverables:**
- Comprehensive test suite
- Complete documentation
- Developer onboarding guide

## Technical Details

### Form Composition Pattern

```tsx
// src/lib/form/createAppForm.ts
import { createFormHookContexts, createFormHook } from '@tanstack/react-form'
import { TextField } from '@/components/ui/TextField'
import { DatePicker } from '@/components/ui/DatePicker'

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts()

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    DatePicker,
  },
  formComponents: {},
})
```

### Field Adapter Example

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
      {...props}
    />
  )
}
```

### Validation Schema Example

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
})

export type TodoFormData = z.infer<typeof todoSchema>
```

### Form Usage Example

```tsx
// src/components/forms/TodoCreateForm.tsx
import { useAppForm } from '@/lib/form/createAppForm'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { todoSchema } from '@/lib/schemas/todoSchema'

export function TodoCreateForm({ onSuccess }) {
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
      const result = await postApiTodos({ body: value })
      if (!result.error) {
        onSuccess(result.data)
        form.reset()
      }
    },
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      form.handleSubmit()
    }}>
      <form.Field name="title">
        {(field) => (
          <TextFieldAdapter
            label="Task Title"
            placeholder="Enter title"
          />
        )}
      </form.Field>

      <Button
        type="submit"
        isDisabled={form.state.isSubmitting}
      >
        Add Task
      </Button>
    </form>
  )
}
```

## File Structure

```
src/frontend/src/
├── lib/
│   ├── form/
│   │   ├── createAppForm.ts          # Custom form hook with contexts
│   │   ├── adapters/
│   │   │   ├── TextFieldAdapter.tsx  # React Aria TextField adapter
│   │   │   ├── CheckboxAdapter.tsx   # React Aria Checkbox adapter
│   │   │   ├── DatePickerAdapter.tsx # React Aria DatePicker adapter
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── formHelpers.ts        # Utility functions
│   │       └── validationHelpers.ts  # Validation utilities
│   └── schemas/
│       ├── todoSchema.ts             # Todo validation schema
│       └── index.ts
├── components/
│   └── forms/
│       ├── TodoCreateForm.tsx        # Main todo creation form
│       ├── fields/
│       │   ├── TodoTitleField.tsx    # Reusable title field
│       │   ├── TodoNotesField.tsx    # Reusable notes field
│       │   └── TodoDueDateField.tsx  # Reusable due date field
│       └── __tests__/
│           └── TodoCreateForm.test.tsx
└── App.tsx
```

## Success Metrics

### Technical Metrics
- ✅ All forms use TanStack Form
- ✅ Zero TypeScript errors
- ✅ Test coverage > 80%
- ✅ No performance regressions
- ✅ Full type inference working

### User Experience Metrics
- ✅ Instant validation feedback
- ✅ Clear error messages
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Smooth form interactions
- ✅ No breaking UI changes

### Developer Experience Metrics
- ✅ Reduced boilerplate code
- ✅ Intuitive API for new forms
- ✅ Comprehensive documentation
- ✅ Easy to test forms
- ✅ Clear patterns established

## Testing Strategy

### Unit Tests
- Form utilities
- Validation schemas
- Field adapters
- Helper functions

### Integration Tests
- Form submission flow
- Validation behavior
- Error handling
- Loading states

### E2E Tests (Playwright)
- Complete user workflows
- Form accessibility
- Error scenarios
- Success scenarios

## Resources

### Official Documentation
- [TanStack Form Docs](https://tanstack.com/form/latest/docs/overview)
- [Form Composition Guide](https://tanstack.com/form/latest/docs/framework/react/guides/form-composition)
- [Shadcn + TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form)
- [Zod Documentation](https://zod.dev/)

### Community Resources
- [Shadcn TanStack Form Examples](https://github.com/FatahChan/shadcn-tanstack-form)
- [Live Demo](https://fatahchan.github.io/shadcn-tanstack-form/)
- [Integration Guide](https://dev.to/felipestanzani/seamless-forms-with-shadcnui-and-tanstack-form-mng)

### Reference Implementation
- [Complete Implementation Plan](./TANSTACK_FORM_IMPLEMENTATION_PLAN.md)

## Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | Week 1 | Form hooks, adapters, schemas |
| Phase 2: Migration | Week 2 | Migrated forms with validation |
| Phase 3: Advanced | Week 3 | Composition patterns, examples |
| Phase 4: Testing | Week 4 | Tests, documentation |

**Total Duration:** 4 weeks

## Dependencies

### NPM Packages
- `@tanstack/react-form` (^0.29.0)
- `zod` (^3.23.0)
- `@tanstack/zod-form-adapter` (^0.29.0)

### Existing Code
- React Aria Components (no changes needed)
- Existing API client (no changes needed)
- Current component library (enhanced, not replaced)

## Risks & Mitigation

### Low Risk
✅ **TanStack Form is production-ready**
- Mitigation: N/A (stable library)

✅ **React Aria Components support composition**
- Mitigation: N/A (designed for this)

### Medium Risk
⚠️ **Team learning curve**
- Mitigation: Provide training, documentation, and examples

⚠️ **Migration effort**
- Mitigation: Start with simple forms, migrate incrementally

⚠️ **Over-engineering simple forms**
- Mitigation: Keep simple forms simple, use advanced features only when needed

### High Risk
❌ None identified

## Acceptance Criteria

- [ ] All dependencies installed successfully
- [ ] Form infrastructure created and documented
- [ ] Field adapters working with React Aria Components
- [ ] Todo creation form migrated and tested
- [ ] Validation working correctly (client-side)
- [ ] Error messages displayed properly
- [ ] Loading states handled correctly
- [ ] Tests passing (coverage > 80%)
- [ ] Documentation complete
- [ ] No accessibility regressions
- [ ] No performance regressions
- [ ] Code reviewed and approved

## Related Issues

- (None yet - this is the primary issue)

## Additional Notes

### Form Composition is Key

As mentioned in the requirements, form composition is a critical aspect of this implementation. The plan emphasizes:

1. **Custom Form Hooks**: Pre-configured form hooks with bound UI components
2. **Field Adapters**: Reusable adapters for React Aria Components
3. **Composed Fields**: Higher-level field components encapsulating validation and logic
4. **Form Sections**: Logical grouping of related fields
5. **Reusable Patterns**: Templates for common form scenarios

### React Aria Components Integration

The implementation maintains full compatibility with React Aria Components, which means:

- ✅ All accessibility features preserved
- ✅ No visual changes to existing components
- ✅ Enhanced with validation and error handling
- ✅ Type-safe integration layer

### Progressive Enhancement

The implementation follows a progressive enhancement approach:

1. Start with simple forms (todo creation)
2. Add validation and error handling
3. Introduce composition patterns
4. Build reusable component library
5. Document advanced patterns for future use

This ensures the project delivers value incrementally while building toward a comprehensive form solution.

---

**Created:** 2026-01-11
**Status:** Planning
**Priority:** High
**Labels:** enhancement, forms, typescript, dx-improvement
