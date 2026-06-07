# Rich Comment Editor — 设计文档

**日期**：2026-06-07  
**范围**：文章详情页评论框 WYSIWYG 改造，兼顾后续 admin 文章编辑器复用  
**状态**：待实现

---

## 1. 目标

将文章详情页（`inline` layout）的评论输入框从普通 `<input>` 升级为支持 Markdown WYSIWYG 的富文本编辑器，具体能力：

- **内联渲染**：输入 `## ` 即时显示为标题样式，底层数据仍是 Markdown
- **格式工具栏**（底部固定）：粗体 / 斜体 / 下划线 / 链接 / 图片 / 代码块 / @提及
- **行为可配置**：图片、链接、代码的插入方式通过 props 注入，使同一组件可用于评论框（URL 对话框）和文章编辑器（文件上传）

---

## 2. 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 编辑器内核 | **Tiptap v2** | ProseMirror 生态，扩展系统成熟，官方 React 封装 |
| Markdown 序列化 | **tiptap-markdown** | 双向 Markdown ↔ Tiptap JSON，与现有后端完全兼容 |
| 下划线 | 自定义扩展（基于 `@tiptap/extension-underline`） | MD 无原生下划线，存为 `<u>text</u>` |
| @提及 | `@tiptap/extension-mention`（stub 候选列表） | 需后端用户搜索 API，UI 预留，结果暂时为空 |
| 代码块 | `@tiptap/extension-code-block` + 对话框 | 支持语言选择，序列化为 \`\`\`lang 围栏 |

### 新增依赖（安装到 `packages/editor`）

```
@tiptap/react  @tiptap/pm  @tiptap/starter-kit
@tiptap/extension-underline  @tiptap/extension-link
@tiptap/extension-image  @tiptap/extension-code-block
@tiptap/extension-mention  tiptap-markdown
```

---

## 3. 包归属：新建 `packages/editor`

Tiptap 依赖体积较大，独立成包可避免污染 `@repo/ui`，且 admin 应用可直接引用同一包并注入不同 handler。

```
packages/editor/
  package.json              ← name: "@repo/editor"
  tsconfig.json
  src/
    index.ts                ← 公开 API：RichEditor + 所有类型
    types.ts                ← RichEditorProps / InsertHandlers 接口
    RichEditor.tsx          ← 主组件（教科书注释 + 响应式说明）
    hooks/
      use-rich-editor.ts    ← 封装 useEditor()，集中管理扩展列表
    extensions/
      underline.ts          ← 自定义下划线扩展（含追溯注释）
      mention.ts            ← mention 扩展配置（含后端接口预留注释）
      markdown-code-block.ts← 代码块扩展（语言属性支持）
    toolbar/
      Toolbar.tsx           ← 底部工具栏（响应式：sm 以下横向滚动）
      ToolbarButton.tsx     ← 单个按钮（图标 + tooltip + active 态）
```

---

## 4. 核心接口设计

### 4.1 InsertHandlers — 差异行为注入点

```typescript
/**
 * 每个 handler 接收一个 insert 回调，调用方决定"怎么获取数据"，
 * RichEditor 只负责"把数据插入文档"。
 *
 * 评论场景：打开 URL 对话框 → 用户填写 → 调用 insert()
 * 文章场景：打开文件选择 → 上传到 OSS → 调用 insert()
 */
export interface InsertHandlers {
  onInsertImage?: (insert: (url: string, alt?: string) => void) => void;
  onInsertLink?:  (insert: (url: string, title?: string) => void) => void;
  onInsertCode?:  (insert: (code: string, lang: string) => void) => void;
}
```

### 4.2 MentionItem

```typescript
/** @提及候选项，调用方提供；后端 API 就绪后替换数据源 */
export interface MentionItem {
  id: string;       // 唯一标识（用户 id 或 slug）
  label: string;    // 显示名称（下拉列表中展示）
}
```

### 4.3 RichEditorProps

```typescript
export interface RichEditorProps extends InsertHandlers {
  value: string;                        // Markdown 字符串（受控）
  onChange: (markdown: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;                   // 字符数限制（可选）
  mentionSuggestions?: MentionItem[];   // 候选列表，默认 []
  onSubmit?: () => void;               // 工具栏发送按钮
  isSubmitting?: boolean;
  className?: string;
}
```

---

## 5. 组件行为规范

### 5.1 编辑器主体

- 自动高度（`min-h-[80px] max-h-[240px]`，超出内部滚动）
- `prose` 样式覆盖：标题、粗体、斜体、下划线、代码块在编辑器内即时渲染
- `<u>` 在 Tiptap 编辑器内渲染为下划线样式，序列化时输出 `<u>text</u>` 到 Markdown 字符串

### 5.2 底部工具栏

布局参照参考设计图（B I U | 链接 图片 代码 @mention | → Submit），格式：

```
[ B ][ I ][ U ][ ─ ][ 🔗 ][ 🖼 ][ </> ][ @ ]      [ 发送 ↑ ]
```

**响应式**：
- `sm` 以上：工具栏单行展示，按钮间距 `gap-1`
- `sm` 以下（手机）：工具栏可横向滚动（`overflow-x-auto scrollbar-none`），防止挤压
- 发送按钮始终固定在右侧，不参与滚动区域

### 5.3 对话框（调用方实现，在 apps/web）

| 对话框 | 字段 | 触发来源 |
|--------|------|---------|
| `ImageDialog` | URL（必填）+ 图片描述（选填） | 工具栏图片按钮 → `onInsertImage` |
| `LinkDialog` | URL（必填）+ 链接文字（选填） | 工具栏链接按钮 → `onInsertLink` |
| `CodeDialog` | 代码内容（必填）+ 语言选择器（选填，默认 plain） | 工具栏代码按钮 → `onInsertCode` |

对话框均使用 `@repo/ui` 的 Dialog 组件，移动端居中显示，宽度 `w-[min(90vw,400px)]`。

### 5.4 @提及

- 输入 `@` 后弹出候选列表（Tiptap suggestion 机制）
- 候选数据来源：`mentionSuggestions` prop（调用方传入）
- 当前评论场景下列表为空（后端用户搜索 API 待实现），输入 `@name` 作为纯文本插入
- 序列化：mention 节点 → `@username` 纯文本（保持 Markdown 可读）
- 预留注释标记 `// TODO(mention-api): 接入用户搜索接口后替换此处`

---

## 6. Markdown 序列化约定

| 格式 | Tiptap 扩展 | Markdown 输出 |
|------|------------|--------------|
| 粗体 | StarterKit.Bold | `**text**` |
| 斜体 | StarterKit.Italic | `_text_` |
| 下划线 | 自定义 Underline | `<u>text</u>` |
| 删除线 | StarterKit.Strike | `~~text~~` |
| 内联代码 | StarterKit.Code | `` `code` `` |
| 代码块 | MarkdownCodeBlock | ```` ```lang\ncode\n``` ```` |
| 链接 | Extension.Link | `[title](url)` |
| 图片 | Extension.Image | `![alt](url)` |
| H1/H2 | StarterKit.Heading | `# ` / `## ` |
| @提及 | Extension.Mention | `@username` |

---

## 7. 文件影响范围

### 新建
- `packages/editor/` — 完整新包
- `apps/web/components/comments/dialogs/image-dialog.tsx`
- `apps/web/components/comments/dialogs/link-dialog.tsx`
- `apps/web/components/comments/dialogs/code-dialog.tsx`

### 修改
- `apps/web/components/comments/comment-input.tsx` — 替换为 `RichEditor` + 三个对话框组合
- `apps/web/package.json` — 添加 `@repo/editor: workspace:*`
- `packages/editor/package.json` — 新包配置（name, exports, peerDeps）
- `pnpm-workspace.yaml` — 确认 packages/editor 在 workspace 内（通常已覆盖）

### 测试（必须同步）
- `packages/editor/src/RichEditor.test.tsx`
- `packages/editor/src/extensions/underline.test.ts`
- `apps/web/components/comments/dialogs/*.test.tsx`
- `apps/web/components/comments/comment-input.test.tsx` — 更新

---

## 8. 响应式策略汇总

| 断点 | 编辑区 | 工具栏 | 对话框 |
|------|--------|--------|--------|
| `< sm`（手机） | 全宽，min-h 60px | 横向可滚动，发送按钮固定右 | 底部 Sheet |
| `sm – md`（平板） | 全宽 | 单行展示，gap-1 | 居中 Modal |
| `md +`（桌面） | max-w-[720px] 内展示 | 单行展示，gap-1.5 | 居中 Modal |

---

## 9. 不在本次范围内

- Emoji 选择器（未在需求列表中）
- 图片文件上传（仅 URL 输入，文件上传为 admin 场景预留）
- @提及后端用户搜索（API 待实现）
- modal layout 同步升级（后续单独迭代）
