import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { comparePassword, createToken, UserPayload } from './utils.js';

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
