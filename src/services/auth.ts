import Taro from '@tarojs/taro'
import { invokeEdgeFunction } from './supabaseRequest'

const AUTH_USER_KEY = 'auth_user'
const PREVIEW_SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30

type LoginResponse = {
  sessionToken: string
  sessionExpiresAt: string
  user: {
    id: string
    openid: string
    unionid?: string | null
    nickName?: string | null
    avatarUrl?: string | null
    claimStatus?: 'claimed_legacy' | 'new_user' | 'existing_user' | 'legacy_conflict'
  }
}

export interface AuthUser {
  id: string
  sessionToken: string
  sessionExpiresAt: string
  openid: string
  unionid?: string
  nickName?: string
  avatarUrl?: string
  claimStatus?: 'claimed_legacy' | 'new_user' | 'existing_user' | 'legacy_conflict'
}

type PreviewProfile = {
  nickName?: string
  avatarUrl?: string
}

function getWechatApi() {
  return (globalThis as typeof globalThis & {
    wx?: {
      login?: (options: {
        success?: (res: { code?: string }) => void
        fail?: (err: { errMsg?: string }) => void
      }) => void
    }
  }).wx
}

export function isWechatLoginSupported() {
  return Taro.getEnv() === Taro.ENV_TYPE.WEAPP && typeof getWechatApi()?.login === 'function'
}

export function isPreviewAuthMode() {
  return !isWechatLoginSupported()
}

function isSessionExpired(user: AuthUser) {
  return !user.sessionExpiresAt || Number.isNaN(Date.parse(user.sessionExpiresAt)) || Date.parse(user.sessionExpiresAt) <= Date.now()
}

function buildPreviewUser(profile: PreviewProfile = {}): AuthUser {
  const now = Date.now()
  return {
    id: 'h5-preview-user',
    sessionToken: 'h5-preview-session',
    sessionExpiresAt: new Date(now + PREVIEW_SESSION_DURATION_MS).toISOString(),
    openid: 'h5-preview-openid',
    unionid: 'h5-preview-unionid',
    nickName: profile.nickName || 'Desktop Preview',
    avatarUrl: profile.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=wx-todo-preview',
    claimStatus: 'existing_user',
  }
}

export function saveSession(user: AuthUser): void {
  Taro.setStorageSync(AUTH_USER_KEY, user)
}

export function clearSession(): void {
  Taro.removeStorageSync(AUTH_USER_KEY)
}

export function ensurePreviewSession(profile: PreviewProfile = {}): AuthUser {
  const existing = readStoredUser()
  if (existing && !isSessionExpired(existing)) {
    return existing
  }

  const previewUser = buildPreviewUser(profile)
  saveSession(previewUser)
  return previewUser
}

function readStoredUser(): AuthUser | null {
  try {
    const value = Taro.getStorageSync(AUTH_USER_KEY)
    if (value && typeof value === 'object') {
      return value as AuthUser
    }
  } catch (error) {
    console.warn('Failed to read auth user:', error)
  }
  return null
}

export function getWechatCode(): Promise<string> {
  if (!isWechatLoginSupported()) {
    return Promise.resolve('h5-preview-code')
  }

  return new Promise((resolve, reject) => {
    const wechatApi = getWechatApi()
    wechatApi?.login?.({
      success: (res) => {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error('Failed to get code'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || 'Failed to get wechat code'))
      },
    })
  })
}

export function getCurrentUser(): AuthUser | null {
  const user = readStoredUser()
  if (user) {
    if (!isSessionExpired(user)) {
      return user
    }
    clearSession()
  }

  if (isPreviewAuthMode()) {
    return ensurePreviewSession()
  }

  return null
}

export function requireCurrentUser(): AuthUser {
  const user = getCurrentUser()
  if (!user) {
    throw new Error('User session is invalid or expired')
  }
  return user
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null
}

export async function loginWithWechat(code: string, profile: { nickName: string; avatarUrl: string }): Promise<AuthUser> {
  if (!isWechatLoginSupported()) {
    return ensurePreviewSession(profile)
  }

  const response = await invokeEdgeFunction<LoginResponse>('wechat-login', {
    code,
    nickName: profile.nickName,
    avatarUrl: profile.avatarUrl,
  })

  const user: AuthUser = {
    id: response.user.id,
    sessionToken: response.sessionToken,
    sessionExpiresAt: response.sessionExpiresAt,
    openid: response.user.openid,
    unionid: response.user.unionid || undefined,
    nickName: response.user.nickName || profile.nickName,
    avatarUrl: response.user.avatarUrl || profile.avatarUrl,
    claimStatus: response.user.claimStatus,
  }

  saveSession(user)
  return user
}
