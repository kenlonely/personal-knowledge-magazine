import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../../utils/asyncHandler'
import { requireAuth } from '../../middleware/auth.middleware'
import { validateBody } from '../../middleware/validate.middleware'
import { login, logout, logoutAll, me, refresh, register } from './auth.controller'
import { loginSchema, registerSchema } from './auth.schema'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests, please try again later'
  }
})

router.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(register))
router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(login))
router.post('/refresh', authLimiter, asyncHandler(refresh))
router.post('/logout', asyncHandler(logout))
router.post('/logout-all', requireAuth, asyncHandler(logoutAll))
router.get('/me', requireAuth, asyncHandler(me))

export default router