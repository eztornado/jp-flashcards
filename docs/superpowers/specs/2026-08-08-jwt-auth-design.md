# JWT Authentication Design for jp-flashcards

**Date:** 2026-08-08
**Author:** Design from brainstorming session
**Status:** Approved

## Overview

Implement authentication system with JWT sessions for jp-flashcards application, converting from public routes to private CRM-style access control with two user roles (USER, ADMIN).

## Requirements

### Functional Requirements

1. **Login System**: Username/password authentication with JWT tokens
2. **User Roles**: USER (basic access) and ADMIN (full access including Admin section)
3. **Route Protection**: All routes except `/health` and `/api/auth/login` require authentication
4. **Admin Initialization**: Console command to create initial admin account
5. **SQLite Storage**: Users stored in existing SQLite database
6. **Frontend Integration**: Redirect to login if not authenticated, conditional navbar based on role

### Non-Functional Requirements

1. **JWT Expiration**: 24 hours fixed
2. **Password Security**: bcrypt hashing with 10 salt rounds
3. **Minimal Dependencies**: No heavy auth frameworks
4. **Frontend Storage**: localStorage for JWT token
5. **Healthcheck**: `/health` endpoint remains public

## Architecture

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('USER', 'ADMIN')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

### Backend Structure

```
backend/src/
├── index.ts (existing - add middleware)
├── auth/
│   ├── middleware.ts       # authMiddleware, requireRole
│   ├── routes.ts           # /api/auth/login
│   └── utils.ts            # hashPassword, comparePassword, createToken
└── scripts/
    └── create-admin.ts     # npm run create-admin command
```

### Frontend Structure

```
frontend/src/
├── main.tsx (modified - AuthProvider wrapper)
├── contexts/
│   └── AuthContext.tsx    # Context + localStorage
├── components/
│   └── ProtectedRoute.tsx  # Wrapper for private routes
├── pages/
│   ├── Login.tsx           # New login page
│   ├── App.tsx (modified)
│   ├── Admin.tsx (modified)
│   ├── Chat.tsx (modified)
│   └── Quiz.tsx (modified)
└── lib/
    └── api.ts              # Axios with interceptor
```

## Backend Implementation

### Dependencies

Add to `backend/package.json`:
```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.6"
  }
}
```

### Environment Variables

Required:
- `JWT_SECRET`: Secret key for signing JWTs (app fails to start if missing)

### Public Routes

- `GET /health` - Healthcheck endpoint
- `POST /api/auth/login` - Login endpoint

### Auth Middleware

**`authMiddleware.ts`**: Validates JWT and populates `req.user`

```typescript
const PUBLIC_ROUTES = ['/health', '/api/auth/login'];

export function authMiddleware(req, res, next) {
  if (PUBLIC_ROUTES.includes(req.path)) return next();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**`requireRole(role)`**: Middleware for role-based access

```typescript
export function requireRole(role: 'ADMIN' | 'USER') {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### Login Endpoint

**`POST /api/auth/login`**

Request:
```json
{
  "username": "string",
  "password": "string"
}
```

Success Response (200):
```json
{
  "token": "jwt_string",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "ADMIN"
  }
}
```

Error Response (401):
```json
{
  "error": "Invalid credentials"
}
```

### Protected Routes

**ADMIN-only routes:**
- `DELETE /api/words`
- `DELETE /api/kanji`
- `POST /api/import`

**Authenticated routes (USER or ADMIN):**
- All other `/api/*` routes

### Create Admin Command

**`npm run create-admin`**

Interactive flow:
1. Prompt: "Username:" (min 3 chars, alphanumeric)
2. Prompt: "Password:" (hidden input, min 8 chars)
3. Prompt: "Confirm password:" (must match)
4. Check if user exists → error if duplicate
5. Hash password with bcrypt
6. Insert user with ADMIN role
7. Success message

## Frontend Implementation

### Dependencies

Add to `frontend/package.json` (if not present):
```json
{
  "dependencies": {
    "axios": "^1.x"
  }
}
```

### AuthContext

**State:**
```typescript
{
  user: { id, username, role } | null,
  token: string | null,
  isAuthenticated: boolean,
  isAdmin: boolean,
  login: (username, password) => Promise<void>,
  logout: () => void
}
```

**Storage:** `localStorage` with key `auth`
```json
{
  "token": "jwt_string",
  "user": { "id": 1, "username": "admin", "role": "ADMIN" }
}
```

### Login Page

**`/login` route:**
- Form with username + password fields
- Mantine form validation
- Calls `authContext.login()`
- Success → redirect to `/`
- Error → show notification

### ProtectedRoute Component

```typescript
<ProtectedRoute requireAdmin={false}> // Default
<ProtectedRoute requireAdmin={true}>  // Admin only
```

Behavior:
1. Not authenticated → redirect to `/login`
2. Insufficient role → redirect to `/`

### Axios Configuration

**Request interceptor:** Inject `Authorization: Bearer ${token}` header

**Response interceptor:** Handle 401 by logging out and redirecting to `/login`

### Navbar Conditional Rendering

```typescript
{user?.role === 'ADMIN' && (
  <Button component={Link} to="/admin">Admin</Button>
)}
```

## Error Handling

### Status Codes

- **200**: Success
- **400**: Invalid input (username/password validation)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient role)
- **500**: Server error

### Frontend Error Flow

1. 401 response → logout + redirect to `/login`
2. 403 response → show notification "Acceso denegado"
3. Network error → show notification "Error de conexión"

## Security Considerations

1. **Password Storage**: bcrypt with 10 salt rounds
2. **JWT Secret**: Required environment variable, no default
3. **Password Requirements**: Min 8 characters
4. **Username Requirements**: Min 3 characters, alphanumeric
5. **HTTPS**: Recommended in production (handled by Coolify)
6. **Token Storage**: localStorage (acceptable for this use case)

## Testing Strategy

### Backend Unit Tests

- `auth/utils.test.ts`: password hashing, JWT creation
- `auth/middleware.test.ts`: auth middleware, requireRole
- `auth/routes.test.ts`: login endpoint

### Manual Testing

1. Run `npm run create-admin`
2. Login with created admin
3. Verify token in localStorage
4. Access `/admin` route
5. Create USER account (future feature)
6. Verify USER cannot access `/admin`

## Migration Path

1. Add dependencies (`bcrypt`, `jsonwebtoken`, types)
2. Create `users` table migration
3. Implement backend auth (middleware, routes, utils)
4. Implement frontend auth (Context, components, pages)
5. Run `npm run create-admin`
6. Update existing routes with middleware
7. Test complete flow

## Files Summary

### New Files (10)

1. `backend/src/auth/middleware.ts`
2. `backend/src/auth/routes.ts`
3. `backend/src/auth/utils.ts`
4. `backend/src/scripts/create-admin.ts`
5. `frontend/src/contexts/AuthContext.tsx`
6. `frontend/src/components/ProtectedRoute.tsx`
7. `frontend/src/pages/Login.tsx`
8. `frontend/src/lib/api.ts`
9. `backend/package.json` (modified)
10. `frontend/package.json` (modified)

### Modified Files (5)

1. `backend/src/index.ts` - Add auth middleware and routes
2. `frontend/src/main.tsx` - Wrap with AuthProvider
3. `frontend/src/pages/App.tsx` - Use AuthContext
4. `frontend/src/pages/Chat.tsx` - Use ProtectedRoute
5. `frontend/src/pages/Quiz.tsx` - Use ProtectedRoute

## Notes

- Healthcheck endpoint remains public for Docker/Coolify
- JWT tokens expire after 24 hours
- No refresh token mechanism (YAGNI for this use case)
- No user registration endpoint (admin creates users manually - future feature)
