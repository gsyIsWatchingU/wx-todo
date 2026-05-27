# 部署到 Vercel

这个仓库部署到 Vercel 的是 `Taro H5` 网页版本，不是微信小程序运行时本体。

## 部署内容

- 前端：`dist` 目录中的 Taro H5 构建产物
- 后端：继续使用现有的 Supabase 项目和 Edge Functions

## 仓库一次性准备

1. 先确保本地已经安装 `@tarojs/plugin-platform-h5`
   - 执行 `npm install`
2. 提交本次和部署相关的改动，至少包括：
   - `package.json`
   - `vercel.json`
   - `config/index.ts`

## Vercel 项目配置

仓库已经内置 `vercel.json`，Vercel 导入后应自动识别以下配置：

- Install Command：`npm install`
- Build Command：`npm run build:h5`
- Output Directory：`dist`

## 必填环境变量

在 Vercel 项目设置的 `Environment Variables` 中配置：

- `TARO_APP_SUPABASE_URL`
- `TARO_APP_SUPABASE_ANON_KEY`

建议使用与你本地 `.env` 相同的值。

## 部署流程

1. 将仓库推送到 GitHub
2. 在 Vercel 中导入该 GitHub 仓库
3. 配置上面的两个环境变量
4. 触发首次部署

## 说明

- 微信小程序版本仍然需要通过微信开发者工具和小程序后台发布
- Supabase Edge Functions 继续部署在 Supabase，不迁移到 Vercel
- H5 预览模式在非微信环境下会自动使用本地预览会话
