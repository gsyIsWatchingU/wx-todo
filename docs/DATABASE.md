# 数据库设计

## Supabase 表结构

### users 表

用户信息表，Supabase Auth 会自动管理。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 用户 ID (主键) |
| email | text | 用户邮箱 |
| created_at | timestamp | 创建时间 |

### todos 表

待办事项表。

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | uuid | 任务 ID | 主键 |
| user_id | uuid | 用户 ID | 外键，关联 users |
| title | text | 任务标题 | 必填 |
| content | text | 任务内容 | 可选 |
| completed | boolean | 是否完成 | 默认 false |
| priority | integer | 优先级 | 1=低, 2=中, 3=高 |
| category | text | 分类 | 可选 |
| due_date | date | 截止日期 | 可选 |
| created_at | timestamp | 创建时间 | |
| updated_at | timestamp | 更新时间 | |

## RLS 策略

启用 Row Level Security，确保用户只能访问自己的数据：

- `todos` 表：所有操作需要认证，且只能操作 own 记录

## 示例 SQL

```sql
-- 创建 todos 表
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 2,
  category TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can manage own todos" ON public.todos
  FOR ALL
  USING (auth.uid() = user_id);

-- login_logs 表：记录用户登录日志
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  openid TEXT NOT NULL,
  unionid TEXT,
  nick_name TEXT,
  avatar_url TEXT,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  login_source TEXT DEFAULT 'wechat_miniapp',
  app_version TEXT,
  device_info TEXT,
  ip_address TEXT
);

CREATE INDEX idx_login_logs_openid ON public.login_logs(openid);
CREATE INDEX idx_login_logs_login_at ON public.login_logs(login_at DESC);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- 允许任何人插入登录日志
CREATE POLICY "Anyone can insert login logs" ON public.login_logs
  FOR INSERT WITH CHECK (true);
```