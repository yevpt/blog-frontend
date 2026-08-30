# apps/web —— 博客前台

Next.js 16（App Router）实现的博客前台，默认 Server Components，SSR 渲染。

## 业务模块（`app/`）

路由覆盖以下业务：

| 路由            | 说明                  |
| --------------- | --------------------- |
| `articles`      | 文章列表 / 详情       |
| `categories`    | 分类                  |
| `circle`        | 圈子                  |
| `moments`       | 碎语（动态）          |
| `guestbook`     | 留言板                |
| `friend-links`  | 友邻                  |
| `users`         | 用户主页              |
| `notifications` | 通知中心              |
| `oauth`         | 第三方登录回调        |
| `(auth)`        | 登录 / 鉴权相关路由组 |

`sitemap.ts`、`robots.ts`、`feed.xml` 提供 SEO 与订阅能力。

## BFF 层（`app/api/*`）

`app/api/*` 是 Next.js Route Handler 实现的 BFF，承担后端代理、鉴权、验证码、上传、埋点上报等职责，覆盖 `admin`、`analytics-token`、`articles`、`auth`、`captcha`、`collect`、`guestbook`、`moments`、`notifications`、`oauth`、`uploads`、`users`。

## 渲染与状态

- 默认 Server Components，仅在需要浏览器 API / Hooks 时才标记 `'use client'`，并尽量下推到组件树叶子节点。
- 全局客户端状态集中在 `store/`（Zustand），按业务拆分（登录弹窗、评论、碎语、图片查看器、通知等）。

## 鉴权中间件（`proxy.ts`）

根目录 [`proxy.ts`](../apps/web/proxy.ts) 是 Next.js Middleware，负责 access / refresh token 校验与静默续期，保护 `/profile`、`/vip`、`/dashboard` 等受限路径。

## 服务端工具（`lib/`）

`lib/` 承载与后端交互、鉴权、SEO、文章封面/音乐处理、埋点 token 签发（`analytics-token.ts`）等服务端工具函数。

## 本地开发

```bash
pnpm dev:web            # http://localhost:3000
```

运行前先准备环境变量（见 [deployment.md](deployment.md#web-环境变量) 或 [`apps/web/.env.example`](../apps/web/.env.example)）。
