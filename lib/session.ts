import { SessionOptions } from 'iron-session'

export interface SessionData {
  isLoggedIn: boolean
  username?: string
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'default_secret_key_harus_diganti_min_32_chars!!',
  cookieName: 'telegram-panel-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}
