import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const SALT_ROUNDS = 10;
const JWT_EXPIRATION = '24h';
// Leemos el secreto de forma perezosa (en cada uso) para no depender del orden
// de evaluación de módulos ESM: dotenv se carga en src/env.ts, que se importa
// como primer módulo de index.ts.
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
}
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function createToken(user) {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, getSecret(), { expiresIn: JWT_EXPIRATION });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, getSecret());
    }
    catch {
        return null;
    }
}
