# API 文档

## 认证

### 注册

```typescript
// 使用 Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
})
```

### 登录

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})
```

### 登出

```typescript
const { error } = await supabase.auth.signOut()
```

### 获取当前用户

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

## 待办事项

### 创建待办

```typescript
const { data, error } = await supabase
  .from('todos')
  .insert({
    user_id: user.id,
    title: '学习 Taro',
    content: '学习 Taro 框架',
    priority: 2,
    category: '学习',
    due_date: '2024-12-31'
  })
  .select()
```

### 获取待办列表

```typescript
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
```

### 更新待办

```typescript
const { data, error } = await supabase
  .from('todos')
  .update({
    title: '更新后的标题',
    completed: true
  })
  .eq('id', todoId)
  .select()
```

### 删除待办

```typescript
const { error } = await supabase
  .from('todos')
  .delete()
  .eq('id', todoId)
```

### 切换完成状态

```typescript
const { data, error } = await supabase
  .from('todos')
  .update({ completed: !completed })
  .eq('id', todoId)
  .select()
```