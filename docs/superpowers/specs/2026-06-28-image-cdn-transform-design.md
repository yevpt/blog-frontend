# 图片 CDN 变换与 Next 图片职责分离设计

## 背景

当前 `apps/web` 通过 `/_next/image` 在 Next 服务端拉取 CDN 原图并用 sharp 转码，存在超时压力（`imgOptTimeoutInSeconds: 30`）且与 CDN 缓存职责重叠。

本设计将图片缩放/转码下沉到 Go 源站，CDN 缓存变换结果并承担防盗链，Next 仅负责 `srcset`、`sizes`、懒加载与布局占位。

## 目标

- `next/image` + custom loader 生成带 `w`、`q` 的 CDN 鉴权 URL，不再走 `/_next/image` 转码。
- Go 图片服务作为腾讯云 CDN **唯一回源**，按参数变换或直传原图。
- CDN 边缘继续 TypeD 验签（`sign` + `t`）与防盗链；变换参数 `w`、`q` 追加在 query，不破坏签名。
- Redis **不存储**压缩/变换后的图片二进制；仅保留现有 `cdn:{objectKey}` 鉴权 URL 缓存。
- `Cache-Control` 的 `max-age` 可在配置中自定义，不写死。

## 非目标

- 不在 Redis 中缓存衍生图 bytes。
- 不支持按 query 分流回源（腾讯云 CDN 限制）；不引入变换结果回写 S3。
- 首期不新增 WebP/AVIF 自动协商（输出格式跟随 `imageutil` 默认 JPEG；GIF 直链原图）。

## 架构

```
浏览器
  ↓ custom loader 追加 w,q
CDN 边缘（TypeD 验签、防盗链、缓存）
  ↓ miss
Go 图片服务（验回源头、变换或直传）
  ↓
Garage S3 原图
```

### 职责

| 组件 | 负责 | 不负责 |
|------|------|--------|
| Next `next/image` | `srcset`/`sizes`/lazy/placeholder；loader 拼 `w`、`q` | sharp 转码、拉图 |
| CDN | 验签、防盗链、缓存响应（含变换结果） | 图片编解码 |
| Go 图片服务 | 回源鉴权、读 S3、`imageutil` 变换、设置可配置缓存头 | 签发 TypeD（仍由 `ObjectURL`） |
| Redis | `cdn:{objectKey}` → 鉴权 URL | 衍生图 bytes |

## URL 约定

### API 返回（基底）

```
https://blog-oss.example.com/blog/articles/abc.jpg?sign=...&t=...
```

由现有 `storage.CDNSigner` TypeD 签名，`sign = md5(secret + path + timestamp)`。

### 页面展示（loader 追加）

```
https://blog-oss.example.com/blog/articles/abc.jpg?w=640&q=75&sign=...&t=...
```

### 预览 / 原图（不加 `w`）

```
https://blog-oss.example.com/blog/articles/abc.jpg?sign=...&t=...
```

### 参数规则（对齐 Next 行为）

| 场景 | 行为 |
|------|------|
| 静态 JPEG/PNG/WebP | loader 加 `w`、`q`（默认 q=75） |
| URL 路径以 `.gif` 结尾 | `unoptimized`，直链原 URL |
| 非白名单外链 | 不改造 |
| `w` 上限 | 配置项 `maxWidth`，默认 3840；超出 clamp 或 400 |
| `q` 范围 | 1–100，默认 75 |

## CDN 配置（腾讯云）

1. **回源地址**：指向 Go 图片服务（内网 LB 或受限公网端口）。
2. **回源 HTTP 请求头**：`X-Origin-Auth: <与 Go 配置相同的密钥>`。
3. **缓存键**：将 `w`、`q` 纳入缓存参数（或全 query 参与缓存），避免不同尺寸串缓存。
4. **源站缓存时间**：建议 ≥ Go `responseCacheMaxAge`，减少无效回源。
5. **防盗链**：在 CDN 域名配置 Referer 白名单（站点域名），与 TypeD 验签并存。
6. **源站防护**：Go 监听内网或安全组仅放行 CDN 回源 IP；公网直连应被拒绝。

Go **不复验** CDN `sign`/`t`（边缘已验）；仅校验 `X-Origin-Auth`。

## Go 图片服务

### 部署形态

在现有 `blog-backend` 进程内新增 CDN 回源专用路由，与 API 共用进程，独立中间件链（不走 JWT）。

建议路由：`GET /cdn-object/*filepath` 或由 CDN 将完整 path（如 `/blog/...`）转发到专用 handler——实现时以 CDN 实际回源 path 为准，需与 `storage.fullObjectPath`（`/{bucket}/{objectKey}`）对齐。

### 中间件链

1. `OriginAuthMiddleware`：校验 `X-Origin-Auth` 请求头与环境变量/配置一致，否则 `403`。
2. `ImageTransformHandler`：解析 object key、query，读 S3 并响应。

### 处理逻辑

```
1. 从 path 解析 objectKey（去掉 leading /{bucket}/ 前缀）
2. 解析 w、q（无 w → 直传模式）
3. 直传模式：
   - storage.GetObject 流式写入 ResponseWriter
   - Content-Type 来自 S3 元数据或 sniff
4. 变换模式：
   - GetObject 读入内存（单图上传已有体积上限，可接受）
   - imageutil.Process({ MaxWidth: w, JPEGQuality: q })
   - 返回 JPEG（或按原格式策略）
5. 设置响应头（见下）
```

### 响应头

```
Content-Type: image/jpeg  # 或实际类型
Cache-Control: public, max-age={responseCacheMaxAge}, immutable
ETag: "{md5}"
```

`responseCacheMaxAge` 来自配置，**禁止硬编码**。

### 并发去重

- 单实例：`golang.org/x/sync/singleflight` 按 `{objectKey}:w{w}:q{q}` 合并并发变换。
- 多实例：可选 Redis 分布式锁（仅锁 key，不存图片）；首期单实例 singleflight 即可。

### 对象变更

沿用 `cdn:{objectKey}` 失效；**不**维护衍生图 Redis。CDN 缓存自然过期；若需立即刷新可在后续迭代增加 CDN 刷新 API，本期不做。

## 配置（`config.yaml` 新增 `image` 段）

```yaml
image:
  originAuthSecret: ""           # 必填；与 CDN 回源请求头一致
  responseCacheMaxAge: 604800    # 秒；Cache-Control max-age，默认 7 天
  defaultQuality: 75
  maxWidth: 3840
```

环境变量覆盖遵循现有 `pkg/config` 惯例（如 `IMAGE_ORIGIN_AUTH_SECRET`）。

## Redis

| Key | 用途 | 变更时失效 |
|-----|------|------------|
| `cdn:{objectKey}` | 鉴权 URL 缓存（已有） | Put/Move/Delete 对象 |
| — | **不存**衍生图 | — |

## 前端改造（`apps/web`）

### Custom Loader

新增 `lib/blog-image-loader.ts`，在鉴权 URL 上 `searchParams.set('w', ...)`、`set('q', ...)`；GIF 返回原 `src`。

`next.config.mjs`：

```javascript
images: {
  loader: "custom",
  loaderFile: "./lib/blog-image-loader.ts",
  remotePatterns: [...optimizedImageHosts],
}
```

移除 `minimumCacheTTL`、`experimental.imgOptTimeoutInSeconds`。

### 改造清单

| 位置 | 改动 |
|------|------|
| `markdown-image-optimizer.ts` | 用 loader 替代 `/_next/image?url=...` |
| `LoadingImage` | 依赖 custom loader；保留 GIF `unoptimized` 与失败回退原图 |
| `UserAvatar`、`MomentImageGrid` 等 | 确认无手写 `/_next/image` |
| 预览 / `data-original-src` | 始终使用无 `w` 的 API 原 URL |

### 失败兜底

保留现有策略：变换 URL 失败 → 重试最多 3 次 → 去掉 `w`/`q` 回退原图。

## 数据流

1. API 调用 `CachedObjectURLResolver.ObjectURL` → 返回 TypeD 鉴权 URL。
2. 页面 `next/image` 通过 loader 生成带宽高的 CDN URL。
3. 浏览器请求 CDN；边缘验签 + 防盗链；命中缓存直接返回。
4. CDN miss → 带 `X-Origin-Auth` 回源 Go → S3 读图 → 变换或直传 → CDN 缓存。
5. 用户点击预览 → 使用无 `w` 的原鉴权 URL。

## 测试

### 后端

- `OriginAuthMiddleware`：头正确/缺失/错误 → 200/403。
- 变换 handler：有 `w` 输出尺寸与质量；无 `w` 直传；`maxWidth` clamp；`responseCacheMaxAge` 写入 `Cache-Control`。
- path → objectKey 解析与 `fullObjectPath` 互逆用例。

### 前端

- `blog-image-loader`：白名单 URL 加参数；GIF/外链不变。
- `markdown-image-optimizer`：生成 CDN URL 而非 `/_next/image`。
- `LoadingImage`：失败回退原图。

## 风险

| 风险 | 缓解 |
|------|------|
| 原图预览也经 Go 回源 | CDN 缓存原图 URL；Go 直传零 CPU |
| CDN 集体 miss 打满 Go CPU | singleflight；CDN 缓存键含 w,q；监控回源带宽 |
| TypeD URL 过期 | 与现网一致；API 侧重签；衍生不依赖 sign 内容 |
| 腾讯云缓存键未含 w,q | 上线前在控制台验收多宽度不串图 |

## 迁移步骤

1. 部署 Go 图片 handler + 配置 `image.*`。
2. 腾讯云 CDN 改回源至 Go，配置回源头与缓存键。
3. 前端切换 custom loader，下线 `/_next/image` 依赖。
4. 观察 CDN 命中率与 Go CPU；按需调 `responseCacheMaxAge`。

## 关联文档

- 将被替代的前端方案：[2026-06-27-next-image-optimization-design.md](./2026-06-27-next-image-optimization-design.md)
- 后端存储与 CDN 签名：`blog-backend/pkg/storage/README.md`
