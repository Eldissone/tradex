import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

// Hash falso para igualar o tempo de resposta quando o e-mail não existe
export const DUMMY_HASH = bcrypt.hashSync('tradex-dummy-password', BCRYPT_ROUNDS);

export function verifyPassword(plain, hash) {
  if (!hash || !hash.startsWith('$2')) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256' });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}

// Token de recuperação: o valor em claro vai para o utilizador, a BD guarda só o hash
export function createResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
