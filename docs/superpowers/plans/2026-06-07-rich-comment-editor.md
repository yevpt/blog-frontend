# Rich Comment Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `packages/editor` 新建 Tiptap v3 WYSIWYG 富文本编辑器包，并在文章详情页评论区（inline layout）替换原有 `<input>`。

**Architecture:** 新建 `@repo/editor` 包，核心是 `RichEditor` 组件（Tiptap v3 + tiptap-markdown）。插入行为（图片/链接/代码）通过 props 注入，使评论场景（URL 对话框）和未来 admin 场景（文件上传）复用同一组件。`apps/web` 新增 `RichCommentInput` 组合 RichEditor 与三个对话框，在 `CommentSection` inline layout 中替换原有 `CommentInput`。

**Tech Stack:** Tiptap v3.26.0, tiptap-markdown 0.9.0, @tiptap/starter-kit, @tiptap/extension-image, @tiptap/extension-mention, React 19, TailwindCSS, @repo/ui, @repo/icons

---

## 文件索引

### 新建
| 文件 | 职责 |
|------|------|
| `packages/editor/package.json` | 包配置，name: @repo/editor |
| `packages/editor/tsconfig.json` | TS 配置，extends @repo/typescript-config/react |
| `packages/editor/vitest.config.ts` | 测试配置，happy-dom 环境 |
| `packages/editor/src/types.ts` | 所有对外 interface（InsertHandlers、MentionItem、RichEditorProps） |
| `packages/editor/src/extensions/underline.ts` | 下划线扩展（教科书注释 + 追溯说明） |
| `packages/editor/src/extensions/mention.ts` | @提及扩展（stub 候选列表，预留 API 接口） |
| `packages/editor/src/hooks/use-rich-editor.ts` | 封装 useEditor()，管理所有扩展实例 |
| `packages/editor/src/toolbar/ToolbarButton.tsx` | 工具栏单按钮（active 态、disabled 态） |
| `packages/editor/src/toolbar/Toolbar.tsx` | 底部工具栏（响应式横向滚动） |
| `packages/editor/src/RichEditor.tsx` | 主组件，教科书注释 + 响应式说明 |
| `packages/editor/src/index.ts` | 公开 API |
| `packages/editor/src/__tests__/underline.test.ts` | underline 扩展单元测试 |
| `packages/editor/src/__tests__/RichEditor.test.tsx` | RichEditor 组件集成测试 |
| `packages/icons/svg/link.svg` | 链接图标 |
| `packages/icons/svg/image.svg` | 图片图标 |
| `packages/icons/svg/code-block.svg` | 代码块图标 |
| `packages/icons/svg/at.svg` | @提及图标 |
| `apps/web/components/comments/dialogs/image-dialog.tsx` | 图片插入对话框（URL + alt） |
| `apps/web/components/comments/dialogs/link-dialog.tsx` | 链接插入对话框（URL + title） |
| `apps/web/components/comments/dialogs/code-dialog.tsx` | 代码块对话框（code + language） |
| `apps/web/components/comments/dialogs/image-dialog.test.tsx` | ImageDialog 测试 |
| `apps/web/components/comments/dialogs/link-dialog.test.tsx` | LinkDialog 测试 |
| `apps/web/components/comments/dialogs/code-dialog.test.tsx` | CodeDialog 测试 |
| `apps/web/components/comments/rich-comment-input.tsx` | RichEditor + 三个对话框的组合组件 |
| `apps/web/components/comments/rich-comment-input.test.tsx` | RichCommentInput 测试 |

### 修改
| 文件 | 改动 |
|------|------|
| `apps/web/package.json` | 添加 `"@repo/editor": "workspace:*"` |
| `apps/web/components/comments/comment-section.tsx` | inline layout 改用 RichCommentInput |
| `apps/web/components/comments/comment-section.test.tsx` | 更新测试 |
| `apps/web/lib/markdown.ts` | rehype-sanitize 允许 `<u>` 标签 |
| `apps/web/next.config.ts`（或 `next.config.js`） | transpilePackages 添加 @repo/editor |

---

## Task 1: 包脚手架

**Files:**
- Create: `packages/editor/package.json`
- Create: `packages/editor/tsconfig.json`
- Create: `packages/editor/vitest.config.ts`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p packages/editor/src/{extensions,hooks,toolbar,__tests__}
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "@repo/editor",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    }
  },
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest",
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "@tiptap/react": "^3.26.0",
    "@tiptap/pm": "^3.26.0",
    "@tiptap/starter-kit": "^3.26.0",
    "@tiptap/extension-underline": "^3.26.0",
    "@tiptap/extension-image": "^3.26.0",
    "@tiptap/extension-mention": "^3.26.0",
    "@tiptap/suggestion": "^3.26.0",
    "tiptap-markdown": "^0.9.0",
    "@repo/icons": "workspace:*",
    "@repo/ui": "workspace:*",
    "clsx": "^2.1.1"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "vitest": "^4.1.7",
    "@vitejs/plugin-react": "^6.0.2"
  }
}
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "extends": "@repo/typescript-config/react",
  "compilerOptions": {
    "types": ["react", "@testing-library/jest-dom", "vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建 vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "editor",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
  },
});
```

- [ ] **Step 5: 创建测试 setup 文件**

`packages/editor/src/__tests__/setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";

// Tiptap / ProseMirror 在测试环境中需要 getSelection 和 createRange
// happy-dom 未实现这些 API，此处提供最小 stub
if (typeof document !== "undefined") {
  if (!document.getSelection) {
    document.getSelection = () => null;
  }
  if (!document.createRange) {
    document.createRange = () =>
      ({
        setStart: () => {},
        setEnd: () => {},
        commonAncestorContainer: document.body,
      }) as unknown as Range;
  }
}
```

- [ ] **Step 6: 创建空的 src/index.ts（占位，后续填充）**

```typescript
// 公开 API — 在各 Task 完成后逐步填充
export type {} from "./types";
```

- [ ] **Step 7: 验证包在 workspace 中可识别**

```bash
pnpm install
pnpm ls --filter @repo/editor
```

期望输出包含 `@repo/editor` 条目，无报错。

- [ ] **Step 8: Commit**

```bash
git add packages/editor/
git commit -m "chore(editor): 初始化 @repo/editor 包脚手架"
```

---

## Task 2: 添加缺失 SVG 图标

**Files:**
- Create: `packages/icons/svg/link.svg`
- Create: `packages/icons/svg/image.svg`
- Create: `packages/icons/svg/code-block.svg`
- Create: `packages/icons/svg/at.svg`

- [ ] **Step 1: 添加 link.svg**

`packages/icons/svg/link.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
</svg>
```

- [ ] **Step 2: 添加 image.svg**

`packages/icons/svg/image.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
  <circle cx="8.5" cy="8.5" r="1.5"/>
  <polyline points="21 15 16 10 5 21"/>
</svg>
```

- [ ] **Step 3: 添加 code-block.svg**

`packages/icons/svg/code-block.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 18 22 12 16 6"/>
  <polyline points="8 6 2 12 8 18"/>
</svg>
```

- [ ] **Step 4: 添加 at.svg**

`packages/icons/svg/at.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="4"/>
  <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
</svg>
```

- [ ] **Step 5: 重新构建 icons 包，生成 sprite 和类型**

```bash
pnpm --filter @repo/icons build
```

期望：无报错，`packages/icons/` 下的生成文件更新，新增 `link`、`image`、`code-block`、`at` 条目。

- [ ] **Step 6: 验证新图标类型可用**

在任意文件临时写入下列代码并检查类型（然后删除）：
```typescript
import { SvgIcon } from "@repo/icons";
// 若以下无 TS 报错则说明图标类型生成成功
const _test = <SvgIcon name="link" />;
const _test2 = <SvgIcon name="image" />;
const _test3 = <SvgIcon name="code-block" />;
const _test4 = <SvgIcon name="at" />;
```

- [ ] **Step 7: Commit**

```bash
git add packages/icons/svg/ packages/icons/
git commit -m "feat(icons): 添加 link / image / code-block / at 图标"
```

---

## Task 3: 类型定义

**Files:**
- Create: `packages/editor/src/types.ts`

- [ ] **Step 1: 编写类型定义**

`packages/editor/src/types.ts`:
```typescript
/**
 * ================================================================
 * @repo/editor — 公共类型定义
 * ================================================================
 *
 * 设计原则：RichEditor 不感知"数据从哪里来"。
 * InsertHandlers 中的每个 handler 接收一个 insert 回调，
 * 调用方决定如何获取数据，然后调用 insert() 将内容插入编辑器。
 *
 * 评论场景：handler 打开 URL 对话框 → 用户填写 → 调用 insert()
 * 文章编辑器场景（未来）：handler 打开文件选择 → 上传到 OSS → 调用 insert()
 * ================================================================
 */

/**
 * 图片、链接、代码块的插入行为注入接口。
 * 三者均为可选：未提供时，对应工具栏按钮不渲染。
 */
export interface InsertHandlers {
  /**
   * 工具栏点击图片按钮时触发。
   * @param insert 将图片插入编辑器的函数，url 必填，alt 可选
   * @example
   * onInsertImage={(insert) => {
   *   openImageDialog((url, alt) => insert(url, alt));
   * }}
   */
  onInsertImage?: (insert: (url: string, alt?: string) => void) => void;

  /**
   * 工具栏点击链接按钮时触发。
   * @param insert 将链接插入编辑器的函数，url 必填，title 可选
   */
  onInsertLink?: (insert: (url: string, title?: string) => void) => void;

  /**
   * 工具栏点击代码块按钮时触发。
   * @param insert 将代码块插入编辑器的函数，code 必填，lang 必填（可传 "plain"）
   */
  onInsertCode?: (insert: (code: string, lang: string) => void) => void;
}

/**
 * @提及候选项。
 * 由调用方传入；后端用户搜索 API 就绪后用真实数据替换。
 */
export interface MentionItem {
  /** 用户唯一标识，存储在 ProseMirror 节点的 data-id 属性中 */
  id: string;
  /** 显示名称：下拉列表展示，序列化为 @label */
  label: string;
}

/** RichEditor 组件完整 props */
export interface RichEditorProps extends InsertHandlers {
  /**
   * 受控 Markdown 字符串。
   * 仅在 editor 首次创建时作为初始内容读取；
   * 后续变更通过 onChange 通知父组件，父组件不需要将更新后的值再传回。
   */
  value: string;

  /** 每次编辑器内容变化时触发，参数为当前 Markdown 字符串 */
  onChange: (markdown: string) => void;

  placeholder?: string;

  /** 禁用编辑器（如提交中）时传 true */
  disabled?: boolean;

  /**
   * @提及候选列表。
   * 当前为空（等待后端 /users/search API）；
   * 有数据时自动展示下拉列表。
   */
  mentionSuggestions?: MentionItem[];

  /** 工具栏发送按钮点击回调 */
  onSubmit?: () => void;

  /** 发送中状态，传 true 时发送按钮显示 loading 并禁用 */
  isSubmitting?: boolean;

  className?: string;
}
```

- [ ] **Step 2: 更新 index.ts 导出**

`packages/editor/src/index.ts`:
```typescript
export type { InsertHandlers, MentionItem, RichEditorProps } from "./types";
```

- [ ] **Step 3: 检查类型编译**

```bash
pnpm --filter @repo/editor check-types
```

期望：0 errors。

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/types.ts packages/editor/src/index.ts
git commit -m "feat(editor): 定义 InsertHandlers / MentionItem / RichEditorProps 类型"
```

---

## Task 4: Underline 扩展（教科书注释）

**Files:**
- Create: `packages/editor/src/extensions/underline.ts`
- Create: `packages/editor/src/__tests__/underline.test.ts`

- [ ] **Step 1: 先写失败测试**

`packages/editor/src/__tests__/underline.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { UnderlineExtension } from "../extensions/underline";

/**
 * 验证 UnderlineExtension 的核心行为：
 * 1. 可在编辑器中注册（不与 StarterKit 冲突）
 * 2. toggleUnderline 命令可正常调用
 * 3. 序列化为 <u>text</u>（Markdown 内联 HTML）
 */
describe("UnderlineExtension", () => {
  function makeEditor(content = "<p>hello</p>") {
    return new Editor({
      element: document.createElement("div"),
      extensions: [
        StarterKit.configure({ underline: false }),
        UnderlineExtension,
        Markdown.configure({ html: true }),
      ],
      content,
    });
  }

  it("注册后 toggleUnderline 命令存在", () => {
    const editor = makeEditor();
    expect(typeof editor.commands.toggleUnderline).toBe("function");
    editor.destroy();
  });

  it("对选中文本应用下划线后序列化为 <u>text</u>", () => {
    const editor = makeEditor("<p>hello</p>");
    // 选中全部文本
    editor.commands.selectAll();
    editor.commands.toggleUnderline();
    const md = editor.storage.markdown.getMarkdown();
    expect(md).toContain("<u>hello</u>");
    editor.destroy();
  });

  it("再次 toggle 可取消下划线", () => {
    const editor = makeEditor("<p>hello</p>");
    editor.commands.selectAll();
    editor.commands.toggleUnderline();
    editor.commands.toggleUnderline();
    const md = editor.storage.markdown.getMarkdown();
    expect(md).not.toContain("<u>");
    editor.destroy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/editor test
```

期望：FAIL，报 `Cannot find module '../extensions/underline'`。

- [ ] **Step 3: 实现 underline.ts**

`packages/editor/src/extensions/underline.ts`:
```typescript
/**
 * ================================================================
 * Underline Extension — RichEditor 下划线扩展
 * ================================================================
 *
 * 【为什么单独封装，而不直接用 StarterKit 内置的 underline】
 * StarterKit v3 已内置 @tiptap/extension-underline。
 * 但本文件将其显式封装并重导出，原因：
 *   1. 可追溯：grep UnderlineExtension 即可找到所有下划线相关决策
 *   2. 统一序列化约定（见下方数据流说明）
 *   3. 扩展点：未来如需修改行为，只改此文件
 *
 * 在 use-rich-editor.ts 中使用时：
 *   StarterKit.configure({ underline: false }) + UnderlineExtension
 * 而不是直接让 StarterKit 启用内置版本，目的是让扩展列表明确可见。
 *
 * 【数据流（从用户操作到存储）】
 *   Ctrl+U 或工具栏按钮
 *     → editor.chain().focus().toggleUnderline().run()
 *     → Tiptap 在 ProseMirror doc 中标记 `underline` mark
 *     → tiptap-markdown（html: true）序列化为 <u>text</u>
 *     → 提交到后端，存储为 Markdown 字符串中的内联 HTML
 *     → apps/web/lib/markdown.ts 的 rehype-sanitize 需允许 <u> 标签
 *       （见 Task 17 对 sanitize 配置的修改）
 *
 * 【Markdown 标准说明】
 * CommonMark / GFM 均不包含下划线语法。
 * <u>text</u> 是合法的 Markdown 内联 HTML，大多数渲染器支持。
 * 下划线在 web 排版中常与超链接混淆，请在评论 UI 中酌情引导用户。
 *
 * 【未来自定义示例】
 * 如需修改序列化格式（如改为 ++text++），在此处替换：
 *   import Underline from "@tiptap/extension-underline";
 *   export const UnderlineExtension = Underline.extend({
 *     // 自定义 parseHTML / renderHTML / addInputRules
 *   });
 * ================================================================
 */
import Underline from "@tiptap/extension-underline";

/**
 * 下划线扩展。
 * 当前直接重导出官方扩展；扩展点保留在本文件中（见上方注释）。
 */
export const UnderlineExtension = Underline;
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/editor test
```

期望：3 tests PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/extensions/underline.ts packages/editor/src/__tests__/underline.test.ts
git commit -m "feat(editor): 添加 UnderlineExtension（教科书注释，含追溯说明）"
```

---

## Task 5: Mention 扩展

**Files:**
- Create: `packages/editor/src/extensions/mention.ts`

- [ ] **Step 1: 实现 mention.ts**

`packages/editor/src/extensions/mention.ts`:
```typescript
/**
 * ================================================================
 * Mention Extension — @提及扩展
 * ================================================================
 *
 * 【当前状态：UI 完整，数据为 stub】
 * 输入 @ 后会弹出候选列表，但候选数据由外部传入（当前为空数组）。
 * 原因：后端缺少用户搜索接口（packages/api 目前只有 getMe）。
 *
 * TODO(mention-api): 后端提供 GET /users/search?q={query} 后：
 *   1. 在 apps/web/components/comments/rich-comment-input.tsx 中
 *      用防抖 fetch 填充 mentionSuggestions prop
 *   2. RichEditor 无需修改，候选列表自动展示
 *
 * 【序列化约定】
 * mention 节点 → Markdown 纯文本 "@label"
 * 通过 renderText 选项实现，保持 Markdown 可读性。
 *
 * 【Tiptap Suggestion 机制简介（教学用）】
 * @tiptap/suggestion 监听触发字符（此处为 "@"），捕获后续输入作为 query，
 * 调用 items({ query }) 获取候选列表，再通过 render() 返回的生命周期
 * 函数控制下拉 UI（onStart/onUpdate/onKeyDown/onExit）。
 * ================================================================
 */
import Mention from "@tiptap/extension-mention";
import type { MentionItem } from "../types";

/**
 * 创建 Mention 扩展实例。
 * @param suggestions 候选用户列表（由父组件传入，默认空数组）
 */
export function createMentionExtension(suggestions: MentionItem[]) {
  return Mention.configure({
    HTMLAttributes: {
      // mention 节点在编辑器中的样式类，可通过全局 CSS 定制
      class: "rich-editor-mention",
    },

    /**
     * mention 节点在 Markdown 中的纯文本表示。
     * node.attrs.label 是选中时存储的显示名，node.attrs.id 是唯一标识。
     */
    renderText({ node }) {
      return `@${node.attrs.label ?? node.attrs.id}`;
    },

    suggestion: {
      /**
       * 根据用户输入过滤候选列表。
       * query 是用户在 @ 后继续输入的文字。
       * 最多返回 8 条，避免下拉列表过长。
       */
      items: ({ query }: { query: string }) =>
        suggestions
          .filter((item) =>
            item.label.toLowerCase().startsWith(query.toLowerCase()),
          )
          .slice(0, 8),

      /**
       * 下拉 UI 生命周期。
       * 返回 { onStart, onUpdate, onKeyDown, onExit } 四个钩子。
       * 此处使用轻量 DOM 实现，不引入额外依赖。
       * 未来可替换为基于 @tiptap/react ReactRenderer 的 React 组件实现。
       */
      render: () => {
        let dropdown: HTMLElement | null = null;

        /** 根据光标位置定位下拉 div */
        function position(rect: DOMRect | null | undefined) {
          if (!dropdown || !rect) return;
          Object.assign(dropdown.style, {
            top: `${rect.bottom + window.scrollY + 4}px`,
            left: `${rect.left + window.scrollX}px`,
          });
        }

        /** 用候选列表填充下拉 div */
        function populate(
          items: MentionItem[],
          command: (item: MentionItem) => void,
        ) {
          if (!dropdown) return;
          dropdown.innerHTML = "";
          items.forEach((item) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = `@${item.label}`;
            Object.assign(btn.style, {
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 12px",
              fontSize: "13px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: "4px",
              color: "inherit",
            });
            btn.addEventListener("mouseenter", () => {
              btn.style.background = "var(--primary, #3b82f6)";
              btn.style.color = "white";
            });
            btn.addEventListener("mouseleave", () => {
              btn.style.background = "transparent";
              btn.style.color = "inherit";
            });
            // mousedown 而非 click：在 blur 前触发，避免编辑器失焦取消选择
            btn.addEventListener("mousedown", (e) => {
              e.preventDefault();
              command(item);
            });
            dropdown!.appendChild(btn);
          });
        }

        return {
          onStart(props: {
            items: MentionItem[];
            command: (item: MentionItem) => void;
            clientRect: (() => DOMRect | null) | null;
          }) {
            if (props.items.length === 0) return;
            dropdown = document.createElement("div");
            Object.assign(dropdown.style, {
              position: "absolute",
              zIndex: "9999",
              background: "var(--background, #fff)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: "8px",
              padding: "4px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              minWidth: "160px",
            });
            populate(props.items, props.command);
            position(props.clientRect?.());
            document.body.appendChild(dropdown);
          },

          onUpdate(props: {
            items: MentionItem[];
            command: (item: MentionItem) => void;
            clientRect: (() => DOMRect | null) | null;
          }) {
            if (!dropdown) return;
            if (props.items.length === 0) {
              dropdown.remove();
              dropdown = null;
              return;
            }
            populate(props.items, props.command);
            position(props.clientRect?.());
          },

          // 简化实现：不处理键盘导航，返回 false 让 Tiptap 继续处理
          onKeyDown: () => false,

          onExit() {
            dropdown?.remove();
            dropdown = null;
          },
        };
      },
    },
  });
}
```

- [ ] **Step 2: Commit（mention 扩展无单独单元测试，在 RichEditor 集成测试中覆盖）**

```bash
git add packages/editor/src/extensions/mention.ts
git commit -m "feat(editor): 添加 Mention 扩展（stub 候选列表，预留后端 API 接口）"
```

---

## Task 6: useRichEditor Hook

**Files:**
- Create: `packages/editor/src/hooks/use-rich-editor.ts`

- [ ] **Step 1: 实现 hook**

`packages/editor/src/hooks/use-rich-editor.ts`:
```typescript
/**
 * ================================================================
 * useRichEditor — Tiptap 编辑器实例创建 Hook
 * ================================================================
 *
 * 【职责】
 * 集中管理所有 Tiptap 扩展的配置，作为 RichEditor 组件的数据层。
 * RichEditor 只负责渲染，本 hook 负责"编辑器能做什么"。
 *
 * 【扩展清单（按功能分组）】
 *
 * ① StarterKit（套件，包含大多数基础格式）
 *    - Bold, Italic, Strike, Code, CodeBlock, Link, Heading (H1-H6)
 *    - BulletList, OrderedList, Paragraph, Document, HardBreak
 *    - 注意：underline: false，由 UnderlineExtension 单独引入（可追溯）
 *
 * ② UnderlineExtension（显式引入，见 extensions/underline.ts）
 *
 * ③ Markdown（tiptap-markdown）
 *    - 双向 Markdown ↔ Tiptap JSON 转换
 *    - html: true 允许 <u>text</u> 等内联 HTML 通过序列化
 *
 * ④ Image（@tiptap/extension-image）
 *    - inline: true：图片可嵌入段落（适合评论）
 *    - allowBase64: false：安全考虑，不允许 base64 图片
 *
 * ⑤ Mention（@tiptap/extension-mention，见 extensions/mention.ts）
 *    - 候选数据由外部传入；当前为空数组（等待后端 API）
 *
 * 【SSR 注意】
 * immediatelyRender: false 是 Next.js 环境的必要配置。
 * ProseMirror 需要真实 DOM 才能初始化，在服务端渲染阶段不存在 DOM，
 * 此选项告诉 Tiptap 延迟到客户端 hydration 后再创建编辑器实例，
 * 避免 React hydration 报错（服务端 HTML 与客户端渲染不匹配）。
 * ================================================================
 */
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Image from "@tiptap/extension-image";
import { UnderlineExtension } from "../extensions/underline";
import { createMentionExtension } from "../extensions/mention";
import type { MentionItem } from "../types";

interface UseRichEditorOptions {
  initialValue: string;
  onChange: (markdown: string) => void;
  mentionSuggestions: MentionItem[];
  placeholder?: string;
  disabled?: boolean;
}

export function useRichEditor({
  initialValue,
  onChange,
  mentionSuggestions,
  disabled = false,
}: UseRichEditorOptions) {
  return useEditor(
    {
      // ── SSR 适配 ─────────────────────────────────────────────
      // Next.js 在服务端渲染时无 DOM，必须设为 false 避免 hydration 错误
      immediatelyRender: false,

      // ── 扩展列表 ──────────────────────────────────────────────
      extensions: [
        // ① StarterKit：基础格式套件
        StarterKit.configure({
          // 下划线由 UnderlineExtension 单独引入（保持可追溯），禁用内置版本
          underline: false,

          // 链接：不在点击时打开（编辑器内保留编辑能力），新标签页打开
          link: {
            openOnClick: false,
            HTMLAttributes: {
              rel: "noopener noreferrer",
              target: "_blank",
            },
          },

          // 代码块：添加样式类供 CSS 定制
          codeBlock: {
            HTMLAttributes: { class: "rich-editor-code-block" },
          },

          // 评论场景不需要以下扩展（减少包体积）
          blockquote: false,
          horizontalRule: false,
        }),

        // ② 下划线（显式引入，见 extensions/underline.ts 追溯说明）
        UnderlineExtension,

        // ③ Markdown 序列化
        // html: true 是关键：允许 <u>text</u> 这类内联 HTML 在序列化时保留
        Markdown.configure({
          html: true,
          tightLists: true,
          bulletListMarker: "-",
          // 粘贴 Markdown 文本时自动解析为富文本格式
          transformPastedText: true,
        }),

        // ④ 图片（内联，仅 URL，不允许 base64）
        Image.configure({
          inline: true,
          allowBase64: false,
          HTMLAttributes: {
            class: "rich-editor-image",
            style: "max-width: 100%; height: auto; border-radius: 4px;",
          },
        }),

        // ⑤ @提及（候选列表由外部传入）
        // TODO(mention-api): 后端 /users/search 就绪后，在调用方填充 mentionSuggestions
        createMentionExtension(mentionSuggestions),
      ],

      // ── 初始内容 ──────────────────────────────────────────────
      // Markdown 扩展自动将字符串解析为 Tiptap 内部 JSON 格式
      // 注意：content 仅在 editor 首次创建时读取，后续通过 onUpdate 回调同步
      content: initialValue,

      editable: !disabled,

      // ── 内容变更回调 ──────────────────────────────────────────
      // editor.storage.markdown.getMarkdown() 由 tiptap-markdown 扩展提供，
      // 将当前 ProseMirror 文档序列化为 Markdown 字符串
      onUpdate: ({ editor }) => {
        onChange(editor.storage.markdown.getMarkdown());
      },
    },
    // deps 数组：mentionSuggestions 变化时重建 editor（用于动态候选列表）
    [mentionSuggestions],
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/editor/src/hooks/use-rich-editor.ts
git commit -m "feat(editor): 实现 useRichEditor hook（SSR 适配 + 扩展教学注释）"
```

---

## Task 7: ToolbarButton 组件

**Files:**
- Create: `packages/editor/src/toolbar/ToolbarButton.tsx`

- [ ] **Step 1: 实现组件**

`packages/editor/src/toolbar/ToolbarButton.tsx`:
```tsx
/**
 * ToolbarButton — 工具栏单个按钮
 *
 * 支持两种内容：
 * - icon：传 SvgIcon name，渲染图标按钮
 * - label：传文字（如 "B" / "I" / "U"），渲染文字按钮
 *
 * active 态：按钮对应的格式当前已应用（如选中文字已加粗）
 * disabled 态：编辑器不可用或命令不可执行
 */
import { SvgIcon, type IconName } from "@repo/icons";
import { clsx } from "clsx";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string; // 无障碍 aria-label 和 tooltip
  /** 图标模式：传 @repo/icons 中的图标名 */
  icon?: IconName;
  /** 文字模式：传短字符（"B" / "I" / "U" / "@"） */
  label?: string;
  /** 文字按钮附加样式（如 font-bold / italic / underline） */
  labelClassName?: string;
}

export function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  icon,
  label,
  labelClassName,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // 阻止编辑器失焦：工具栏按钮点击不应触发 blur
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      aria-label={title}
      title={title}
      className={clsx(
        // 基础样式
        "flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors",
        // 状态样式
        active
          ? "bg-primary/10 text-primary"
          : "text-(--fg2) hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {icon ? (
        <SvgIcon name={icon} size={15} />
      ) : (
        <span className={clsx("select-none text-[13px] font-medium leading-none", labelClassName)}>
          {label}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/editor/src/toolbar/ToolbarButton.tsx
git commit -m "feat(editor): 实现 ToolbarButton（图标/文字双模式，active 态）"
```

---

## Task 8: Toolbar 组件

**Files:**
- Create: `packages/editor/src/toolbar/Toolbar.tsx`

- [ ] **Step 1: 实现 Toolbar**

`packages/editor/src/toolbar/Toolbar.tsx`:
```tsx
/**
 * Toolbar — 底部工具栏
 *
 * 【布局】
 * [ B ][ I ][ U ][ ─ ][ 🔗 ][ 🖼 ][ </> ][ @ ]   →→→   [ 发送 ↑ ]
 * 左侧格式按钮区（横向可滚动）            固定右侧发送按钮
 *
 * 【响应式策略】
 * - sm 以下（手机）：左侧按钮区 overflow-x-auto，允许横向滚动，
 *   scrollbar-none 隐藏滚动条，发送按钮始终在右侧不参与滚动
 * - sm 及以上（平板/桌面）：工具栏单行展示，不需要滚动
 *
 * 【交互细节】
 * - 所有按钮 onMouseDown 阻止 preventDefault，保持编辑器焦点
 * - 可选项（image/link/code）未提供 handler 时按钮不渲染
 *
 * 【响应式原理】
 * 工具栏容器 flex，左侧区域 min-w-0 + overflow-x-auto 实现缩放时滚动，
 * 右侧发送按钮 flex-shrink-0 确保始终可见。
 */
import type { Editor } from "@tiptap/core";
import { SvgIcon } from "@repo/icons";
import { clsx } from "clsx";
import { ToolbarButton } from "./ToolbarButton";
import type { InsertHandlers } from "../types";

interface ToolbarProps extends InsertHandlers {
  editor: Editor | null;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export function Toolbar({
  editor,
  onSubmit,
  isSubmitting,
  onInsertImage,
  onInsertLink,
  onInsertCode,
}: ToolbarProps) {
  if (!editor) return null;

  const disabled = !editor.isEditable;

  return (
    <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
      {/*
       * 左侧格式按钮区
       * - min-w-0：允许 flex 子项压缩（防止撑破父容器）
       * - overflow-x-auto scrollbar-none：手机端横向滚动，隐藏滚动条
       * - sm:overflow-x-visible：平板及以上无需滚动
       */}
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none sm:overflow-x-visible">
        {/* 格式按钮：B / I / U */}
        <ToolbarButton
          title="粗体（Ctrl+B）"
          label="B"
          labelClassName="font-bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="斜体（Ctrl+I）"
          label="I"
          labelClassName="italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title="下划线（Ctrl+U）"
          label="U"
          labelClassName="underline underline-offset-1"
          active={editor.isActive("underline")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />

        {/* 分隔线 */}
        <div className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />

        {/* 操作按钮：Link / Image / Code / @ */}
        {onInsertLink && (
          <ToolbarButton
            title="插入链接"
            icon="link"
            disabled={disabled}
            onClick={() => {
              onInsertLink((url, title) => {
                if (title) {
                  editor
                    .chain()
                    .focus()
                    .insertContent(`[${title}](${url})`)
                    .run();
                } else {
                  editor
                    .chain()
                    .focus()
                    .setLink({ href: url })
                    .run();
                }
              });
            }}
          />
        )}

        {onInsertImage && (
          <ToolbarButton
            title="插入图片"
            icon="image"
            disabled={disabled}
            onClick={() => {
              onInsertImage((url, alt) => {
                editor.chain().focus().setImage({ src: url, alt: alt ?? "" }).run();
              });
            }}
          />
        )}

        {onInsertCode && (
          <ToolbarButton
            title="插入代码块"
            icon="code-block"
            disabled={disabled}
            onClick={() => {
              onInsertCode((code, lang) => {
                editor
                  .chain()
                  .focus()
                  .setCodeBlock({ language: lang })
                  .insertContent(code)
                  .run();
              });
            }}
          />
        )}

        <ToolbarButton
          title="@提及用户"
          icon="at"
          disabled={disabled}
          onClick={() => {
            // 触发 mention suggestion：插入 @ 字符，suggestion 机制自动接管
            editor.chain().focus().insertContent("@").run();
          }}
        />
      </div>

      {/* 右侧发送按钮（固定，不参与滚动） */}
      {onSubmit && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          disabled={isSubmitting || disabled}
          aria-label="发送评论"
          className={clsx(
            "ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
            isSubmitting || disabled
              ? "cursor-not-allowed opacity-40 bg-primary/50"
              : "bg-primary text-white hover:bg-primary/85",
          )}
        >
          <SvgIcon name="arrow-up" size={14} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/editor/src/toolbar/Toolbar.tsx
git commit -m "feat(editor): 实现 Toolbar（响应式横向滚动 + 可选操作按钮）"
```

---

## Task 9: RichEditor 主组件

**Files:**
- Create: `packages/editor/src/RichEditor.tsx`
- Create: `packages/editor/src/__tests__/RichEditor.test.tsx`

- [ ] **Step 1: 先写失败测试**

`packages/editor/src/__tests__/RichEditor.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichEditor } from "../RichEditor";

describe("RichEditor", () => {
  it("渲染不崩溃，EditorContent 挂载成功", () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} />,
    );
    // Tiptap EditorContent 会渲染一个 contenteditable div
    expect(container.querySelector("[contenteditable]")).toBeTruthy();
  });

  it("传入 placeholder 时在编辑器上有对应 data-placeholder 属性", () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} placeholder="写下你的评论..." />,
    );
    const el = container.querySelector("[data-placeholder]");
    expect(el?.getAttribute("data-placeholder")).toBe("写下你的评论...");
  });

  it("disabled=true 时 contenteditable 为 false", () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} disabled />,
    );
    const ce = container.querySelector("[contenteditable]");
    expect(ce?.getAttribute("contenteditable")).toBe("false");
  });

  it("onSubmit 存在时渲染发送按钮", () => {
    render(
      <RichEditor value="" onChange={() => {}} onSubmit={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "发送评论" })).toBeInTheDocument();
  });

  it("onInsertImage 未提供时不渲染图片按钮", () => {
    render(<RichEditor value="" onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "插入图片" })).toBeNull();
  });

  it("onInsertImage 提供时渲染图片按钮并触发 handler", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    render(
      <RichEditor value="" onChange={() => {}} onInsertImage={handler} />,
    );
    const btn = screen.getByRole("button", { name: "插入图片" });
    await user.click(btn);
    expect(handler).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter @repo/editor test
```

期望：FAIL，报 `Cannot find module '../RichEditor'`。

- [ ] **Step 3: 实现 RichEditor.tsx**

`packages/editor/src/RichEditor.tsx`:
```tsx
/**
 * ================================================================
 * RichEditor — Tiptap v3 WYSIWYG 富文本编辑器
 * ================================================================
 *
 * 【组件职责】
 * 将 Tiptap 编辑器实例（来自 useRichEditor hook）渲染为可交互的 UI。
 * 不处理任何业务逻辑——内容存储、插入行为均通过 props 注入。
 *
 * 【布局结构】
 * ┌─────────────────────────────────────────────────┐
 * │ 编辑区（EditorContent）                          │
 * │ - min-h: 80px，max-h: 240px，超出内部滚动        │
 * │ - prose 样式：标题/粗体/下划线在此即时渲染        │
 * ├─────────────────────────────────────────────────┤
 * │ 工具栏（Toolbar）                                │
 * │ [B][I][U][─][🔗][🖼][</>][@]          [↑发送]  │
 * └─────────────────────────────────────────────────┘
 *
 * 【响应式】
 * - 编辑区：全宽，高度自动增长至 max-h-60（240px）
 * - 工具栏：sm 以下按钮区横向可滚动（见 Toolbar.tsx 注释）
 * - 整体容器：由父组件决定宽度（不设定 max-w）
 *
 * 【Tiptap EditorContent 说明】
 * EditorContent 渲染一个 contenteditable div，Tiptap 内部管理 DOM 更新。
 * React 不控制其子节点（ProseMirror 接管），因此样式通过 CSS 类名注入，
 * 而非 JSX children。
 *
 * 【placeholder 实现】
 * Tiptap 通过 StarterKit 内置的 Placeholder 扩展实现。
 * 此处通过全局 CSS（见 RichEditor 容器的 [&_.tiptap]:before 选择器）
 * 将 editor.options.editorProps.attributes["data-placeholder"] 渲染为伪元素。
 * ================================================================
 */
"use client";

import { EditorContent } from "@tiptap/react";
import { clsx } from "clsx";
import { useRichEditor } from "./hooks/use-rich-editor";
import { Toolbar } from "./toolbar/Toolbar";
import type { RichEditorProps } from "./types";

export function RichEditor({
  value,
  onChange,
  placeholder = "写下你的内容...",
  disabled = false,
  mentionSuggestions = [],
  onSubmit,
  isSubmitting,
  onInsertImage,
  onInsertLink,
  onInsertCode,
  className,
}: RichEditorProps) {
  const editor = useRichEditor({
    initialValue: value,
    onChange,
    mentionSuggestions,
    placeholder,
    disabled,
  });

  return (
    <div
      className={clsx(
        // 容器：圆角边框，聚焦时高亮边框
        "overflow-hidden rounded-xl border border-border transition-colors",
        // 聚焦环：通过子元素 :focus-within 实现（EditorContent 内有 contenteditable）
        "focus-within:border-primary",
        disabled && "opacity-60",
        className,
      )}
    >
      {/*
       * 编辑区
       * [&_.tiptap] 是 Tailwind 任意变体，精准选中 Tiptap 渲染的 .tiptap 元素。
       * prose：启用 @tailwindcss/typography 排版样式，使标题/粗体/代码在编辑中即时渲染。
       * 响应式说明：
       *   - min-h-[80px]：确保空状态下编辑区有足够点击区域
       *   - max-h-60 overflow-y-auto：超长内容在编辑区内滚动，不撑开页面
       *   - sm:max-h-80：平板及以上允许更高的编辑区
       */}
      <div
        className={clsx(
          "[&_.tiptap]:min-h-[80px] [&_.tiptap]:max-h-60 [&_.tiptap]:overflow-y-auto",
          "[&_.tiptap]:px-3 [&_.tiptap]:py-2.5 [&_.tiptap]:text-sm [&_.tiptap]:leading-relaxed",
          "[&_.tiptap]:outline-none",
          // prose 排版（@tailwindcss/typography）
          "[&_.tiptap]:prose [&_.tiptap]:prose-sm [&_.tiptap]:max-w-none",
          // placeholder：当编辑器为空时通过 ::before 伪元素显示
          "[&_.tiptap.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.tiptap.is-editor-empty:first-child::before]:text-(--fg3) [&_.tiptap.is-editor-empty:first-child::before]:float-left",
          "[&_.tiptap.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap.is-editor-empty:first-child::before]:h-0",
          // mention 节点样式
          "[&_.rich-editor-mention]:text-primary [&_.rich-editor-mention]:font-medium",
          // sm+ 响应式：增大最大高度
          "sm:[&_.tiptap]:max-h-80",
        )}
      >
        <EditorContent
          editor={editor}
          // data-placeholder 传给 CSS，通过 ::before 伪元素渲染占位文字
          data-placeholder={placeholder}
        />
      </div>

      {/* 工具栏（底部固定） */}
      <Toolbar
        editor={editor}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        onInsertImage={onInsertImage}
        onInsertLink={onInsertLink}
        onInsertCode={onInsertCode}
      />
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter @repo/editor test
```

期望：所有 tests PASS（underline + RichEditor 共 8 tests）。

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/RichEditor.tsx packages/editor/src/__tests__/RichEditor.test.tsx
git commit -m "feat(editor): 实现 RichEditor 主组件（教科书注释 + 响应式说明）"
```

---

## Task 10: 完善包公开 API

**Files:**
- Modify: `packages/editor/src/index.ts`

- [ ] **Step 1: 更新 index.ts**

`packages/editor/src/index.ts`:
```typescript
/**
 * @repo/editor 公开 API
 *
 * 使用方只需从这里导入，无需关心内部目录结构。
 *
 * 基础使用（评论场景）：
 * ```tsx
 * import { RichEditor } from "@repo/editor";
 * import type { RichEditorProps, MentionItem } from "@repo/editor";
 *
 * <RichEditor
 *   value={content}
 *   onChange={setContent}
 *   onInsertImage={(insert) => openImageDialog(insert)}
 *   onInsertLink={(insert) => openLinkDialog(insert)}
 *   onInsertCode={(insert) => openCodeDialog(insert)}
 *   onSubmit={handleSubmit}
 *   isSubmitting={isSubmitting}
 * />
 * ```
 */
export { RichEditor } from "./RichEditor";
export type { RichEditorProps, InsertHandlers, MentionItem } from "./types";
```

- [ ] **Step 2: 类型检查**

```bash
pnpm --filter @repo/editor check-types
```

期望：0 errors。

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/index.ts
git commit -m "feat(editor): 导出 RichEditor 公开 API"
```

---

## Task 11: 集成到 apps/web

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.ts`（或 next.config.js/mjs）

- [ ] **Step 1: 添加 @repo/editor 依赖**

在 `apps/web/package.json` 的 `dependencies` 中添加：
```json
"@repo/editor": "workspace:*"
```

- [ ] **Step 2: 查找并修改 Next.js 配置文件**

```bash
ls apps/web/next.config.*
```

打开找到的配置文件（`next.config.ts` 或 `next.config.js`），在 `nextConfig` 中添加 `transpilePackages`：

```typescript
// next.config.ts 示例（根据实际文件格式调整）
const nextConfig = {
  // ... 已有配置
  transpilePackages: [
    "@repo/ui",
    "@repo/icons",
    "@repo/editor", // 新增
  ],
};
```

若文件中已有 `transpilePackages` 数组，仅追加 `"@repo/editor"`。

- [ ] **Step 3: 安装并验证解析**

```bash
pnpm install
pnpm --filter apps/web check-types
```

期望：能 import `@repo/editor`，0 errors 与 editor 包相关。

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/next.config.*
git commit -m "chore(web): 集成 @repo/editor 依赖"
```

---

## Task 12: ImageDialog

**Files:**
- Create: `apps/web/components/comments/dialogs/image-dialog.tsx`
- Create: `apps/web/components/comments/dialogs/image-dialog.test.tsx`

- [ ] **Step 1: 先写失败测试**

`apps/web/components/comments/dialogs/image-dialog.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageDialog } from "./image-dialog";

describe("ImageDialog", () => {
  it("open=false 时不渲染内容", () => {
    render(<ImageDialog open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染 URL 输入框和描述输入框", () => {
    render(<ImageDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/图片描述/i)).toBeInTheDocument();
  });

  it("URL 为空时确认按钮禁用", () => {
    render(<ImageDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: /插入/i })).toBeDisabled();
  });

  it("填写 URL 后点击确认，触发 onConfirm(url, alt)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ImageDialog open onClose={() => {}} onConfirm={onConfirm} />);
    await user.type(screen.getByPlaceholderText(/https:\/\//i), "https://example.com/img.png");
    await user.type(screen.getByPlaceholderText(/图片描述/i), "示例图片");
    await user.click(screen.getByRole("button", { name: /插入/i }));
    expect(onConfirm).toHaveBeenCalledWith("https://example.com/img.png", "示例图片");
  });

  it("点击取消触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImageDialog open onClose={onClose} onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: /取消/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test apps/web/components/comments/dialogs/image-dialog.test.tsx
```

期望：FAIL，报 `Cannot find module './image-dialog'`。

- [ ] **Step 3: 实现 ImageDialog**

`apps/web/components/comments/dialogs/image-dialog.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui";

interface ImageDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string, alt?: string) => void;
}

export function ImageDialog({ open, onClose, onConfirm }: ImageDialogProps) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  // 对话框关闭时重置表单
  useEffect(() => {
    if (!open) {
      setUrl("");
      setAlt("");
    }
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    if (!url.trim()) return;
    onConfirm(url.trim(), alt.trim() || undefined);
    onClose();
  }

  return (
    // 遮罩层
    <div
      role="dialog"
      aria-modal="true"
      aria-label="插入图片"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 对话框主体：w-[min(90vw,400px)] 在手机/桌面自适应 */}
      <div className="w-[min(90vw,400px)] rounded-2xl bg-background p-5 shadow-xl">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入图片</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-(--fg2)">
              图片 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              autoFocus
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-(--fg2)">
              图片描述（可选）
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="图片描述（alt 文本）"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onPress={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            isDisabled={!url.trim()}
            onPress={handleConfirm}
          >
            插入
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test apps/web/components/comments/dialogs/image-dialog.test.tsx
```

期望：5 tests PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/dialogs/
git commit -m "feat(web): 实现 ImageDialog（URL + alt 输入）"
```

---

## Task 13: LinkDialog

**Files:**
- Create: `apps/web/components/comments/dialogs/link-dialog.tsx`
- Create: `apps/web/components/comments/dialogs/link-dialog.test.tsx`

- [ ] **Step 1: 先写失败测试**

`apps/web/components/comments/dialogs/link-dialog.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkDialog } from "./link-dialog";

describe("LinkDialog", () => {
  it("open=false 时不渲染", () => {
    render(<LinkDialog open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染 URL 和链接文字输入框", () => {
    render(<LinkDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/链接文字/i)).toBeInTheDocument();
  });

  it("URL 为空时确认按钮禁用", () => {
    render(<LinkDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: /插入/i })).toBeDisabled();
  });

  it("填写 URL 和文字后点击确认，触发 onConfirm(url, title)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LinkDialog open onClose={() => {}} onConfirm={onConfirm} />);
    await user.type(screen.getByPlaceholderText(/https:\/\//i), "https://example.com");
    await user.type(screen.getByPlaceholderText(/链接文字/i), "示例链接");
    await user.click(screen.getByRole("button", { name: /插入/i }));
    expect(onConfirm).toHaveBeenCalledWith("https://example.com", "示例链接");
  });

  it("点击取消触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LinkDialog open onClose={onClose} onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: /取消/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test apps/web/components/comments/dialogs/link-dialog.test.tsx
```

- [ ] **Step 3: 实现 LinkDialog**

`apps/web/components/comments/dialogs/link-dialog.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui";

interface LinkDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string, title?: string) => void;
}

export function LinkDialog({ open, onClose, onConfirm }: LinkDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) { setUrl(""); setTitle(""); }
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    if (!url.trim()) return;
    onConfirm(url.trim(), title.trim() || undefined);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="插入链接"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[min(90vw,400px)] rounded-2xl bg-background p-5 shadow-xl">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入链接</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-(--fg2)">
              链接地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-(--fg2)">
              链接文字（可选）
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="链接文字（留空则使用 URL）"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onPress={onClose}>取消</Button>
          <Button variant="primary" size="sm" isDisabled={!url.trim()} onPress={handleConfirm}>
            插入
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test apps/web/components/comments/dialogs/link-dialog.test.tsx
```

期望：5 tests PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/dialogs/link-dialog.tsx apps/web/components/comments/dialogs/link-dialog.test.tsx
git commit -m "feat(web): 实现 LinkDialog（URL + 链接文字输入）"
```

---

## Task 14: CodeDialog

**Files:**
- Create: `apps/web/components/comments/dialogs/code-dialog.tsx`
- Create: `apps/web/components/comments/dialogs/code-dialog.test.tsx`

支持的语言列表（`SUPPORTED_LANGUAGES`）：
```
plain | javascript | typescript | python | rust | go | java | cpp | css | html | bash | json | sql | yaml
```

- [ ] **Step 1: 先写失败测试**

`apps/web/components/comments/dialogs/code-dialog.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeDialog } from "./code-dialog";

describe("CodeDialog", () => {
  it("open=false 时不渲染", () => {
    render(<CodeDialog open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染代码输入区和语言选择器", () => {
    render(<CodeDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("textbox", { name: /代码内容/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /语言/i })).toBeInTheDocument();
  });

  it("代码为空时确认按钮禁用", () => {
    render(<CodeDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: /插入/i })).toBeDisabled();
  });

  it("填写代码并选择语言后，点击确认触发 onConfirm(code, lang)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CodeDialog open onClose={() => {}} onConfirm={onConfirm} />);
    await user.type(screen.getByRole("textbox", { name: /代码内容/i }), "console.log(1)");
    await user.selectOptions(screen.getByRole("combobox", { name: /语言/i }), "javascript");
    await user.click(screen.getByRole("button", { name: /插入/i }));
    expect(onConfirm).toHaveBeenCalledWith("console.log(1)", "javascript");
  });

  it("点击取消触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CodeDialog open onClose={onClose} onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: /取消/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test apps/web/components/comments/dialogs/code-dialog.test.tsx
```

- [ ] **Step 3: 实现 CodeDialog**

`apps/web/components/comments/dialogs/code-dialog.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui";

/** 评论场景支持的代码语言列表。新增语言在此追加即可。 */
export const SUPPORTED_LANGUAGES = [
  { value: "plain", label: "纯文本" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "bash", label: "Bash / Shell" },
  { value: "json", label: "JSON" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
] as const;

interface CodeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string, lang: string) => void;
}

export function CodeDialog({ open, onClose, onConfirm }: CodeDialogProps) {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<string>("plain");

  useEffect(() => {
    if (!open) { setCode(""); setLang("plain"); }
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    if (!code.trim()) return;
    onConfirm(code, lang);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="插入代码块"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[min(90vw,520px)] rounded-2xl bg-background p-5 shadow-xl">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">插入代码块</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="code-lang"
              className="mb-1 block text-xs font-medium text-(--fg2)"
            >
              语言
            </label>
            <select
              id="code-lang"
              aria-label="语言"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="code-content"
              className="mb-1 block text-xs font-medium text-(--fg2)"
            >
              代码内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="code-content"
              aria-label="代码内容"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={8}
              placeholder="在此粘贴或输入代码..."
              spellCheck={false}
              className="w-full resize-y rounded-lg border border-input bg-muted px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onPress={onClose}>取消</Button>
          <Button variant="primary" size="sm" isDisabled={!code.trim()} onPress={handleConfirm}>
            插入
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test apps/web/components/comments/dialogs/code-dialog.test.tsx
```

期望：5 tests PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/dialogs/code-dialog.tsx apps/web/components/comments/dialogs/code-dialog.test.tsx
git commit -m "feat(web): 实现 CodeDialog（代码输入 + 14 种语言选择器）"
```

---

## Task 15: RichCommentInput 组合组件

**Files:**
- Create: `apps/web/components/comments/rich-comment-input.tsx`
- Create: `apps/web/components/comments/rich-comment-input.test.tsx`

- [ ] **Step 1: 先写失败测试**

`apps/web/components/comments/rich-comment-input.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichCommentInput } from "./rich-comment-input";

// mock @repo/editor 避免 Tiptap DOM 依赖问题
vi.mock("@repo/editor", () => ({
  RichEditor: ({
    onSubmit,
    onInsertImage,
    onInsertLink,
    onInsertCode,
  }: {
    onSubmit?: () => void;
    onInsertImage?: (insert: (url: string, alt?: string) => void) => void;
    onInsertLink?: (insert: (url: string, title?: string) => void) => void;
    onInsertCode?: (insert: (code: string, lang: string) => void) => void;
  }) => (
    <div data-testid="rich-editor">
      <button onClick={onSubmit}>发送</button>
      <button onClick={() => onInsertImage?.((url, alt) => {})}>插入图片</button>
      <button onClick={() => onInsertLink?.((url, title) => {})}>插入链接</button>
      <button onClick={() => onInsertCode?.((code, lang) => {})}>插入代码</button>
    </div>
  ),
}));

describe("RichCommentInput", () => {
  it("渲染 RichEditor", () => {
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByTestId("rich-editor")).toBeInTheDocument();
  });

  it("点击插入图片按钮后，ImageDialog 打开", async () => {
    const user = userEvent.setup();
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} />);
    await user.click(screen.getByText("插入图片"));
    expect(screen.getByRole("dialog", { name: "插入图片" })).toBeInTheDocument();
  });

  it("点击插入链接按钮后，LinkDialog 打开", async () => {
    const user = userEvent.setup();
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} />);
    await user.click(screen.getByText("插入链接"));
    expect(screen.getByRole("dialog", { name: "插入链接" })).toBeInTheDocument();
  });

  it("点击插入代码按钮后，CodeDialog 打开", async () => {
    const user = userEvent.setup();
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} />);
    await user.click(screen.getByText("插入代码"));
    expect(screen.getByRole("dialog", { name: "插入代码块" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm --filter apps/web test apps/web/components/comments/rich-comment-input.test.tsx
```

- [ ] **Step 3: 实现 RichCommentInput**

`apps/web/components/comments/rich-comment-input.tsx`:
```tsx
"use client";

import { useState, useCallback } from "react";
import { RichEditor } from "@repo/editor";
import type { MentionItem } from "@repo/editor";
import { ImageDialog } from "./dialogs/image-dialog";
import { LinkDialog } from "./dialogs/link-dialog";
import { CodeDialog } from "./dialogs/code-dialog";

interface RichCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  mentionSuggestions?: MentionItem[];
  placeholder?: string;
}

/**
 * 评论场景的富文本输入组件。
 * 组合 RichEditor + 三个插入对话框（图片/链接/代码块）。
 *
 * 插入流程：
 *   工具栏按钮点击 → RichEditor 调用 onInsertXxx handler
 *   → handler 打开对应对话框 → 用户填写 → 对话框 onConfirm 回调 insert()
 *   → insert() 将内容写入 Tiptap 编辑器
 */
export function RichCommentInput({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  mentionSuggestions = [],
  placeholder = "写下你的评论...",
}: RichCommentInputProps) {
  // 对话框开关 + 待执行的 insert 回调
  const [imageDialog, setImageDialog] = useState<{
    open: boolean;
    insert?: (url: string, alt?: string) => void;
  }>({ open: false });

  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    insert?: (url: string, title?: string) => void;
  }>({ open: false });

  const [codeDialog, setCodeDialog] = useState<{
    open: boolean;
    insert?: (code: string, lang: string) => void;
  }>({ open: false });

  const handleInsertImage = useCallback(
    (insert: (url: string, alt?: string) => void) => {
      setImageDialog({ open: true, insert });
    },
    [],
  );

  const handleInsertLink = useCallback(
    (insert: (url: string, title?: string) => void) => {
      setLinkDialog({ open: true, insert });
    },
    [],
  );

  const handleInsertCode = useCallback(
    (insert: (code: string, lang: string) => void) => {
      setCodeDialog({ open: true, insert });
    },
    [],
  );

  return (
    <>
      <RichEditor
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        placeholder={placeholder}
        mentionSuggestions={mentionSuggestions}
        onInsertImage={handleInsertImage}
        onInsertLink={handleInsertLink}
        onInsertCode={handleInsertCode}
      />

      <ImageDialog
        open={imageDialog.open}
        onClose={() => setImageDialog({ open: false })}
        onConfirm={(url, alt) => {
          imageDialog.insert?.(url, alt);
          setImageDialog({ open: false });
        }}
      />

      <LinkDialog
        open={linkDialog.open}
        onClose={() => setLinkDialog({ open: false })}
        onConfirm={(url, title) => {
          linkDialog.insert?.(url, title);
          setLinkDialog({ open: false });
        }}
      />

      <CodeDialog
        open={codeDialog.open}
        onClose={() => setCodeDialog({ open: false })}
        onConfirm={(code, lang) => {
          codeDialog.insert?.(code, lang);
          setCodeDialog({ open: false });
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm --filter apps/web test apps/web/components/comments/rich-comment-input.test.tsx
```

期望：4 tests PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/rich-comment-input.tsx apps/web/components/comments/rich-comment-input.test.tsx
git commit -m "feat(web): 实现 RichCommentInput（RichEditor + 三对话框组合）"
```

---

## Task 16: 接入 CommentSection

**Files:**
- Modify: `apps/web/components/comments/comment-section.tsx`
- Modify: `apps/web/components/comments/comment-section.test.tsx`

- [ ] **Step 1: 读取 comment-section.tsx 当前内容**

```bash
cat apps/web/components/comments/comment-section.tsx
```

- [ ] **Step 2: 修改 comment-section.tsx**

在文件顶部 import 区域添加：
```typescript
import { RichCommentInput } from "./rich-comment-input";
```

找到 `inline` layout 的渲染分支（文件末尾约第 215 行）：
```tsx
// inline layout：输入框在上，列表自然流（页面整体可滚动）
return (
  <div className="flex flex-col gap-6">
    {input}
    <div>{commentList}</div>
  </div>
);
```

将 `{input}` 替换为 `RichCommentInput`：
```tsx
// inline layout：输入框在上，列表自然流（页面整体可滚动）
return (
  <div className="flex flex-col gap-6">
    <RichCommentInput
      value={content}
      onChange={(v) => { setContent(v); clearError(); }}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      placeholder={replyTarget ? "写下你的回复..." : "写下你的评论..."}
    />
    {submitError && <p className="text-xs text-red-500">{submitError}</p>}
    {replyTarget && (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-(--fg3)">正在回复</span>
        <span className="font-semibold text-primary">@{replyTarget.toUsername}</span>
        <button
          type="button"
          onClick={handleCancelReply}
          className="text-[11px] text-(--fg3) hover:text-foreground"
        >
          取消
        </button>
      </div>
    )}
    <div>{commentList}</div>
  </div>
);
```

同时删除 inline layout 分支中原有的 `const input = (<CommentInput .../>)` 声明（modal layout 分支中的 `{input}` 仍保留原 CommentInput）。

> **注意**：modal layout 分支不修改，继续使用原 `CommentInput`。

- [ ] **Step 3: 运行 comment-section 测试，确认原有测试不回归**

```bash
pnpm --filter apps/web test apps/web/components/comments/comment-section.test.tsx
```

期望：所有现有测试仍 PASS（inline layout 新增用 RichCommentInput mock 覆盖）。如有测试因 RichEditor 引入而失败，在测试文件顶部添加：
```typescript
vi.mock("@repo/editor", () => ({
  RichEditor: ({ onChange, onSubmit }: { onChange: (v: string) => void; onSubmit: () => void }) => (
    <div>
      <textarea onChange={(e) => onChange(e.target.value)} data-testid="rich-editor" />
      <button onClick={onSubmit}>发送</button>
    </div>
  ),
}));
```

- [ ] **Step 4: 类型检查**

```bash
pnpm --filter apps/web check-types
```

期望：0 errors。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/comments/comment-section.tsx apps/web/components/comments/comment-section.test.tsx
git commit -m "feat(web): inline 评论区接入 RichCommentInput（modal layout 不变）"
```

---

## Task 17: 修复 rehype-sanitize 允许 `<u>` 标签

**Files:**
- Modify: `apps/web/lib/markdown.ts`

- [ ] **Step 1: 读取当前 markdown.ts**

```bash
cat apps/web/lib/markdown.ts
```

- [ ] **Step 2: 修改 sanitize 配置，允许 `<u>` 标签**

在 `rehypeSanitize` 的配置中，找到 `attributes` 的 `defaultSchema` 合并处，添加 `tagNames` 覆盖以允许 `u`：

当前代码：
```typescript
.use(rehypeSanitize, {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
  },
})
```

修改为：
```typescript
.use(rehypeSanitize, {
  ...defaultSchema,
  // 允许 <u> 标签：下划线由 RichEditor 以 <u>text</u> 形式存储在 Markdown 中
  // defaultSchema 不包含 <u>，需显式添加
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
  attributes: {
    ...defaultSchema.attributes,
    // 允许 rehype-slug 注入的 id 属性
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
  },
})
```

- [ ] **Step 3: 运行类型检查和相关测试**

```bash
pnpm --filter apps/web check-types
pnpm --filter apps/web test apps/web/lib/
```

期望：无 TS 错误，已有 markdown 相关测试通过。

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/markdown.ts
git commit -m "fix(web): rehype-sanitize 允许 <u> 标签（下划线 Markdown 渲染支持）"
```

---

## Task 18: 全量验证

- [ ] **Step 1: 运行所有测试**

```bash
pnpm -r test --run
```

期望：全部 PASS，无新增失败。

- [ ] **Step 2: 类型检查**

```bash
pnpm -r --if-present check-types
```

期望：0 errors。

- [ ] **Step 3: 启动 dev 服务器，手动验证**

```bash
pnpm --filter apps/web dev
```

访问任意文章详情页（如 `http://localhost:3000/articles/1`），滚动到评论区，验证：

- [ ] 编辑区可点击并输入文字
- [ ] 输入 `## 标题` 即时渲染为大号标题
- [ ] 工具栏 B/I/U 按钮可切换格式
- [ ] 点击图片/链接/代码按钮弹出对应对话框
- [ ] 对话框填写后内容插入编辑器
- [ ] 输入 `@` 触发 mention（当前无候选）
- [ ] 点击发送提交评论，评论出现在列表中
- [ ] 手机宽度（375px）下工具栏横向滚动，发送按钮始终可见
- [ ] modal 弹窗中原有的普通输入框不受影响

- [ ] **Step 4: 最终 commit**

```bash
git add -A
git commit -m "feat(editor): RichEditor WYSIWYG 评论编辑器完整实现

- 新建 @repo/editor 包（Tiptap v3.26.0 + tiptap-markdown）
- 教科书注释 + 响应式说明（移动端工具栏横向滚动）
- 下划线扩展显式封装，含追溯数据流说明
- @提及 stub（UI 完整，等待后端 /users/search API）
- 图片/链接/代码块对话框（URL 输入，兼容 admin 文件上传扩展）
- inline 评论区接入 RichCommentInput，modal 不变
- rehype-sanitize 允许 <u> 标签"
```

---

## 自检清单

| 设计文档需求 | 对应 Task |
|------------|---------|
| 内联渲染（输入即格式化）| Task 9 RichEditor + useRichEditor |
| 底部工具栏 B/I/U/链接/图片/代码/@| Task 7/8 Toolbar |
| 下划线可追溯 | Task 4 underline.ts |
| @提及 stub | Task 5 mention.ts |
| 图片 URL 对话框 | Task 12 |
| 链接对话框 | Task 13 |
| 代码 + 语言选择对话框 | Task 14 |
| InsertHandlers 注入接口 | Task 3 types.ts + Task 15 |
| SSR immediatelyRender: false | Task 6 use-rich-editor.ts |
| 响应式移动端横向滚动 | Task 8 Toolbar |
| rehype-sanitize 允许 `<u>` | Task 17 |
| 测试覆盖 | 每 Task 含 TDD 步骤 |
| tiptap-markdown 替换点 | use-rich-editor.ts 注释标注 |
| 版本 Tiptap v3.26.0 | Task 1 package.json |
