import Taro from '@tarojs/taro'

const AUTH_USER_KEY = 'auth_user'

export interface AuthUser {
  id: string
  nickName?: string
  avatarUrl?: string
}

export function getWechatUserInfo(): Promise<{ userInfo: AuthUser }> {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        resolve({
          userInfo: {
            id: userInfo.nickName, // 使用昵称作为简单ID，实际应使用 UnionID
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
          },
        })
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '获取用户信息失败'))
      },
    })
  })
}

export function getCurrentUser(): AuthUser | null {
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

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null
}

export function saveSession(user: AuthUser): void {
  Taro.setStorageSync(AUTH_USER_KEY, user)
}

export function clearSession(): void {
  Taro.removeStorageSync(AUTH_USER_KEY)
}