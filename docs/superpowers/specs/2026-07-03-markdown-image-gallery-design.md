# 文章正文多图局部轮播(Markdown Image Gallery)设计

日期:2026-07-03
状态:已确认

## 背景与目标

文章详情页正文由 markdown 渲染,图片目前只能一张张竖排展示。目标:支持在正文的某个图片位置放多张图,以**局部轮播**(左右翻页)方式展示;同时后台文章编辑器提供所见即所得的编辑体验。

已确认的三个关键决策:

1. **语法**:相邻图片自动成组——markdown 源码保持纯标准语法(连续的 `![alt](src)` 段落),任何第三方渲染器可降级为多张单图。
2. **前台渲染**:rehype 插件分组 + DOM 增强(CSS scroll-snap),不用 React 组件/embla。
3. **编辑器**:Tiptap 编辑器内也渲染成轮播(WYSIWYG)。

## 一、前台渲染(packages/markdown)

### 成组规则:rehype 插件 `rehypeImageGallery`

在渲染管线 `rehype-sanitize` 之后新增插件,识别**连续的、仅含 `img` 的兄弟段落**:

- 相邻的 `<p><img></p>`(段落间无其他内容);
- 或一个 `<p>` 内多张 `img` 仅隔空白文本/软换行(`<br>`);
- 两种情形混合出现时一并合入同一组。

匹配到 ≥2 张图时,合并包裹为:

```html
<div class="md-gallery" data-count="3">
  <div class="md-gallery-track">   <!-- 横向 scroll-snap 滑道 -->
    <figure class="md-gallery-slide"><img …></figure> <!-- ×N -->
  </div>
  <button class="md-gallery-prev" type="button" aria-label="上一张">…</button>
  <button class="md-gallery-next" type="button" aria-label="下一张">…</button>
  <div class="md-gallery-dots">…</div>
  <span class="md-gallery-counter">1/3</span>
</div>
```

单张图不受影响,保持现有渲染。sanitize schema 需放行上述类名/结构(与现有 `md-code-wrapper` 同模式)。

**拆组手段**:作者在两图之间留一个空段落(现有 `expandExtraBlankLines` 的 `&nbsp;` 机制)或任意文字,即不成组。

### 启用范围

作为 `MarkdownRenderOptions` 可选项(`groupImageGalleries: true`),**仅文章详情页启用**;评论、留言、摘录等场景不开启,行为不变。

### 交互:markdown-interactions 新增绑定

滑动本体是 CSS `scroll-snap`(`overflow-x: auto` + `scroll-snap-type: x mandatory`),移动端触摸滑动零 JS。JS(与 `.md-copy-btn` 相同的事件委托/绑定模式)只做:

1. 左右按钮 `scrollTo` 翻页(平滑滚动);
2. 监听 track scroll,同步指示点高亮与计数(1/N);首/尾时禁用对应按钮;
3. 键盘左右方向键翻页(track 聚焦时)。

### 与现有图片能力的兼容

轮播内的 `img` 仍是普通 img 节点,以下能力**零改动自动生效**:

- 骨架屏(`bindMarkdownImageSkeletons`);
- 懒加载(`deferImages`):IntersectionObserver 会被横向滚动容器裁剪,非当前 slide 翻到时才加载,正是期望的行为;
- 失败重试(`attachMarkdownImageRetries`);
- 点击全屏预览:现有委托收集容器内全部 `img`,轮播内图片自然纳入预览序列。

### 高度策略

slides 等宽(100%),图片 `object-contain` + `max-h`(约 70vh)居中;容器高度由最高 slide 决定,翻页不跳动。

## 二、编辑器(packages/editor)

### 数据模型:`imageGallery` node

新增块级 node,`content: "image+"`——图片仍是真实的 image 子 node,**不改 image 的 attrs 结构**。因此现有上传占位流程(`insertImagePlaceholder` / `resolveImagePlaceholder` / `removeImagePlaceholder` 按 `uploadId` 遍历文档查找)、CDN 优化、宽高比逻辑全部沿用,无需适配。

### 序列化(与前台规则严格对偶)

- **doc → markdown**:`imageGallery.renderMarkdown` = 子 image 的 `![alt](src)` 以空行 join,输出即普通相邻图片段落;上传中/失败的占位图沿用现有 image 的跳过逻辑。
- **markdown → doc**:解析后由 normalize 插件把相邻的顶层 image node 自动合并进 gallery(见下)。

### WYSIWYG 渲染:NodeView

gallery 的 NodeView 把 **contentDOM 本身作为横向 scroll-snap 滑道**:

- ProseMirror 继续管理子 image node 的 DOM——单张图的选中、删除、上传占位均为原生行为;
- NodeView 只添加不可编辑 chrome(`contentEditable=false`):左右翻页按钮、指示点、计数、「添加图片」按钮;
- 滑动同为 scroll-snap,与前台体验一致,**不引入 embla**。

### 自动合并/解散:appendTransaction 插件

- 两张顶层图片变相邻(插入/拖拽/删除中间内容导致)→ 自动并组为 gallery;
- gallery 只剩 1 张 → 自动解散回普通 image;删空 → 移除 gallery 节点;
- 作者在图间敲回车插入段落即可拆组。

### 顺带增强

文章编辑器的图片选择 input 加 `multiple`,一次多选连续插入直接成组。

### 启用范围

仅 admin 文章编辑器(`ArticleEditorWritingPanel` 使用的 RichEditor 配置)注册 gallery 扩展;评论场景的 `RichEditor`(web、moderation)不注册,行为不变。

## 测试(强制)

- `packages/markdown/src/render.test.ts`:成组(相邻段落 / 单段多图 / 混合)、单图不成组、被文字或空段落隔断不成组、选项关闭时不成组;
- interactions 测试:翻页按钮、指示点同步、清理函数;
- `packages/editor`:gallery 序列化往返(markdown ↔ doc)、normalize 插件(合并/解散/删空)、NodeView 渲染测试。

## 风险

- rehype 分组对「仅含 img 的段落」判定需容忍空白文本节点,历史文章中图片写法(如 img 与文字同段)不受影响,但需用例覆盖;
- 编辑器 contentDOM 作为滚动容器,ProseMirror 光标/选区在横向滚动内的表现需实测(必要时限制 gallery 内部为 NodeSelection 操作)。
