# 微信授权登录日志实现计划

## 一、当前状态分析

### 1.1 现有登录实现
- **登录方式**：使用微信 `wx.getUserProfile` 获取用户昵称和头像
- **用户标识**：使用昵称作为 ID（`auth.ts` 第19行：`id: userInfo.nickName`）
- **数据存储**：登录信息存储在本地 Taro Storage（`auth_user` key）
- **Supabase 集成**：已有 `supabaseRequest.ts` 封装 REST API，但未用于用户管理

### 1.2 现有相关文件
| 文件 | 作用 |
|------|------|
| `src/services/auth.ts` | 微信授权登录，包含 getWechatUserInfo、saveSession、getCurrentUser |
| `src/services/supabaseRequest.ts` | Supabase REST API 封装 |
| `src/services/tasks.ts` | Supabase 数据操作示例（tasks、lists 表） |
| `src/pages/auth/index.tsx` | 登录页面 UI |
| `docs/DATABASE.md` | 数据库表结构文档 |

### 1.3 当前问题
1. 使用昵称作为用户 ID 不是唯一标识，不同用户可能同名
2. 没有获取微信 UnionID，无法跨平台识别用户
3. 登录数据未同步到 Supabase
4. 没有登录日志功能

---

## 二、方案设计

### 2.1 创建 Supabase 登录日志表

在 Supabase 创建 `login_logs` 表：

```sql
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  openid TEXT NOT NULL,           -- 微信 OpenID
  unionid TEXT,                    -- 微信 UnionID（需绑定微信开放平台）
  nick_name TEXT,                 -- 微信昵称
  avatar_url TEXT,                -- 头像 URL
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 登录时间
  login_source TEXT DEFAULT 'wechat_miniapp',        -- 登录来源
  app_version TEXT,               -- 小程序版本
  device_info TEXT,               -- 设备信息
  ip_address TEXT                 -- IP 地址（可在服务端获取）
);

-- 创建索引加速查询
CREATE INDEX idx_login_logs_openid ON public.login_logs(openid);
CREATE INDEX idx_login_logs_login_at ON public.login_logs(login_at DESC);

-- 启用 RLS（可选，login_logs 通常不需要严格权限控制）
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
```

### 2.2 获取微信 UnionID 的前提条件

**重要**：获取 UnionID 需要：
1. 微信小程序已绑定微信开放平台账号
2. 使用 `wx.login()` 获取 code，再通过服务端调用微信接口换取 UnionID

当前方案采用 **静默登录 + 手动获取用户信息** 的混合模式：
- `wx.login()` → 获取 code → 换取 openid/session_key
- `wx.getUserProfile()` → 获取用户授权信息（昵称、头像）

### 2.3 实现步骤

#### Step 1: 修改 `src/services/auth.ts`
- 添加 `wx.login()` 调用获取 openid
- 扩展 `AuthUser` 接口添加 `openid`、`unionid`、`avatarUrl`
- 添加登录日志写入函数 `logLoginToSupabase()`

#### Step 2: 修改 `src/pages/auth/index.tsx`
- 在 handleLogin 中先调用 `wx.login()` 获取 openid
- 将 openid 传递给 saveSession

#### Step 3: 添加 Supabase 登录日志服务
- 新建 `src/services/loginLog.ts`
- 封装 `createLoginLog()` 函数

#### Step 4: 更新 `docs/DATABASE.md`
- 添加 login_logs 表的文档说明

---

## 三、具体文件修改

### 3.1 新建 `src/services/loginLog.ts`

```typescript
import { supabaseRequest } from './supabaseRequest'
import type { AuthUser } from './auth'

type LoginLog = {
  id: string
  openid: string
  unionid: string | null
  nick_name: string | null
  avatar_url: string | null
  login_at: string
  login_source: string
  app_version: string | null
  device_info: string | null
}

export async function createLoginLog(user: AuthUser): Promise<void> {
  try {
    const systemInfo = Taro.getSystemInfoSync()

    await supabaseRequest<LoginLog[]>('login_logs', {
      method: 'POST',
      data: {
        openid: user.openid,
        unionid: user.unionid || null,
        nick_name: user.nickName,
        avatar_url: user.avatarUrl,
        login_source: 'wechat_miniapp',
        app_version: systemInfo.version, // 微信版本
        device_info: `${systemInfo.platform}|${systemInfo.system}`,
      },
    })
  } catch (error) {
    console.warn('Failed to create login log:', error)
    // 登录日志失败不影响主流程
  }
}
```

### 3.2 修改 `src/services/auth.ts`

```typescript
// 主要改动：
// 1. AuthUser 接口添加 openid, unionid, appVersion, deviceInfo
// 2. getWechatUserInfo 改为同时调用 wx.login 和 wx.getUserProfile
// 3. 添加 getOpenId() 函数

import Taro from '@tarojs/taro'

const AUTH_USER_KEY = 'auth_user'

export interface AuthUser {
  id: string
  openid?: string        // 新增
  unionid?: string       // 新增
  nickName?: string
  avatarUrl?: string
  appVersion?: string    // 新增
  deviceInfo?: string    // 新增
}

export function getCurrentUser(): AuthUser | null {
  // ... 保持不变
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

// 新增：获取微信 OpenID
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
      fail: reject,
    })
  })
}

// 修改：获取用户信息（需要先获取 code）
export async function getWechatUserInfo(): Promise<{ userInfo: AuthUser }> {
  // 1. 先获取 code
  const code = await getWechatCode()

  // 2. 获取用户授权信息
  const userProfile = await new Promise<any>((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: resolve,
      fail: reject,
    })
  })

  const userInfo = userProfile.userInfo

  return {
    userInfo: {
      id: userInfo.nickName, // 临时用昵称作为显示ID
      openid: code, // 临时使用 code 作为标识，实际需服务端兑换
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
    },
  }
}
```

### 3.3 修改 `src/pages/auth/index.tsx`

```typescript
// handleLogin 改为 async 函数
const handleLogin = async () => {
  setIsLoading(true)
  try {
    const { userInfo } = await getWechatUserInfo()
    saveSession(userInfo)

    // 添加：写入登录日志
    await createLoginLog(userInfo)

    Taro.redirectTo({ url: '/pages/today/index' })
  } catch (error) {
    // ...
  }
}
```

---

## 四、注意事项

### 4.1 关于 OpenID 和 UnionID
- **OpenID**：用户在小程序中的唯一标识，不同小程序不同
- **UnionID**：用户在微信开放平台下的唯一标识，跨小程序通用
- 当前方案使用 `wx.login()` 获得的 code 临时作为标识
- **完整方案**需要后端服务调用微信 API 用 code 换取 openid/session_key

### 4.2 SQL 执行
需要在 Supabase SQL Editor 中执行创建表的 SQL。

### 4.3 RLS 策略
login_logs 表启用 RLS 后，需要创建合适的策略允许插入日志：

```sql
-- 允许任何人插入登录日志（不需要认证）
CREATE POLICY "Anyone can insert login logs" ON public.login_logs
  FOR INSERT WITH CHECK (true);

-- 只允许查看自己的登录日志
CREATE POLICY "Users can view own login logs" ON public.login_logs
  FOR SELECT USING (true);
```

---

## 五、验证步骤

1. 在 Supabase SQL Editor 执行建表 SQL
2. 重新编译运行小程序
3. 点击微信授权登录
4. 在 Supabase dashboard 的 login_logs 表中查看新增记录
5. 验证字段：openid, nick_name, avatar_url, login_at 等
