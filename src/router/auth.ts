import { Router } from 'express';
import { prisma } from '../config/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import {
  hashToken,
  refreshCookieMaxAgeMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../utils/tokens';
import { env } from '../config/env';
import { requireAuth } from '../middleware/requireAuth';

export const authRouter = Router();

function setAuthCookies(res: any, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: refreshCookieMaxAgeMs()
  });
}

function clearAuthCookies(res: any) {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE
  });
}

/**
 * POST /auth/register
 * 如果你想只給自己用，可以直接不要開這個 route，或加限制。
 */
authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash }
  });

  return res.status(201).json({
    id: user.id,
    email: user.email
  });
});

/**
 * POST /auth/login
 */
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  const refreshToken = signRefreshToken({ userId: user.id });

  const hashedRefreshToken = hashToken(refreshToken);
  const decoded = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashedRefreshToken,
      userId: user.id,
      expiresAt: new Date(decoded.exp * 1000)
    }
  });

  setAuthCookies(res, accessToken, refreshToken);

  return res.json({
    message: 'Logged in',
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * POST /auth/refresh
 */
authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  try {
    const payload = verifyRefreshToken(token);
    const tokenHash = hashToken(token);

    const dbToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: { user: true }
    });

    if (!dbToken) {
      return res.status(401).json({ message: 'Refresh token not valid' });
    }

    const accessToken = signAccessToken({
      userId: dbToken.user.id,
      email: dbToken.user.email,
      role: dbToken.user.role
    });

    setAuthCookies(res, accessToken, token);

    return res.json({ message: 'Token refreshed' });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

/**
 * POST /auth/logout
 */
authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    const tokenHash = hashToken(token);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  clearAuthCookies(res);
  return res.json({ message: 'Logged out' });
});

/**
 * GET /auth/me
 */
authRouter.get('/me', requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, createdAt: true }
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user });
});