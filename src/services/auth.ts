import Taro from '@tarojs/taro'
import { invokeEdgeFunction } from './supabaseRequest'

const AUTH_USER_KEY = 'auth_user'

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

export function getWechatCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
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

function isSessionExpired(user: AuthUser) {
  return !user.sessionExpiresAt || Number.isNaN(Date.parse(user.sessionExpiresAt)) || Date.parse(user.sessionExpiresAt) <= Date.now()
}

export function getCurrentUser(): AuthUser | null {
  try {
    const value = Taro.getStorageSync(AUTH_USER_KEY)
    if (value && typeof value === 'object') {
      const user = value as AuthUser
      if (user.id && user.sessionToken && !isSessionExpired(user)) {
        return user
      }
      clearSession()
    }
  } catch (error) {
    console.warn('Failed to read auth user:', error)
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

export function saveSession(user: AuthUser): void {
  Taro.setStorageSync(AUTH_USER_KEY, user)
}

export function clearSession(): void {
  Taro.removeStorageSync(AUTH_USER_KEY)
}

export async function loginWithWechat(code: string, profile: { nickName: string; avatarUrl: string }): Promise<AuthUser> {
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
