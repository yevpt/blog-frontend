# Markdown 与首页轮播图片优化设计

## 目标

- 文章正文、评论等 Markdown 场景不再直接下载白名单图片的原始大图。
- Markdown 页面内展示使用 Next 图片优化器，点击预览仍加载原图。
- 首页轮播图使用 Next 图片优化器，并继续等比裁切铺满现有容器。

## 方案

### Markdown 图片

在 `apps/web` 的 `PreviewableMarkdown` 边界处理已经过安全渲染的 HTML：

- 仅为 `next.config` 已允许的 HTTPS 图片域名生成 `/_next/image` URL。
- 按 Markdown 展示宽度生成响应式 `srcset` 和 `sizes`，默认延迟加载并异步解码。
- 用 `data-original-src` 保存原始地址；`MarkdownContent` 收集预览图片时优先读取该字段。
- 非白名单地址、相对地址以及 `data:`、`blob:` 等特殊地址保持不变，避免优化器拒绝后出现坏图。

URL 改写逻辑放在独立纯函数中，便于覆盖边界并避免在共享 `@repo/markdown` 包中耦合 Next 配置。

### 首页轮播图

移除 `FeaturedCarouselSlide` 传给 `LoadingImage` 的 `unoptimized`。继续使用 `fill`、响应式 `sizes` 和 `object-cover`，因此图片不会拉伸，视觉上保持等比裁切铺满。启用 `fallbackUnoptimized`，当优化器重试仍失败时才回退到原图直连。

## 数据流

1. Markdown 渲染管线产出安全 HTML。
2. `PreviewableMarkdown` 将白名单图片的展示地址改为 Next 优化地址，并保留原图地址。
3. 浏览器按 `sizes/srcset` 选择合适宽度；点击图片时，预览 store 接收原图地址。
4. 轮播图由 `LoadingImage` 正常走 Next 优化器，失败时沿用其重试与原图兜底逻辑。

## 测试与验收

- 纯函数测试：白名单图片被改写并生成响应式候选；非白名单和特殊地址不变。
- Markdown 组件测试：页面展示优化地址，点击后预览 store 收到原图地址。
- 轮播组件测试：不再设置 `unoptimized`，启用失败兜底，并保留 `fill`、`sizes`、`object-cover`。
- 运行相关 Vitest、类型检查与 lint。

## 风险

- 图片域名白名单若变化，需要同步维护 Web 图片优化配置与改写判断；测试需覆盖当前允许域名，降低配置漂移风险。
- 动图等 Next 无法有效转码的格式可能仍接近原始体积，但不会影响原图预览语义。
