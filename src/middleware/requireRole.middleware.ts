import { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/appError'

export function requireRole(...roles: Array<'USER' | 'ADMIN'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError('Unauthorized', 401))
    }

    if (!roles.includes(req.auth.role)) {
      return next(new AppError('Forbidden', 403))
    }

    next()
  }
}