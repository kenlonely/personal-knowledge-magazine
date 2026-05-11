import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export type AccessTokenPayload = {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: { userId: string }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_EXPIRES_DAYS}d`
  });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; iat: number; exp: number };
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshCookieMaxAgeMs() {
  return env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
}