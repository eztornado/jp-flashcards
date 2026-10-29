import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_EXPIRATION = '24h';

// Leemos el secreto de forma perezosa (en cada uso) para no depender del orden
// de evaluación de módulos ESM: dotenv se carga en src/env.ts, que se importa
// como primer módulo de index.ts.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
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
    getSecret(),
    { expiresIn: JWT_EXPIRATION }
  );
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, getSecret()) as UserPayload;
  } catch {
    return null;
  }
}
