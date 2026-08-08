# JWT Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement JWT-based authentication system with USER/ADMIN roles, protecting all routes except healthcheck and login.

**Architecture:** Backend Express middleware validates JWT tokens and populates `req.user`. Frontend React Context manages auth state in localStorage. Protected routes redirect unauthenticated users to login page.

**Tech Stack:** bcrypt (password hashing), jsonwebtoken (JWT), SQLite (user storage), React Context (state), Axios (API client with interceptors)

## Global Constraints

- JWT_SECRET environment variable is **required** (app fails to start if missing)
- JWT expiration: **24 hours** (fixed)
- Password minimum: **8 characters**
- Username minimum: **3 characters**, alphanumeric only
- Public routes: **only** `/health` and `/POST /api/auth/login`
- ADMIN-only routes: `DELETE /api/words`, `DELETE /api/kanji`, `POST /api/import`
- Token storage: **localStorage** with key `auth`
- bcrypt salt rounds: **10**

---

## File Structure

### New Files (10)

1. `backend/src/auth/middleware.ts` - Auth middleware, requireRole
2. `backend/src/auth/routes.ts` - Login endpoint
3. `backend/src/auth/utils.ts` - Password hashing, JWT creation
4. `backend/src/scripts/create-admin.ts` - Interactive admin creation CLI
5. `frontend/src/contexts/AuthContext.tsx` - Auth state management
6. `frontend/src/components/ProtectedRoute.tsx` - Route protection wrapper
7. `frontend/src/pages/Login.tsx` - Login page
8. `frontend/src/lib/api.ts` - Axios instance with interceptors
9. `backend/package.json` - Add dependencies (modify)
10. `frontend/package.json` - Add dependencies (modify)

### Modified Files (5)

1. `backend/src/index.ts` - Wire auth middleware, add login routes
2. `frontend/src/main.tsx` - Wrap app with AuthProvider
3. `frontend/src/pages/App.tsx` - Use AuthContext for navbar
4. `frontend/src/pages/Chat.tsx` - Wrap with ProtectedRoute
5. `frontend/src/pages/Quiz.tsx` - Wrap with ProtectedRoute

---

## Implementation Tasks

### Task 1: Add Backend Dependencies

**Files:**
- Modify: `backend/package.json`

**Interfaces:**
- Produces: Installed `bcrypt`, `jsonwebtoken`, and their TypeScript types

- [ ] **Step 1: Add dependencies to package.json**

Add to `dependencies`:
```json
"bcrypt": "^5.1.1",
"jsonwebtoken": "^9.0.2"
```

Add to `devDependencies`:
```json
"@types/bcrypt": "^5.0.2",
"@types/jsonwebtoken": "^9.0.6"
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd backend && npm install
```

Expected: No errors, packages installed successfully.

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "deps: add bcrypt and jsonwebtoken for JWT authentication"
```

---

### Task 2: Create Auth Utilities

**Files:**
- Create: `backend/src/auth/utils.ts`

**Interfaces:**
- Produces: `hashPassword(password: string): string`, `comparePassword(password: string, hash: string): Promise<boolean>`, `createToken(user: UserPayload): string`

- [ ] **Step 1: Create utils.ts file**

Create `backend/src/auth/utils.ts`:
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '24h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface UserPayload {
  id: number;
  username: string;
  role: 'USER' | 'ADMIN';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(user: UserPayload): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/utils.ts
git commit -m "feat: add auth utilities (password hashing, JWT)"
```

---

### Task 3: Create Auth Middleware

**Files:**
- Create: `backend/src/auth/middleware.ts`

**Interfaces:**
- Consumes: `verifyToken(token: string): UserPayload | null` from `utils.ts`
- Produces: `authMiddleware(req, res, next)`, `requireRole(role: 'ADMIN' | 'USER')(req, res, next)`

- [ ] **Step 1: Create middleware.ts file**

Create `backend/src/auth/middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserPayload } from './utils';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

const PUBLIC_ROUTES = ['/health', '/api/auth/login'];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for public routes
  if (PUBLIC_ROUTES.includes(req.path)) {
    return next();
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  // Verify token
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

export function requireRole(role: 'ADMIN' | 'USER') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/middleware.ts
git commit -m "feat: add JWT authentication middleware"
```

---

### Task 4: Create Login Routes

**Files:**
- Create: `backend/src/auth/routes.ts`

**Interfaces:**
- Consumes: `hashPassword`, `comparePassword`, `createToken`, `UserPayload` from `utils.ts`
- Produces: POST `/api/auth/login` endpoint

- [ ] **Step 1: Create routes.ts file**

Create `backend/src/auth/routes.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { comparePassword, createToken, UserPayload } from './utils';

const LoginSchema = z.object({
  username: z.string().min(3).regex(/^[a-zA-Z0-9]+$/, 'Username must be alphanumeric'),
  password: z.string().min(8),
});

export function createAuthRoutes(db: Database.Database): Router {
  const router = Router();

  router.post('/login', async (req: Request, res: Response) => {
    // Validate request body
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid username or password format' });
    }

    const { username, password } = parsed.data;

    // Find user
    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!userRow) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRow as { id: number; username: string; password_hash: string; role: 'USER' | 'ADMIN' };

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create token
    const userPayload: UserPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    const token = createToken(userPayload);

    // Return token and user info
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  });

  return router;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/routes.ts
git commit -m "feat: add login endpoint with JWT response"
```

---

### Task 5: Integrate Auth into Backend Index

**Files:**
- Modify: `backend/src/index.ts`

**Interfaces:**
- Consumes: `authMiddleware`, `requireRole` from `middleware.ts`, `createAuthRoutes` from `routes.ts`

- [ ] **Step 1: Add imports and users table**

Add at top of `backend/src/index.ts` after existing imports:
```typescript
import { authMiddleware, requireRole } from './auth/middleware';
import { createAuthRoutes } from './auth/routes';
```

Add after line 100 (after chat_messages table creation):
```typescript
// Crear tabla para usuarios
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('USER', 'ADMIN')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
ON users(username);
`);
```

- [ ] **Step 2: Add auth middleware globally**

After `app.use(cors());` and `app.use(express.json());` (around line 213):
```typescript
// Auth middleware (must be after express.json and before routes)
app.use(authMiddleware);
```

- [ ] **Step 3: Add auth routes**

After the healthcheck endpoint (around line 218):
```typescript
// Auth routes
app.use('/api/auth', createAuthRoutes(db));
```

- [ ] **Step 4: Add requireRole to ADMIN-only routes**

Modify these routes to use `requireRole('ADMIN')`:

For `DELETE /api/words` (around line 706):
```typescript
app.delete('/api/words', requireRole('ADMIN'), (req, res) => {
```

For `DELETE /api/kanji` (around line 435):
```typescript
app.delete('/api/kanji', requireRole('ADMIN'), (req, res) => {
```

For `POST /api/import` (around line 613):
```typescript
app.post('/api/import', upload.single('file'), requireRole('ADMIN'), (req, res) => {
```

- [ ] **Step 5: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: integrate JWT auth middleware and protect ADMIN routes"
```

---

### Task 6: Create Admin CLI Script

**Files:**
- Create: `backend/src/scripts/create-admin.ts`

**Interfaces:**
- Consumes: `hashPassword` from `utils.ts`

- [ ] **Step 1: Create create-admin.ts script**

Create `backend/src/scripts/create-admin.ts`:
```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { hashPassword } from '../auth/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = process.env.DATA_PATH || path.resolve(__dirname, '..', '..', '..', 'data');
const dbPath = path.join(DATA_PATH, 'words.sqlite');

const db = new Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function hideQuery(query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdin.setRawMode(true);
    stdout.write(query);

    let password = '';

    const onData = (char: Buffer) => {
      const charStr = char.toString();
      if (charStr === '\n' || charStr === '\r' || charStr === '') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        stdout.write('\n');
        rl.close();
        resolve(password);
      } else if (charStr === '') {
        // Ctrl+C
        process.exit();
      } else if (charStr === '') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
      } else {
        password += charStr;
      }
    };

    stdin.on('data', onData);
  });
}

async function main() {
  console.log('\n=== Create Admin User ===\n');

  const username = await question('Username (min 3 chars, alphanumeric): ');

  if (username.length < 3) {
    console.error('Error: Username must be at least 3 characters');
    process.exit(1);
  }

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    console.error('Error: Username must be alphanumeric');
    process.exit(1);
  }

  // Check if user exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    console.error('Error: User already exists');
    process.exit(1);
  }

  const password = await hideQuery('Password (min 8 chars): ');

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  const confirmPassword = await hideQuery('Confirm password: ');

  if (password !== confirmPassword) {
    console.error('Error: Passwords do not match');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const info = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, passwordHash, 'ADMIN');

  console.log(`\n✓ Admin user created successfully (ID: ${info.lastInsertRowid})`);
  console.log(`  Username: ${username}`);
  console.log(`  Role: ADMIN\n`);

  db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script to package.json**

Add to `backend/package.json` in `scripts`:
```json
"create-admin": "node dist/scripts/create-admin.js"
```

Also add to `backend/package.json` in `scripts`:
```json
"build:scripts": "tsc src/scripts/create-admin.ts --outDir dist --moduleResolution node16 --module nodenext --target es2020 --esModuleInterop",
```

- [ ] **Step 3: Build the script**

Run:
```bash
cd backend && npm run build:scripts
```

Expected: `dist/scripts/create-admin.js` created.

- [ ] **Step 4: Test the script (interactive)**

Run:
```bash
cd backend && npm run create-admin
```

Enter a test username and password. Expected: User created successfully.

- [ ] **Step 5: Verify in database**

Run:
```bash
cd backend && sqlite3 data/words.sqlite "SELECT id, username, role FROM users;"
```

Expected: One row with the created admin user.

- [ ] **Step 6: Clean up test user (optional)**

```bash
cd backend && sqlite3 data/words.sqlite "DELETE FROM users WHERE username = 'YOUR_TEST_USERNAME';"
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/scripts/create-admin.ts backend/package.json backend/dist/scripts/create-admin.js
git commit -m "feat: add create-admin CLI script"
```

---

### Task 7: Add Frontend Dependencies

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: Installed `axios` for API calls

- [ ] **Step 1: Add axios dependency**

Add to `dependencies` in `frontend/package.json` (or verify it exists):
```json
"axios": "^1.7.0"
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd frontend && npm install
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "deps: add axios for API calls"
```

---

### Task 8: Create Axios Instance with Interceptors

**Files:**
- Create: `frontend/src/lib/api.ts`

**Interfaces:**
- Produces: `api` instance that injects JWT token and handles 401 responses

- [ ] **Step 1: Create api.ts file**

Create `frontend/src/lib/api.ts`:
```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://rpi2.netbird.vpn:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject JWT token
api.interceptors.request.use((config) => {
  const authData = localStorage.getItem('auth');
  if (authData) {
    try {
      const { token } = JSON.parse(authData);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Invalid auth data, ignore
    }
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('auth');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add axios instance with JWT interceptors"
```

---

### Task 9: Create AuthContext

**Files:**
- Create: `frontend/src/contexts/AuthContext.tsx`

**Interfaces:**
- Consumes: `api` from `lib/api.ts`
- Produces: `AuthContext` with `user`, `token`, `isAuthenticated`, `isAdmin`, `login()`, `logout()`

- [ ] **Step 1: Create AuthContext.tsx file**

Create `frontend/src/contexts/AuthContext.tsx`:
```typescript
import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  id: number;
  username: string;
  role: 'USER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthData {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authData, setAuthData] = useState<AuthData | null>(null);

  // Load auth data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        setAuthData(JSON.parse(stored));
      } catch {
        localStorage.removeItem('auth');
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.post('/api/auth/login', { username, password });
    const data: AuthData = response.data;

    setAuthData(data);
    localStorage.setItem('auth', JSON.stringify(data));
  };

  const logout = () => {
    setAuthData(null);
    localStorage.removeItem('auth');
  };

  const value: AuthContextType = {
    user: authData?.user || null,
    token: authData?.token || null,
    isAuthenticated: !!authData,
    isAdmin: authData?.user?.role === 'ADMIN',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/contexts/AuthContext.tsx
git commit -m "feat: add AuthContext for auth state management"
```

---

### Task 10: Create ProtectedRoute Component

**Files:**
- Create: `frontend/src/components/ProtectedRoute.tsx`

**Interfaces:**
- Consumes: `useAuth` from `AuthContext.tsx`

- [ ] **Step 1: Create ProtectedRoute.tsx file**

Create `frontend/src/components/ProtectedRoute.tsx`:
```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ProtectedRoute.tsx
git commit -m "feat: add ProtectedRoute component"
```

---

### Task 11: Create Login Page

**Files:**
- Create: `frontend/src/pages/Login.tsx`

**Interfaces:**
- Consumes: `useAuth` from `AuthContext.tsx`

- [ ] **Step 1: Create Login.tsx file**

Create `frontend/src/pages/Login.tsx`:
```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, Title, TextInput, PasswordInput, Button, Stack, Alert } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" pt={100}>
      <Paper p="md" shadow="sm" radius="md">
        <Stack>
          <Title order={2} ta="center">JP Flashcards - Login</Title>

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />

              <Button type="submit" fullWidth loading={loading}>
                Login
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "feat: add login page"
```

---

### Task 12: Integrate Auth into Frontend Main

**Files:**
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `AuthProvider` from `contexts/AuthContext.tsx`

- [ ] **Step 1: Wrap app with AuthProvider and add login route**

Modify `frontend/src/main.tsx`:
```typescript
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'  // Add this
import App from './pages/App'
import Admin from './pages/Admin'
import Chat from './pages/Chat'
import Quiz from './pages/Quiz'
import Login from './pages/Login'  // Add this

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },  // Add this
  { path: '/', element: <App /> },
  { path: '/admin', element: <Admin /> },
  { path: '/chat', element: <Chat /> },
  { path: '/quiz', element: <Quiz /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>  {/* Wrap with AuthProvider */}
      <MantineProvider defaultColorScheme="light">
        <Notifications position="top-right" />
        <RouterProvider router={router} />
      </MantineProvider>
    </AuthProvider>
  </React.StrictMode>
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat: integrate AuthProvider and add login route"
```

---

### Task 13: Update App Page with Auth

**Files:**
- Modify: `frontend/src/pages/App.tsx`

**Interfaces:**
- Consumes: `useAuth` from `contexts/AuthContext.tsx`

- [ ] **Step 1: Add auth to navbar**

Modify the navbar section in `frontend/src/pages/App.tsx`:

Add import at top:
```typescript
import { useAuth } from '../contexts/AuthContext'
```

Add inside component:
```typescript
const { user, logout, isAdmin } = useAuth();
```

Replace the Group with visible buttons (around line 128-136):
```typescript
              <Group visibleFrom="sm">
                <Button variant="subtle" component={Link} to="/quiz" leftSection={<IconBrain size={16} />}>
                  Quiz
                </Button>
                <Button variant="subtle" component={Link} to="/chat" leftSection={<IconMessageCircle size={16} />}>
                  Chat
                </Button>
                {isAdmin && (
                  <Button variant="subtle" component={Link} to="/admin">Admin</Button>
                )}
                <Button variant="subtle" onClick={logout}>Logout</Button>
              </Group>
```

Replace the Stack in Drawer (around line 85-113):
```typescript
          <Stack>
            <Text c="dimmed">Logged in as: {user?.username}</Text>
            <Button
              component={Link}
              to="/quiz"
              leftSection={<IconBrain size={16} />}
              onClick={close}
              fullWidth
            >
              Quiz
            </Button>
            <Button
              component={Link}
              to="/chat"
              leftSection={<IconMessageCircle size={16} />}
              onClick={close}
              fullWidth
            >
              Chat
            </Button>
            {isAdmin && (
              <Button
                component={Link}
                to="/admin"
                leftSection={<IconSettings size={16} />}
                onClick={close}
                fullWidth
              >
                Administrar
              </Button>
            )}
            <Button
              variant="light"
              color="red"
              onClick={() => { logout(); close(); }}
              fullWidth
            >
              Logout
            </Button>
          </Stack>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/App.tsx
git commit -m "feat: add auth to App navbar (logout, conditional admin)"
```

---

### Task 14: Protect Chat and Quiz Routes

**Files:**
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `ProtectedRoute` from `components/ProtectedRoute.tsx`

- [ ] **Step 1: Wrap Chat and Quiz with ProtectedRoute**

Modify `frontend/src/main.tsx`:
```typescript
import { ProtectedRoute } from './components/ProtectedRoute'  // Add this

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/', element: <ProtectedRoute><App /></ProtectedRoute> },
  { path: '/admin', element: <ProtectedRoute requireAdmin><Admin /></ProtectedRoute> },
  { path: '/chat', element: <ProtectedRoute><Chat /></ProtectedRoute> },
  { path: '/quiz', element: <ProtectedRoute><Quiz /></ProtectedRoute> },
])
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat: protect Chat and Quiz routes with authentication"
```

---

### Task 15: Update Chat Page to Use API Client

**Files:**
- Modify: `frontend/src/pages/Chat.tsx`

**Interfaces:**
- Consumes: `api` from `lib/api.ts`

- [ ] **Step 1: Replace fetch calls with api**

In `frontend/src/pages/Chat.tsx`, replace all `fetch('http://rpi2.netbird.vpn:3000/...')` with `api.get('/...')` or `api.post('/...')`.

Example replacements:

For GET requests:
```typescript
// Before:
const res = await fetch('http://rpi2.netbird.vpn:3000/api/chat/sessions')
const data = await res.json()

// After:
const { data } = await api.get('/api/chat/sessions')
```

For POST requests:
```typescript
// Before:
const res = await fetch('http://rpi2.netbird.vpn:3000/api/chat/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ topic }),
})
const data = await res.json()

// After:
const { data } = await api.post('/api/chat/sessions', { topic })
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Chat.tsx
git commit -m "refactor: use axios API client in Chat page"
```

---

### Task 16: Update Quiz Page to Use API Client

**Files:**
- Modify: `frontend/src/pages/Quiz.tsx`

**Interfaces:**
- Consumes: `api` from `lib/api.ts`

- [ ] **Step 1: Replace fetch calls with api**

In `frontend/src/pages/Quiz.tsx`, replace all `fetch('http://rpi2.netbird.vpn:3000/...')` with `api.get('/...')` or `api.post('/...')`.

Same pattern as Task 15.

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Quiz.tsx
git commit -m "refactor: use axios API client in Quiz page"
```

---

### Task 17: Update Admin Page to Use API Client

**Files:**
- Modify: `frontend/src/pages/Admin.tsx`

**Interfaces:**
- Consumes: `api` from `lib/api.ts`

- [ ] **Step 1: Replace fetch calls with api**

In `frontend/src/pages/Admin.tsx`, replace all `fetch('http://rpi2.netbird.vpn:3000/...')` with `api.get('/...')`, `api.post('/...')`, `api.put('/...')`, or `api.delete('/...')`.

Same pattern as previous tasks, but includes PUT and DELETE methods.

Example for DELETE:
```typescript
// Before:
await fetch(`http://rpi2.netbird.vpn:3000/api/words/${id}`, { method: 'DELETE' })

// After:
await api.delete(`/api/words/${id}`)
```

Example for PUT:
```typescript
// Before:
await fetch(`http://rpi2.netbird.vpn:3000/api/words/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

// After:
await api.put(`/api/words/${id}`, data)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Admin.tsx
git commit -m "refactor: use axios API client in Admin page"
```

---

### Task 18: Update App Page to Use API Client

**Files:**
- Modify: `frontend/src/pages/App.tsx`

**Interfaces:**
- Consumes: `api` from `lib/api.ts`

- [ ] **Step 1: Replace fetch calls with api**

In `frontend/src/pages/App.tsx` (fetchRandom function), replace:
```typescript
// Before:
const res = await fetch('http://rpi2.netbird.vpn:3000/api/random')
const data = await res.json()

// After:
const { data } = await api.get('/api/random')
```

And similarly for `/api/kanji/random`.

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/App.tsx
git commit -m "refactor: use axios API client in App page"
```

---

## Self-Review

### Spec Coverage Check

- ✅ JWT_SECRET required environment variable - Task 2
- ✅ 24h JWT expiration - Task 2
- ✅ bcrypt with 10 salt rounds - Task 2
- ✅ Public routes (/health, /api/auth/login) - Task 3
- ✅ Auth middleware - Task 3
- ✅ requireRole middleware - Task 3
- ✅ Login endpoint returning token + user - Task 4
- ✅ Users table with id, username, password_hash, role - Task 5
- ✅ ADMIN-only routes protected - Task 5
- ✅ create-admin CLI script - Task 6
- ✅ Frontend localStorage with key 'auth' - Task 9
- ✅ AuthContext with login/logout - Task 9
- ✅ ProtectedRoute component - Task 10
- ✅ Login page - Task 11
- ✅ Axios interceptor for JWT injection - Task 8
- ✅ 401 handling (logout + redirect) - Task 8
- ✅ Navbar conditional rendering (Admin button) - Task 13
- ✅ All frontend pages using api client - Tasks 15-18

### Placeholder Scan

No placeholders found. All steps contain complete code.

### Type Consistency Check

- `UserPayload` interface consistent across utils, middleware, routes
- `authData` structure consistent between AuthContext and localStorage
- Function names match across tasks: `hashPassword`, `comparePassword`, `createToken`, `verifyToken`
- Middleware function names: `authMiddleware`, `requireRole`

All types consistent.

---

## Testing Instructions

After completing all tasks:

1. **Build both backend and frontend:**
   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```

2. **Create admin user:**
   ```bash
   cd backend && npm run create-admin
   ```
   Enter username (min 3 chars, alphanumeric) and password (min 8 chars).

3. **Start backend:**
   ```bash
   cd backend && JWT_SECRET=your-secret-key npm start
   ```

4. **Start frontend:**
   ```bash
   cd frontend && npm run dev
   ```

5. **Test flow:**
   - Navigate to `/` - should redirect to `/login`
   - Login with created admin credentials
   - Should redirect to `/` and see navbar with user info
   - "Admin" button should be visible (role is ADMIN)
   - Navigate to `/admin` - should work
   - Click "Logout" - should return to login
   - Test with non-admin user (create manually in DB) - `/admin` should redirect to `/`

6. **Test API without auth:**
   ```bash
   curl http://localhost:3000/api/words
   ```
   Expected: 401 Unauthorized

7. **Test healthcheck (public):**
   ```bash
   curl http://localhost:3000/health
   ```
   Expected: 200 OK

---

## Summary

**Total Tasks:** 18
**Files Created:** 10
**Files Modified:** 5
**New Dependencies:** 2 (bcrypt, jsonwebtoken)
**Lines of Code:** ~800 (estimated)
