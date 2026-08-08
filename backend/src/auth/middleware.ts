import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserPayload } from './utils.js';

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
