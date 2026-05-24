# 文档总览

这里汇总 `wx-todo` 项目的说明文档，方便从当前能力、技术结构和后续规划几个角度快速了解项目。

## 当前能力概览

- 基于 `Taro + React + TypeScript + Supabase` 构建的微信小程序 Todo 应用
- 支持微信登录与业务会话建立
- 支持任务新增、编辑、删除、完成状态切换
- 支持任务优先级、截止日期、截止时间、备注等基础信息
- 支持 `日 / 周 / 月 / 清单` 四种任务视图
- 支持清单创建与按清单筛选任务
- 支持 `Supabase Edge Functions` 作为业务接口层
- 支持接口异常时的本地存储兜底

## 文档导航

- [TECH_STACK.md](./TECH_STACK.md)：技术栈说明
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)：项目结构说明
- [DATABASE.md](./DATABASE.md)：数据库设计
- [API.md](./API.md)：接口说明
- [DEPLOY_SUPABASE_EDGE_FUNCTIONS.md](./DEPLOY_SUPABASE_EDGE_FUNCTIONS.md)：Supabase Edge Functions 部署说明
- [CHANGELOG.md](./CHANGELOG.md)：变更记录
- [TODO.md](./TODO.md)：产品路线图与后续规划

## 使用建议

- 如果想快速了解项目现状，优先阅读主 [README.md](../README.md)
- 如果想继续开发或扩展功能，优先阅读 [TODO.md](./TODO.md) 与 [DATABASE.md](./DATABASE.md)
- 如果想部署后端能力，重点查看 [DEPLOY_SUPABASE_EDGE_FUNCTIONS.md](./DEPLOY_SUPABASE_EDGE_FUNCTIONS.md)
