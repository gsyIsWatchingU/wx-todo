# 微信小程序 Todo List

一个基于 Taro + React + TypeScript + Supabase 开发的微信小程序 Todo List 应用。

## 功能特性

- [ ] 用户登录注册
- [ ] 待办事项 CRUD
- [ ] 待办事项分类
- [ ] 待办事项优先级
- [ ] 完成任务统计

## 技术栈

详见 [TECH_STACK.md](./TECH_STACK.md)

## 项目结构

详见 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`，并填入 Supabase 配置：

```bash
cp .env.example .env
```

在 `.env` 中配置：
```
TARO_APP_SUPABASE_URL=your_supabase_url
TARO_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 开发模式

```bash
# 监听模式开发微信小程序
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 使用微信开发者工具预览

1. 微信开发者工具导入项目根目录
2. 点击预览即可

## 数据库

详见 [DATABASE.md](./DATABASE.md)

## API

详见 [API.md](./API.md)

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 待办事项

详见 [TODO.md](./TODO.md)