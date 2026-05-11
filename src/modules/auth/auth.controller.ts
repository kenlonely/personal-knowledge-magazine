import { Request, Response } from 'express'
import { REFRESH_COOKIE_NAME } from '../../config/cookie'
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../../utils/cookies'
import { getRequestMeta } from '../../utils/requestMeta'
import {
  getCurrentUser,
  loginUser,
  logoutAllUserSessions,
  logoutUser,
  refreshUserSession,
  registerUser
} from './auth.service'

export async function register(req: Request, res: Response) {
  const result = await registerUser(req.body)

  res.status(201).json({
    message: 'Registered successfully',
    user: result.user
  })
}

export async function login(req: Request, res: Response) {
  const meta = getRequestMeta(req)
  const result = await loginUser(req.body, meta)

  setRefreshTokenCookie(res, result.refreshToken)

  res.json({
    message: 'Login successful',
    accessToken: result.accessToken,
    user: result.user
  })
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]

  const result = await refreshUserSession(refreshToken)

  setRefreshTokenCookie(res, result.refreshToken)

  res.json({
    message: 'Token refreshed',
    accessToken: result.accessToken,
    user: result.user
  })
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]

  await logoutUser(refreshToken)
  clearRefreshTokenCookie(res)

  res.json({
    message: 'Logged out successfully'
  })
}

export async function logoutAll(req: Request, res: Response) {
  await logoutAllUserSessions(req.auth!.userId)
  clearRefreshTokenCookie(res)

  res.json({
    message: 'Logged out from all devices'
  })
}

export async function me(req: Request, res: Response) {
  const user = await getCurrentUser(req.auth!.userId)

  res.json({
    user
  })
}