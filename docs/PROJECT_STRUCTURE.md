# 项目结构

```
wx-todo/
├── config/                 # Taro 配置文件
│   └── index.ts            # 构建配置
├── src/                    # 源代码目录
│   ├── pages/              # 页面组件
│   │   └── index/          # 首页
│   │       ├── index.tsx   # 首页逻辑
│   │       └── index.scss  # 首页样式
│   ├── components/         # 公共组件
│   ├── styles/             # 公共样式
│   │   ├── variables.scss  # 样式变量
│   │   └── common.scss     # 通用样式
│   ├── utils/              # 工具函数
│   ├── services/           # API 服务
│   │   └── supabase.ts     # Supabase 客户端
│   ├── types/              # 类型定义
│   ├── app.tsx             # 应用入口
│   ├── app.scss            # 应用全局样式
│   └── app.config.ts       # 应用配置
├── docs/                   # 项目文档
│   ├── README.md           # 项目说明
│   ├── TECH_STACK.md      # 技术栈
│   ├── PROJECT_STRUCTURE.md # 项目结构
│   ├── DATABASE.md        # 数据库设计
│   ├── API.md             # API 文档
│   ├── CHANGELOG.md       # 更新日志
│   └── TODO.md            # 待办事项
├── .env.example            # 环境变量示例
├── tsconfig.json           # TypeScript 配置
├── package.json            # 项目依赖
└── README.md               # 项目入口文档
```

## 目录说明

### `src/pages/`

存放页面组件，每个页面一个文件夹，包含 `.tsx` 和 `.scss` 文件。

### `src/components/`

存放可复用的公共组件。

### `src/styles/`

存放全局样式文件：
- `variables.scss` - 样式变量定义
- `common.scss` - 通用样式类

### `src/utils/`

存放工具函数和帮助类。

### `src/services/`

存放 API 服务层代码，如 Supabase 客户端配置。

### `src/types/`

存放 TypeScript 类型定义文件。

### `docs/`

存放项目相关文档。