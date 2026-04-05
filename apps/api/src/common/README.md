# 🛠️ Common Utilities & Cross-Cutting Concerns

This directory contains shared logic that permeates throughout the entire application, ensuring consistency and reducing code duplication.

## ✨ Core Shared Features

### 📡 Unified Response Formatting

The application uses a standardized JSON structure for all API interactions, ensuring a predictable client-side experience.

**Success Response Structure:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### 🛡️ Custom Decorators

We provide a set of decorators to simplify common tasks like authorization and response wrapping.

- **`@ApiSuccess(message)`**: Wraps the method's return value in a `SuccessResponse`.
- **`@Roles(...roles)`**: Restricts endpoint access to specific user roles.
- **`@CurrentUser()`**: Injects the authenticated user object into the controller method.
- **`@Public()`**: Explicitly marks an endpoint as accessible without authentication.

### Usage Example: Controller with Decorators

```typescript
@Controller('profile')
export class ProfileController {
  @Get()
  @ApiSuccess('Profile retrieved')
  @Roles('USER', 'ADMIN')
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

---

## 🔍 Exception Handling & Logging

### Global Filters

All uncaught exceptions are caught by global filters and transformed into a standard error format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "HTTP_STATUS_NAME",
  "statusCode": 400
}
```

### Structured Logging

Custom logger that provides:

- **Environment-based logging**: Detailed in development, concise in production.
- **Request Context**: Correlation IDs to track logs across a single request flow.
- **File Rotation**: Automatically manages log file sizes and retention.
