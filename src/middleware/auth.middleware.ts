import { NextFunction, Request, Response } from 'express'
import { prisma } from '../prisma/client'
import { AppError } from '../utils/appError'
import { verifyAccessToken } from '../utils/jwt'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string
        email: string
        role: 'USER' | 'ADMIN'
      }
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401))
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        deletedAt: true
      }
    })

    if (!user || user.deletedAt) {
      return next(new AppError('Unauthorized', 401))
    }

    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      return next(new AppError('Account is not active', 403))
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      role: user.role
    }

    next()
  } catch {
    next(new AppError('Invalid or expired token', 401))
  }
}