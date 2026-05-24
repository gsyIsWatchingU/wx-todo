# wx-todo

一个面向微信小程序场景的 Todo 应用，使用 `Taro + React + TypeScript + Supabase` 构建，支持微信登录、任务管理和多视图浏览，适合作为小程序待办项目模板或学习示例。

## 项目亮点

- 微信小程序端实现，基于 `Taro 4` 开发
- 支持微信头像、昵称授权登录
- 支持任务新增、编辑、删除、完成切换
- 支持 `日 / 周 / 月 / 清单` 四种任务视图
- 支持任务优先级、截止日期、截止时间、清单分类
- 使用 `Supabase Edge Functions` 作为业务接口层
- 接口异常时支持本地存储兜底，保证基础可用性

## 功能概览

### 1. 登录与用户体系

- 通过微信小程序 `wx.login` 获取登录凭证
- 调用 `wechat-login` Edge Function 换取业务会话
- 会话信息保存在本地，用于后续接口鉴权

### 2. 任务管理

- 创建任务
- 编辑任务标题、备注、优先级、日期和时间
- 删除任务
- 标记任务完成 / 未完成

### 3. 多视图浏览

- `Day View`：查看某一天任务，今日视图可包含未设置日期的任务
- `Week View`：按周聚合查看任务
- `Month View`：按月查看任务分布
- `List View`：按清单分类查看任务

### 4. 清单管理

- 拉取当前用户的任务清单
- 创建新清单
- 按清单过滤任务

### 5. 容错与降级

- 当 `Supabase Edge Functions` 超时、返回 5xx 或临时不可用时
- 任务和清单数据会回退到本地存储，提升开发和演示时的稳定性

## 技术栈

### 前端

- `Taro 4`
- `React 18`
- `TypeScript 5`
- `Sass`
- `NutUI React Taro`

### 后端与云能力

- `Supabase`
- `Supabase Edge Functions`
- `PostgreSQL`

### 工程工具

- `Taro CLI`
- `Webpack 5`
- `Babel`

## 项目结构

```text
wx-todo/
|-- config/                      # Taro 构建配置
|-- docs/                        # 设计、数据库、接口等补充文档
|-- scripts/                     # 辅助脚本
|-- src/
|   |-- components/              # 通用组件
|   |-- pages/
|   |   |-- auth/                # 登录页
|   |   |-- today/               # 任务主页面（日/周/月/清单视图）
|   |   |-- task-edit/           # 任务新增/编辑页
|   |   |-- index/               # 示例首页/早期页面
|   |-- services/                # 接口请求、鉴权、任务服务
|   |-- styles/                  # 全局样式与变量
|   |-- types/                   # 类型定义
|   |-- utils/                   # 日期等工具函数
|   |-- app.config.ts            # 小程序页面配置
|   |-- app.tsx                  # 应用入口
|-- supabase/
|   |-- functions/
|   |   |-- wechat-login/        # 微信登录函数
|   |   |-- app-api/             # 任务/清单业务接口
|   |-- migrations/              # 数据库迁移脚本
|-- .env.example                 # 环境变量示例
|-- package.json                 # 项目脚本与依赖
```

## 核心页面与模块

- `src/pages/auth`
  负责微信头像昵称授权、登录态建立和跳转
- `src/pages/today`
  项目主页面，承载日历视图切换、任务展示、快捷新增
- `src/pages/task-edit`
  负责任务新增、编辑、删除
- `src/services/auth.ts`
  管理微信登录、会话保存、登录状态校验
- `src/services/tasks.ts`
  管理任务和清单请求，并包含本地兜底逻辑
- `supabase/functions/wechat-login`
  负责微信登录态换取与用户会话创建
- `supabase/functions/app-api`
  负责任务与清单相关的服务端接口

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

`.env.example` 中的核心变量如下：

```env
TARO_APP_SUPABASE_URL=https://your-project.supabase.co
TARO_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 启动小程序开发

```bash
npm run dev
```

该命令会以微信小程序目标启动 `Taro` 的监听构建。

### 4. 构建生产包

```bash
npm run build
```

### 5. 在微信开发者工具中调试

- 打开微信开发者工具
- 导入项目
- 选择编译输出目录进行预览与调试

## Supabase 配置说明

项目依赖 `Supabase` 提供数据库和 Edge Functions 能力。开源使用前，建议至少完成以下准备：

### 1. 创建 Supabase 项目

准备以下信息：

- `Project URL`
- `anon public key`
- `service_role secret key`

### 2. 执行数据库迁移

优先关注以下迁移文件：

- `supabase/migrations/001_create_tasks_lists.sql`
- `supabase/migrations/002_repair_tasks_lists_schema.sql`
- `supabase/migrations/003_secure_user_isolation.sql`
- `supabase/migrations/004_relax_legacy_user_key_constraints.sql`

### 3. 配置 Edge Functions Secrets

需要在 Supabase 中配置：

```env
SERVICE_ROLE_KEY=your-service-role-key
WECHAT_APP_ID=your-wechat-miniapp-appid
WECHAT_APP_SECRET=your-wechat-miniapp-secret
```

### 4. 部署 Edge Functions

项目包含两个函数：

- `wechat-login`
- `app-api`

可执行：

```bash
npm run deploy:functions
```

更完整的部署说明见 [docs/DEPLOY_SUPABASE_EDGE_FUNCTIONS.md](./docs/DEPLOY_SUPABASE_EDGE_FUNCTIONS.md)。

## 开发脚本

```bash
npm run dev               # 小程序开发模式
npm run build             # 小程序构建
npm run deploy:functions  # 部署 Supabase Edge Functions
```

## 适合谁使用

- 想学习 `Taro + React` 开发微信小程序的开发者
- 想快速搭建一个带后端能力的 Todo 项目的开发者
- 想参考微信登录和 `Supabase Edge Functions` 接入方式的开发者

## 已知前提

- 项目当前定位为微信小程序端应用，不是通用 Web Todo
- 微信登录能力依赖真实小程序环境与对应的 `AppID / AppSecret`
- 若未完成 Supabase 与微信配置，可先作为前端结构和小程序项目模板阅读

## 文档导航

- [docs/README.md](./docs/README.md)：文档总览
- [docs/TECH_STACK.md](./docs/TECH_STACK.md)：技术栈说明
- [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)：项目结构说明
- [docs/DATABASE.md](./docs/DATABASE.md)：数据库设计
- [docs/API.md](./docs/API.md)：接口说明
- [docs/DEPLOY_SUPABASE_EDGE_FUNCTIONS.md](./docs/DEPLOY_SUPABASE_EDGE_FUNCTIONS.md)：函数部署说明
- [docs/CHANGELOG.md](./docs/CHANGELOG.md)：变更记录
- [docs/TODO.md](./docs/TODO.md)：后续规划

## License

`MIT`
