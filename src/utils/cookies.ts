import { Response } from 'express'
import { REFRESH_COOKIE_NAME, getRefreshCookieOptions } from '../config/cookie'

export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions())
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getRefreshCookieOptions(),
    maxAge: undefined
  })
}