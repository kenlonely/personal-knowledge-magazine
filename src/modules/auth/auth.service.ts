import { User } from '@prisma/client'
import { addDays } from './date.helper'
import { prisma } from '../../prisma/client'
import { AppError } from '../../utils/appError'
import { comparePassword, hashPassword } from '../../utils/hashing'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../../utils/jwt'
import { sha256 } from '../../utils/tokens'

type RequestMeta = {
  ipAddress: string | null
  userAgent: string | null
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt
  }
}

export async function registerUser(input: {
  username: string
  email: string
  password: string
}) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }]
    }
  })

  if (existing) {
    throw new AppError('Email or username already in use', 409)
  }

  const passwordHash = await hashPassword(input.password)

  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash,
      status: 'ACTIVE'
    }
  })

  return {
    user: sanitizeUser(user)
  }
}

export async function loginUser(
  input: { email: string; password: string },
  meta: RequestMeta
) {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  })

  if (!user || user.deletedAt) {
    throw new AppError('Invalid credentials', 401)
  }

  if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
    throw new AppError('Account is not active', 403)
  }

  const matched = await comparePassword(input.password, user.passwordHash)

  if (!matched) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: {
          increment: 1
        }
      }
    })

    throw new AppError('Invalid credentials', 401)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lastLoginAt: new Date(),
      lastLoginIp: meta.ipAddress || undefined
    }
  })

  const sessionExpiresAt = addDays(new Date(), 30)

  const provisionalSession = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: 'pending',
      ipAddress: meta.ipAddress || undefined,
      userAgent: meta.userAgent || undefined,
      expiresAt: sessionExpiresAt
    }
  })

  const refreshToken = signRefreshToken({
    sub: user.id,
    sessionId: provisionalSession.id
  })

  const refreshTokenHash = sha256(refreshToken)

  await prisma.session.update({
    where: { id: provisionalSession.id },
    data: { refreshTokenHash }
  })

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role
  })

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user)
  }
}

export async function refreshUserSession(refreshToken: string) {
  let payload: { sub: string; sessionId: string }

  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new AppError('Invalid refresh token', 401)
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true }
  })

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError('Session expired or revoked', 401)
  }

  const incomingHash = sha256(refreshToken)

  if (session.refreshTokenHash !== incomingHash) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    })

    throw new AppError('Refresh token reuse detected', 401)
  }

  if (session.user.deletedAt) {
    throw new AppError('Unauthorized', 401)
  }

  if (session.user.status === 'SUSPENDED' || session.user.status === 'DISABLED') {
    throw new AppError('Account is not active', 403)
  }

  const nextRefreshToken = signRefreshToken({
    sub: session.user.id,
    sessionId: session.id
  })

  const nextRefreshHash = sha256(nextRefreshToken)

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: nextRefreshHash,
      expiresAt: addDays(new Date(), 30)
    }
  })

  const accessToken = signAccessToken({
    sub: session.user.id,
    email: session.user.email,
    role: session.user.role
  })

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    user: sanitizeUser(session.user)
  }
}

export async function logoutUser(refreshToken: string | undefined) {
  if (!refreshToken) return

  try {
    const payload = verifyRefreshToken(refreshToken)

    await prisma.session.updateMany({
      where: {
        id: payload.sessionId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    })
  } catch {
    return
  }
}

export async function logoutAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  })
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || user.deletedAt) {
    throw new AppError('User not found', 404)
  }

  return sanitizeUser(user)
}