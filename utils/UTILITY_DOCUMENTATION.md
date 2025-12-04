# Snapify Utility Functions Documentation

## Overview

This documentation provides comprehensive information about the consolidated utility functions in the Snapify application. The utilities have been organized into focused modules for better maintainability, testability, and performance.

## Module Structure

### 1. Validation Utilities (`validation.ts`)

**Purpose**: Input validation and sanitization functions

**Functions**:
- `validateEmail(email: string): boolean` - Validates email format and length
- `validatePassword(password: string): boolean` - Validates password strength
- `validateEventTitle(title: string): boolean` - Validates event title length
- `validateEventDescription(description: string): boolean` - Validates event description length
- `validateGuestName(name: string): boolean` - Validates guest name format and length
- `sanitizeInput(input: string): string` - Sanitizes user input for security
- `sanitizeHtml(input: string): string` - Sanitizes HTML content
- `RateLimiter` class - Rate limiting utility
- `getSecurityHeaders()` - Returns security headers object
- `validateFileType(file: File): boolean` - Validates file types
- `validateFileName(filename: string): string` - Sanitizes filenames

**Usage Example**:
```typescript
import { validateEmail, sanitizeInput } from './utils/validation';

const isValid = validateEmail('user@example.com');
const safeInput = sanitizeInput('<script>alert("xss")</script>');
```

### 2. Storage Utilities (`storageUtils.ts`)

**Purpose**: Safe localStorage operations with error handling

**Functions**:
- `safeSetItem(key: string, value: string): boolean` - Safely sets item in localStorage
- `safeGetItem(key: string): string | null` - Safely gets item from localStorage
- `safeRemoveItem(key: string): boolean` - Safely removes item from localStorage
- `safeSetObject<T>(key: string, value: T): boolean` - Safely stores objects
- `safeGetObject<T>(key: string): T | null` - Safely retrieves objects

**Usage Example**:
```typescript
import { safeSetItem, safeGetItem } from './utils/storageUtils';

safeSetItem('user_token', 'abc123');
const token = safeGetItem('user_token');
```

### 3. User Management Utilities (`userManagementUtils.ts`)

**Purpose**: User-related state management

**Functions**:
- `handleUserUpdate(updatedUser: User, setCurrentUser: Function, setAllUsers: Function): void` - Updates user state across the application

**Usage Example**:
```typescript
import { handleUserUpdate } from './utils/userManagementUtils';

handleUserUpdate(updatedUserData, setCurrentUser, setAllUsers);
```

### 4. Event Management Utilities (`eventManagementUtils.ts`)

**Purpose**: Event-related operations and state management

**Functions**:
- `incrementEventViews(id: string, currentEvents: Event[], setEvents: Function): Promise<void>` - Increments event view count
- `handleLikeMedia(item: MediaItem, activeEvent: Event | null, setEvents: Function): Promise<void>` - Handles media likes
- `handleSetCoverImage(item: MediaItem, activeEvent: Event | null, setEvents: Function): Promise<string>` - Sets event cover image

**Usage Example**:
```typescript
import { incrementEventViews } from './utils/eventManagementUtils';

await incrementEventViews('event-123', events, setEvents);
```

### 5. Authentication Utilities (`authenticationUtils.ts`)

**Purpose**: Authentication workflow management

**Functions**:
- `finalizeLogin(user: User, token: string, setCurrentUser: Function, setEvents: Function, setAllUsers: Function, setView: Function, setCurrentEventId: Function): Promise<void>` - Completes login process
- `handleLogout(currentUser: User | null, setCurrentUser: Function, setGuestName: Function, setView: Function, setCurrentEventId: Function): Promise<void>` - Handles logout process

**Usage Example**:
```typescript
import { finalizeLogin, handleLogout } from './utils/authenticationUtils';

await finalizeLogin(userData, token, setCurrentUser, setEvents, setAllUsers, setView, setCurrentEventId);
```

### 6. Error Handling Utilities (`errorHandlingUtils.ts`)

**Purpose**: Consistent error handling across the application

**Functions**:
- `handleError(error: any, defaultMessage: string, t: Function): string` - Handles and formats errors

**Usage Example**:
```typescript
import { handleError } from './utils/errorHandlingUtils';

const errorMessage = handleError(apiError, 'Default error message', translate);
```

### 7. Media Management Utilities (`mediaManagementUtils.ts`)

**Purpose**: Media upload and processing operations

**Functions**:
- `handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, activeEvent: Event | null, setPreviewMedia: Function, setFileInputKey: Function): void` - Handles file selection
- `confirmUpload(previewMedia: MediaPreview, activeEvent: Event | null, currentUser: User | null, guestName: string, applyWatermark: boolean, setIsUploading: Function, setUploadProgress: Function, setPreviewMedia: Function, setFileInputKey: Function, setCameraInputKey: Function, t: Function): Promise<void>` - Confirms and processes media upload

**Usage Example**:
```typescript
import { handleFileUpload, confirmUpload } from './utils/mediaManagementUtils';

handleFileUpload(event, activeEvent, setPreviewMedia, setFileInputKey);
await confirmUpload(previewMedia, activeEvent, currentUser, guestName, true, setIsUploading, setUploadProgress, setPreviewMedia, setFileInputKey, setCameraInputKey, translate);
```

### 8. Centralized Utilities (`centralizedUtils.ts`)

**Purpose**: Main utility hub for backward compatibility

**Functions**:
- Re-exports all functions from focused modules
- `createEvent()` - Event creation workflow
- `setupSocketHandlers()` - Socket.IO event handlers

**Usage Example**:
```typescript
import { createEvent, setupSocketHandlers } from './utils/centralizedUtils';

await createEvent(currentUser, formData, setEvents, setShowCreateModal, setCurrentEventId, setView, translate);
const cleanup = setupSocketHandlers(currentUser, setCurrentUser, setAllUsers, setFetchedHostUsers);
```

## TypeScript Typing

All utility functions include proper TypeScript typing:

- Input parameters are explicitly typed
- Return types are clearly defined
- Generic types are used where appropriate (e.g., `safeSetObject<T>()`)
- Complex object types are imported from the central types module

## Testing

Each utility module should be tested independently. Example test structure:

```typescript
import { validateEmail, sanitizeInput } from './utils/validation';

describe('Validation Utilities', () => {
    test('validateEmail should return true for valid emails', () => {
        expect(validateEmail('user@example.com')).toBe(true);
        expect(validateEmail('first.last@sub.domain.co.uk')).toBe(true);
    });

    test('validateEmail should return false for invalid emails', () => {
        expect(validateEmail('invalid-email')).toBe(false);
        expect(validateEmail('user@.com')).toBe(false);
    });

    test('sanitizeInput should remove dangerous characters', () => {
        expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
    });
});
```

## Migration Guide

### From Old Structure to New Structure

**Before**:
```typescript
import { validateEmail, handleUserUpdate } from './utils/centralizedUtils';
```

**After**:
```typescript
// Option 1: Import from specific module
import { validateEmail } from './utils/validation';
import { handleUserUpdate } from './utils/userManagementUtils';

// Option 2: Import from centralized hub (backward compatible)
import { validateEmail, handleUserUpdate } from './utils/centralizedUtils';
```

## Best Practices

1. **Import from specific modules** when you only need functions from one category
2. **Use the centralized hub** when you need functions from multiple categories
3. **Type all function parameters** when calling utility functions
4. **Handle errors appropriately** - most functions include error handling
5. **Use the validation functions** before processing user input

## Performance Considerations

- Storage utilities use try/catch to prevent localStorage errors from crashing the app
- Validation functions are optimized for performance
- Media management includes size checks to prevent large file uploads
- All functions are designed to be tree-shakable for optimal bundle size