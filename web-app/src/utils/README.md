# Utility Functions and Constants

This directory contains utility functions and constants used across the application.

## Responsive Classes (`responsiveClasses.ts`)

Common className patterns for consistent responsive design across the application.

### Usage

```typescript
import { buttonBaseClasses, inputBaseClasses, modalPrimaryButtonClasses } from '../utils/responsiveClasses';

// Use in components
<button className={buttonBaseClasses}>
  Click me
</button>

<input className={inputBaseClasses} />

<button className={modalPrimaryButtonClasses('danger')}>
  Delete
</button>
```

### Available Utilities

- `buttonBaseClasses` - Standard button styling with tablet optimizations
- `inputBaseClasses` - Standard input styling with tablet optimizations
- `textareaBaseClasses` - Standard textarea styling
- `modalCancelButtonClasses` - Cancel/secondary button for modals
- `modalPrimaryButtonClasses(variant)` - Primary/confirm button for modals
- `modalTitleClasses` - Modal title text styling
- `modalTextClasses` - Modal body text styling
- `modalCloseButtonClasses` - Modal close button styling

### Benefits

1. **Consistency** - Ensures all buttons/inputs have the same responsive behaviour
2. **Maintainability** - Update styling in one place
3. **DRY Principle** - Reduces code duplication
4. **Type Safety** - TypeScript ensures correct usage

## Future Enhancements

Consider creating React components that wrap these utilities:
- `<ResponsiveButton>` component
- `<ResponsiveInput>` component
- `<ResponsiveModal>` component

