# 碎语模块 UI 重设计

**日期：** 2026-06-07
**范围：** 首页侧边栏碎语区域 + 碎语独立页面的卡片组件

---

## 背景

当前碎语模块使用简单的 border-bottom 分隔、小头像（20px）、纯文字统计，视觉层次单薄。API 已支持 `images` 字段但 UI 未展示。需要升级为现代卡片堆叠风格，与博客紫色主题统一。

## 设计决策

| 决策           | 选择                                            | 原因                             |
| -------------- | ----------------------------------------------- | -------------------------------- |
| 整体风格       | 独立卡片堆叠                                    | 每条碎语有独立视觉空间，更现代   |
| 作者信息       | 丰富双行（36px 头像 + 名字/标签/时间 + 副标题） | 更有个人品牌感                   |
| 图片展示       | 内联网格（1-3 张自适应）                        | 紧凑且信息完整                   |
| 操作按钮       | 复用 ArticleCardStats 样式                      | 与文章卡片视觉统一               |
| Section Header | 紫色渐变图标 + 标题 + 随机刷新按钮              | 替代原"查看全部"链接，增加交互性 |

---

## 组件变更

### 1. SnippetsSection（容器）

**Section Header：**

- 左侧：28px 紫色渐变圆角图标（✦）+ "碎语" 标题（14px bold）
- 右侧：shuffle 图标按钮（32×32，圆角 10px，描边，hover 紫色），点击后从 API 随机拉取 3 条碎语替换当前列表
- 需要在 `packages/icons` 中新增 `shuffle` 图标

**卡片区域：**

- 每条碎语独立圆角卡片（14px radius），浅灰底色（light: `#fafafa`，dark: `#1f1f23`）
- 1px 细边框，hover 时紫色光晕（`border-color: rgba(124,58,237,0.15)` + 淡紫 shadow）
- 卡片间距 8px

**底部 CTA（保持原有双按钮布局）：**

- 主按钮 "发表碎语"：渐变紫背景，圆角 12px，36px 高
- 次按钮 "查看全部"：描边透明底，圆角 12px，36px 高
- 外层用 `border-top` 与卡片区分隔

### 2. SnippetCard（单条碎语卡片）

**Header 双行布局：**

- 第一行：36px 渐变头像（紫色 linear-gradient 兜底）+ 作者名（13px semibold）+ 身份标签（`mark` 字段，紫色胶囊 badge）+ 相对时间（11px，右对齐）
- 第二行：副标题（10px，浅灰色）— 可由 `user.mark` 或固定文案填充

**正文区域：**

- 13px，`color: #3f3f46`（dark: `#b8b8c4`），line-height 1.65
- 保留现有 `SnippetContent` 的展开/收起逻辑（>120 字符截断）

**图片网格（新增）：**

- 当 `snippet.images` 非空时展示
- 1 张：单列，高度 120px
- 2 张：双列等分，高度 90px
- 3 张及以上：双列，前两张等高，第三张跨列或只显示前两张
- 圆角 10px，gap 4px
- 使用 `<img>` 或 next/image，`object-fit: cover`

**操作区（复用 ArticleCardStats）：**

- 提取 `ArticleCardStats` 为通用组件，或直接复用其样式
- 右对齐，ghost button + SvgIcon heart（心跳动画）+ message-circle + 数字
- hover 变紫，已点赞状态红色实心
- 点赞/评论的实际交互逻辑暂不实现（保持现有 mock 状态），仅升级 UI

### 3. SnippetActions（废弃）

现有 `SnippetActions` 组件被 `ArticleCardStats` 样式替代，删除该文件。

### 4. SnippetContent（保持不变）

展开/收起逻辑不变，仅调整外层间距适配新卡片内边距。

---

## 新增资源

### shuffle 图标

在 `packages/icons/src/generated/sprite.ts` 中新增 `shuffle` SVG path（Lucide shuffle icon），并更新 `types.ts` 的 `IconName` 类型。

---

## 深色模式

所有颜色使用 CSS 变量或 Tailwind token，确保深色模式自动适配：

- 卡片底色：`#fafafa` → dark `#1f1f23`
- Section 背景：`bg-card`
- 头像渐变：`#7c3aed` → dark `#a78bfa`
- 作者 badge：`rgba(124,58,237,0.1)` → dark `rgba(167,139,250,0.15)`
- 正文：`#3f3f46` → dark `#b8b8c4`
- 操作按钮：`rgba(0,0,0,0.54)` → dark `#71717a`

---

## 不在范围内

- 点赞/评论的实际 API 对接（需要认证，后续单独做）
- 发表碎语的表单/编辑器
- 碎语详情页路由
- 管理端碎语 CRUD
- shuffle 按钮的后端随机接口（前端可先 fetch 全量再客户端随机取 3 条，或后续加后端接口）

---

## 测试策略

- `snippets-section.test.tsx`：更新 snapshot，验证新 header 结构（shuffle 按钮存在）
- `snippet-card.test.tsx`：更新为新的卡片结构（双行 header、图片网格、ArticleCardStats 样式按钮）
- 删除 `snippet-actions.test.tsx`（如存在）

---

## Mockup

详见 `.superpowers/brainstorm/21169-1780836323/content/final-design-v2.html`
