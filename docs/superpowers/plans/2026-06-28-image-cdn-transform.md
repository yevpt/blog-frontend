# 图片 CDN 变换与 Next 职责分离 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将图片缩放/转码从 Next `/_next/image` 下沉到 Go CDN 源站，前端仅用 custom loader 拼 `w`/`q`，CDN 缓存变换结果。

**Architecture:** 腾讯云 CDN 唯一回源 Go；Go 验 `X-Origin-Auth` 后从 Garage 读原图，有 `w` 时用 `imageutil` 变换，无 `w` 时直传；Redis 仅存鉴权 URL。前端 `blog-image-loader` 在 API 返回的 TypeD URL 上追加 query 参数。

**Tech Stack:** Go 1.22+ / Gin / AWS SDK S3 / `pkg/imageutil`；Next.js 16 / TypeScript / Vitest

## Global Constraints

- Redis **不得**存储变换后的图片 bytes；仅保留现有 `cdn:{objectKey}` 鉴权 URL 缓存。
- `Cache-Control` 的 `max-age` 必须来自配置 `image.responseCacheMaxAge`，禁止硬编码 `604800`。
- Go **不复验** CDN TypeD `sign`/`t`；仅校验 `X-Origin-Auth`。
- 变换参数：`w`（上限 `image.maxWidth` 默认 3840）、`q`（1–100，默认 `image.defaultQuality` 75）；GIF（路径 `.gif`）前端直链不加 `w`。
- 腾讯云 CDN 不支持 query 分流；Go 为**唯一**源站。
- 前端改造后移除 `minimumCacheTTL`、`experimental.imgOptTimeoutInSeconds`。

---

## 文件结构

### blog-backend（`../blog-backend`）

| 文件 | 职责 |
|------|------|
| `pkg/config/config.go` | 新增 `ImageConfig` |
| `pkg/config/config_test.go` | 配置加载测试 |
| `config/config.yaml` | 默认 `image` 段 |
| `config/config.local.yaml.example` | 示例密钥占位 |
| `pkg/imagecdn/path.go` | CDN path → object key |
| `pkg/imagecdn/params.go` | 解析/校验 `w`、`q` |
| `pkg/imagecdn/path_test.go` / `params_test.go` | 纯函数测试 |
| `internal/middleware/origin_auth.go` | 回源鉴权中间件 |
| `internal/middleware/origin_auth_test.go` | 中间件测试 |
| `internal/service/imagecdn/service.go` | 读 S3、变换、响应头 |
| `internal/service/imagecdn/service_test.go` | 服务单测 |
| `internal/handler/imagecdn/handler.go` | Gin handler |
| `internal/handler/imagecdn/handler_test.go` | HTTP 集成测试 |
| `internal/router/router.go` | 注册 `GET /{bucket}/*filepath` |

### blog-frontend（本仓库）

| 文件 | 职责 |
|------|------|
| `apps/web/lib/blog-image-url.ts` | 拼 CDN 变换 URL、剥离 `w`/`q`、GIF 判断（loader 与 markdown 共用） |
| `apps/web/lib/blog-image-url.test.ts` | 纯函数测试 |
| `apps/web/lib/blog-image-loader.ts` | Next custom loader 入口 |
| `apps/web/next.config.mjs` | `loader: "custom"`，移除 Next 优化器配置 |
| `apps/web/lib/markdown-image-optimizer.ts` | 改用 `blog-image-url` |
| `apps/web/lib/markdown-image-optimizer.test.ts` | 更新断言 |
| `apps/web/components/common/loading-image.tsx` | 失败回退改为去掉 `w`/`q` 的原 URL |

---

### Task 1: 后端 Image 配置

**Repo:** `blog-backend`

**Files:**
- Modify: `pkg/config/config.go`
- Modify: `pkg/config/config_test.go`
- Modify: `config/config.yaml`
- Modify: `config/config.local.yaml.example`

**Interfaces:**
- Produces: `config.ImageConfig` with fields `OriginAuthSecret string`, `ResponseCacheMaxAge int`, `DefaultQuality int`, `MaxWidth int`

- [ ] **Step 1: 写失败测试**

在 `pkg/config/config_test.go` 追加：

```go
func TestLoad_ReadsImageConfig(t *testing.T) {
	t.Setenv("CONFIG_PATH", writeTempConfig(t, `
image:
  originAuthSecret: "origin-secret"
  responseCacheMaxAge: 3600
  defaultQuality: 80
  maxWidth: 2048
`))
	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "origin-secret", cfg.Image.OriginAuthSecret)
	assert.Equal(t, 3600, cfg.Image.ResponseCacheMaxAge)
	assert.Equal(t, 80, cfg.Image.DefaultQuality)
	assert.Equal(t, 2048, cfg.Image.MaxWidth)
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd ../blog-backend && go test ./pkg/config -run TestLoad_ReadsImageConfig -count=1
```

Expected: FAIL（`cfg.Image` 未定义）

- [ ] **Step 3: 实现配置**

在 `Config` 结构体增加 `Image ImageConfig`，新增：

```go
type ImageConfig struct {
	OriginAuthSecret    string `mapstructure:"originAuthSecret"`
	ResponseCacheMaxAge int    `mapstructure:"responseCacheMaxAge"`
	DefaultQuality      int    `mapstructure:"defaultQuality"`
	MaxWidth            int    `mapstructure:"maxWidth"`
}
```

在 `setDefaults`（或等价处）填默认：`ResponseCacheMaxAge: 604800`, `DefaultQuality: 75`, `MaxWidth: 3840`。

`config.yaml` 增加 `image` 段；`config.local.yaml.example` 增加 `originAuthSecret` 占位。

- [ ] **Step 4: 运行测试确认通过**

```bash
go test ./pkg/config -count=1
```

- [ ] **Step 5: Commit（blog-backend）**

```bash
git add pkg/config config/config.yaml config/config.local.yaml.example
git commit -m "feat(image): 新增图片 CDN 源站配置项"
```

---

### Task 2: path 与 query 解析纯函数

**Repo:** `blog-backend`

**Files:**
- Create: `pkg/imagecdn/path.go`
- Create: `pkg/imagecdn/params.go`
- Create: `pkg/imagecdn/path_test.go`
- Create: `pkg/imagecdn/params_test.go`

**Interfaces:**
- Produces: `func ObjectKeyFromCDNPath(bucket, requestPath string) (string, error)`
- Produces: `func ParseTransformParams(raw url.Values, cfg config.ImageConfig) (width int, quality int, transform bool)`

- [ ] **Step 1: 写失败测试**

`path_test.go`：

```go
func TestObjectKeyFromCDNPath(t *testing.T) {
	key, err := imagecdn.ObjectKeyFromCDNPath("blog", "/blog/articles/cover.jpg")
	require.NoError(t, err)
	assert.Equal(t, "articles/cover.jpg", key)
}

func TestObjectKeyFromCDNPath_RejectsWrongBucket(t *testing.T) {
	_, err := imagecdn.ObjectKeyFromCDNPath("blog", "/other/x.jpg")
	require.Error(t, err)
}
```

`params_test.go`：

```go
func TestParseTransformParams_WithWidth(t *testing.T) {
	cfg := config.ImageConfig{DefaultQuality: 75, MaxWidth: 3840}
	w, q, transform := imagecdn.ParseTransformParams(url.Values{"w": {"640"}, "q": {"60"}}, cfg)
	assert.True(t, transform)
	assert.Equal(t, 640, w)
	assert.Equal(t, 60, q)
}

func TestParseTransformParams_WithoutWidth(t *testing.T) {
	cfg := config.ImageConfig{DefaultQuality: 75, MaxWidth: 3840}
	_, _, transform := imagecdn.ParseTransformParams(url.Values{}, cfg)
	assert.False(t, transform)
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
go test ./pkg/imagecdn -count=1
```

- [ ] **Step 3: 实现**

`ObjectKeyFromCDNPath`：期望 path 为 `/{bucket}/{objectKey}`，去掉 bucket 前缀并 `normalizeObjectName`。

`ParseTransformParams`：无 `w` → `transform=false`；有 `w` → 解析整数，clamp 到 `[1, MaxWidth]`；`q` 缺省 `DefaultQuality`，clamp `[1,100]`。

- [ ] **Step 4: 运行测试确认通过**

```bash
go test ./pkg/imagecdn -count=1
```

- [ ] **Step 5: Commit**

```bash
git add pkg/imagecdn
git commit -m "feat(image): 新增 CDN path 与变换参数解析"
```

---

### Task 3: OriginAuth 中间件

**Repo:** `blog-backend`

**Files:**
- Create: `internal/middleware/origin_auth.go`
- Create: `internal/middleware/origin_auth_test.go`

**Interfaces:**
- Produces: `func OriginAuth(secret string) gin.HandlerFunc`

- [ ] **Step 1: 写失败测试**

```go
func TestOriginAuth_AllowsMatchingHeader(t *testing.T) {
	r := gin.New()
	r.GET("/x", middleware.OriginAuth("secret"), func(c *gin.Context) { c.Status(200) })
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	req.Header.Set("X-Origin-Auth", "secret")
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
}

func TestOriginAuth_RejectsMissingHeader(t *testing.T) {
	r := gin.New()
	r.GET("/x", middleware.OriginAuth("secret"), func(c *gin.Context) { c.Status(200) })
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/x", nil))
	assert.Equal(t, 403, w.Code)
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
go test ./internal/middleware -run TestOriginAuth -count=1
```

- [ ] **Step 3: 实现**

使用 `subtle.ConstantTimeCompare` 比较 `X-Origin-Auth` 与配置密钥；空 secret 时拒绝所有请求（fail closed）。

- [ ] **Step 4: 运行测试确认通过**

```bash
go test ./internal/middleware -run TestOriginAuth -count=1
```

- [ ] **Step 5: Commit**

```bash
git add internal/middleware/origin_auth.go internal/middleware/origin_auth_test.go
git commit -m "feat(image): 新增 CDN 回源鉴权中间件"
```

---

### Task 4: ImageCDN 服务（变换 + 直传 + 响应头）

**Repo:** `blog-backend`

**Files:**
- Create: `internal/service/imagecdn/service.go`
- Create: `internal/service/imagecdn/service_test.go`

**Interfaces:**
- Consumes: `storage.ObjectStore`（`GetObject`）、`config.ImageConfig`、`pkg/imagecdn` 解析函数、`pkg/imageutil.Process`
- Produces: `type Service struct { ... }` with `func (s *Service) ServeObject(w http.ResponseWriter, r *http.Request, objectKey string, width, quality int, transform bool) error`

- [ ] **Step 1: 写失败测试（httptest + fake store）**

用最小 JPEG bytes fixture（可从 `imageutil` 测试复用或内联 1x1 JPEG）：

```go
func TestService_ServeObject_TransformSetsCacheControl(t *testing.T) {
	cfg := config.ImageConfig{ResponseCacheMaxAge: 123, DefaultQuality: 75, MaxWidth: 3840}
	svc := imagecdn.NewService(fakeStoreWithJPEG(t), cfg)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	require.NoError(t, svc.ServeObject(rr, req, "a.jpg", 32, 75, true))
	assert.Contains(t, rr.Header().Get("Cache-Control"), "max-age=123")
	assert.Equal(t, "image/jpeg", rr.Header().Get("Content-Type"))
}

func TestService_ServeObject_PassthroughWithoutTransform(t *testing.T) {
	// transform=false 时 Content-Type 来自原图，body 与 S3 一致
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
go test ./internal/service/imagecdn -count=1
```

- [ ] **Step 3: 实现**

要点：
- `transform=true`：`GetObject` → `imageutil.Process`（`MaxWidth: width`, `JPEGQuality: quality`）→ 写 body
- `transform=false`：直接写 S3 bytes，`Content-Type` 用 `http.DetectContentType` 或固定从 key 推断
- 响应头：`Cache-Control: public, max-age={cfg.ResponseCacheMaxAge}, immutable`；`ETag: "{md5}"`
- 使用 `singleflight.Group` 键 `{objectKey}:w{width}:q{quality}` 合并并发变换

- [ ] **Step 4: 运行测试确认通过**

```bash
go test ./internal/service/imagecdn -count=1
```

- [ ] **Step 5: Commit**

```bash
git add internal/service/imagecdn
git commit -m "feat(image): 实现 CDN 源站图片变换服务"
```

---

### Task 5: Handler 与路由注册

**Repo:** `blog-backend`

**Files:**
- Create: `internal/handler/imagecdn/handler.go`
- Create: `internal/handler/imagecdn/handler_test.go`
- Modify: `internal/router/router.go`

**Interfaces:**
- Consumes: `Service.ServeObject`, `ObjectKeyFromCDNPath`, `ParseTransformParams`, `OriginAuth`
- Produces: route `GET /{bucket}/*filepath`（`bucket` 取自 `cfg.Garage.Bucket`）

- [ ] **Step 1: 写失败 HTTP 测试**

```go
func TestImageCDNHandler_RequiresOriginAuth(t *testing.T) {
	h := imagecdnhandler.NewHandler(svc, cfg)
	r := gin.New()
	r.GET("/blog/*filepath", middleware.OriginAuth(cfg.Image.OriginAuthSecret), h.Serve)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/blog/articles/a.jpg?w=100", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, 403, w.Code)
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
go test ./internal/handler/imagecdn -count=1
```

- [ ] **Step 3: 实现 handler**

Handler 流程：
1. `ObjectKeyFromCDNPath(bucket, c.Request.URL.Path)`
2. `ParseTransformParams(c.Request.URL.Query(), cfg.Image)`
3. 调用 `svc.ServeObject`

在 `router.Setup` 中、`registerPublicRoutes` **之前**注册（避免被其他路由遮蔽）：

```go
if cfg.Garage.CDN && cfg.Image.OriginAuthSecret != "" {
	bucket := strings.Trim(cfg.Garage.Bucket, "/")
	imageCDNHandler := imagecdnhandler.NewHandler(imageCDNService, cfg)
	r.GET("/"+bucket+"/*filepath",
		middleware.OriginAuth(cfg.Image.OriginAuthSecret),
		imageCDNHandler.Serve,
	)
}
```

`OriginAuthSecret` 为空时跳过注册并打 warn 日志（开发环境可显式关闭）。

- [ ] **Step 4: 运行相关测试**

```bash
go test ./internal/handler/imagecdn ./internal/router -count=1
```

- [ ] **Step 5: Commit**

```bash
git add internal/handler/imagecdn internal/router/router.go
git commit -m "feat(image): 注册 CDN 回源图片路由"
```

---

### Task 6: 前端共享 URL 工具

**Repo:** `blog-frontend`

**Files:**
- Create: `apps/web/lib/blog-image-url.ts`
- Create: `apps/web/lib/blog-image-url.test.ts`

**Interfaces:**
- Produces: `buildCdnImageUrl(src: string, width: number, quality?: number): string`
- Produces: `stripTransformParams(src: string): string`
- Re-export or share `isGifImageUrl`（从 `markdown-image-optimizer` 抽到本文件）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from "vitest";
import { buildCdnImageUrl, stripTransformParams } from "./blog-image-url";

describe("buildCdnImageUrl", () => {
  const base = "https://blog-oss.yevpt.com/blog/a.jpg?sign=abc&t=def";

  it("追加 w 和 q 且保留原 query", () => {
    const url = buildCdnImageUrl(base, 640, 75);
    expect(url).toContain("w=640");
    expect(url).toContain("q=75");
    expect(url).toContain("sign=abc");
  });

  it("GIF 原样返回", () => {
    const gif = "https://blog-oss.yevpt.com/blog/a.gif?sign=1&t=2";
    expect(buildCdnImageUrl(gif, 640)).toBe(gif);
  });
});

describe("stripTransformParams", () => {
  it("移除 w 和 q", () => {
    const src = "https://blog-oss.yevpt.com/blog/a.jpg?w=640&q=75&sign=1&t=2";
    expect(stripTransformParams(src)).toBe("https://blog-oss.yevpt.com/blog/a.jpg?sign=1&t=2");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter web exec vitest run apps/web/lib/blog-image-url.test.ts
```

- [ ] **Step 3: 实现**

```ts
export function isGifImageUrl(src: string): boolean { /* 从 markdown-image-optimizer 迁移 */ }

export function buildCdnImageUrl(src: string, width: number, quality = 75): string {
  if (isGifImageUrl(src)) return src;
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality));
  return url.toString();
}

export function stripTransformParams(src: string): string {
  const url = new URL(src);
  url.searchParams.delete("w");
  url.searchParams.delete("q");
  url.searchParams.delete("md_retry");
  return url.toString();
}
```

- [ ] **Step 4: 运行测试确认通过**

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blog-image-url.ts apps/web/lib/blog-image-url.test.ts
git commit -m "feat(web): 新增 CDN 图片 URL 拼接工具"
```

---

### Task 7: Next custom loader 与配置

**Repo:** `blog-frontend`

**Files:**
- Create: `apps/web/lib/blog-image-loader.ts`
- Modify: `apps/web/next.config.mjs`

- [ ] **Step 1: 实现 loader**

```ts
import { buildCdnImageUrl } from "./blog-image-url";

export default function blogImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return buildCdnImageUrl(src, width, quality);
}
```

- [ ] **Step 2: 修改 next.config.mjs**

```javascript
images: {
  loader: "custom",
  loaderFile: "./lib/blog-image-loader.ts",
  remotePatterns: optimizedImageHosts.map((hostname) => ({ hostname })),
},
```

删除 `minimumCacheTTL`、`experimental.imgOptTimeoutInSeconds`、`IMAGE_CACHE_TTL_SECONDS` 常量。

- [ ] **Step 3: 类型检查**

```bash
pnpm --filter web check-types
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/blog-image-loader.ts apps/web/next.config.mjs
git commit -m "feat(web): 切换 next/image 为 CDN custom loader"
```

---

### Task 8: Markdown 优化器迁移

**Repo:** `blog-frontend`

**Files:**
- Modify: `apps/web/lib/markdown-image-optimizer.ts`
- Modify: `apps/web/lib/markdown-image-optimizer.test.ts`

- [ ] **Step 1: 更新失败测试**

将 `toContain("/_next/image?url=")` 改为断言 `w=640` 且不含 `/_next/image`：

```ts
expect(image.getAttribute("src")).toContain("w=1080");
expect(image.getAttribute("src")).not.toContain("/_next/image");
expect(image.getAttribute("srcset")).toContain("640w");
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter web exec vitest run apps/web/lib/markdown-image-optimizer.test.ts
```

- [ ] **Step 3: 修改 optimizer**

`nextImageUrl` 替换为 `buildCdnImageUrl`；`isGifImageUrl` 改从 `blog-image-url` 导入。

- [ ] **Step 4: 运行测试确认通过**

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/markdown-image-optimizer.ts apps/web/lib/markdown-image-optimizer.test.ts
git commit -m "refactor(web): Markdown 图片改用 CDN 变换 URL"
```

---

### Task 9: LoadingImage 失败回退

**Repo:** `blog-frontend`

**Files:**
- Modify: `apps/web/components/common/loading-image.tsx`
- Modify: `apps/web/components/common/loading-image.test.tsx`

- [ ] **Step 1: 更新失败测试**

失败回退场景：mock 连续 `onError` 后 `src` 应为去掉 `w`/`q` 的原 URL（`stripTransformParams(src)`），而非 `unoptimized` 直连（除非 `fallbackUnoptimized` 且原 URL 即最终 URL）。

- [ ] **Step 2: 实现**

`handleImageFailure` 在重试耗尽后：
```ts
setUnoptimized(true);
// 若 src 含 w/q，改用 stripTransformParams(resolveSrcString(src))
```

更新注释：去掉 `/_next/image` 相关描述。

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter web exec vitest run apps/web/components/common/loading-image.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/common/loading-image.tsx apps/web/components/common/loading-image.test.tsx
git commit -m "fix(web): 图片加载失败回退至 CDN 原图 URL"
```

---

### Task 10: 全量验证

**Repo:** 两个仓库分别执行

- [ ] **Step 1: 后端测试**

```bash
cd ../blog-backend && go test ./pkg/imagecdn ./internal/middleware ./internal/service/imagecdn ./internal/handler/imagecdn -count=1
```

- [ ] **Step 2: 前端测试与 lint**

```bash
cd ../blog-frontend && pnpm --filter web exec vitest run apps/web/lib/blog-image-url.test.ts apps/web/lib/markdown-image-optimizer.test.ts apps/web/components/common/loading-image.test.tsx
pnpm --filter web lint && pnpm --filter web check-types
```

---

### Task 11: 腾讯云 CDN 上线清单（运维，非代码）

- [ ] CDN 回源地址改为 Go 服务（与 API 同端口或独立内网端口 + 反代）
- [ ] 回源 HTTP 请求头：`X-Origin-Auth: <与 image.originAuthSecret 相同>`
- [ ] 缓存配置：缓存键包含 `w`、`q`（或全部 query）
- [ ] 节点缓存时间 ≥ `image.responseCacheMaxAge`
- [ ] 防盗链 Referer 白名单：站点域名
- [ ] 安全组：Go 端口仅 CDN 回源 IP / 内网可达
- [ ] 验收：同一张图 `w=640` 与 `w=1280` 返回不同字节；预览 URL（无 `w`）返回原图

**推荐发布顺序：** 先后端部署并配 CDN 回源 → 用 curl 带 `X-Origin-Auth` 验证 → 再发布前端 custom loader。

---

## Spec 覆盖自检

| Spec 要求 | Task |
|-----------|------|
| Go 唯一源站 | Task 5 + Task 11 |
| X-Origin-Auth | Task 3, 5 |
| 不复验 TypeD | Task 4（无 sign 校验代码） |
| w/q 参数、maxWidth | Task 2, 4 |
| responseCacheMaxAge 可配置 | Task 1, 4 |
| Redis 不存图片 | 无相关 Task |
| custom loader | Task 7 |
| GIF 直链 | Task 6, 8 |
| 预览用原 URL | Task 6 `stripTransformParams` + markdown `data-original-src` 不变 |
| 失败回退 | Task 9 + `packages/markdown/src/image-retry.ts`（已用 `data-original-src`，无需改） |

## 风险提醒

- CDN 未把 `w`/`q` 纳入缓存键会导致尺寸串图——Task 11 必须验收。
- 后端先于前端上线时，旧前端仍走 `/_next/image`，不受影响；前端先上线而后端未就绪会导致图片 403/404——严格按发布顺序。
