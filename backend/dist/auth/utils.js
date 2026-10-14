import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '24h';
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const SECRET = JWT_SECRET;
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function createToken(user) {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: JWT_EXPIRATION });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET);
    }
    catch {
        return null;
    }
}
