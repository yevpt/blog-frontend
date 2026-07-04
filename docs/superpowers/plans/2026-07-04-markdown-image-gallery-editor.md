# 文章正文多图轮播 — 编辑器实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tiptap 文章编辑器中相邻图片自动合并为所见即所得的轮播(`imageGallery` 节点),序列化输出仍是普通相邻 `![alt](src)` 段落;支持回车拆组、多选批量上传;仅 admin 文章编辑器启用。

**Architecture:** 新增 `imageGallery` 块级 node(`content: "image+"`,图片仍是真实 image 子节点,上传占位/CDN 逻辑零改动);normalize 逻辑(onCreate + appendTransaction,每次只做一处改写、靠 ProseMirror 的 appendTransaction 链收敛)负责相邻合并/单图解散;NodeView 用 contentDOM 作为横向 scroll-snap 滑道,chrome(翻页/指示点/计数/添加图片)不可编辑。

**Tech Stack:** Tiptap v3 (@tiptap/core、@tiptap/pm、@tiptap/react、@tiptap/markdown)、React、Tailwind、Vitest (jsdom)。

**Spec:** `docs/superpowers/specs/2026-07-03-markdown-image-gallery-design.md`(先通读)

## Global Constraints

- 先读仓库根 `AGENTS.md` 与 `.claude/skills/writing-tests/SKILL.md`、`.claude/skills/git-commit/SKILL.md`、`.claude/skills/building-ui/SKILL.md`。
- TypeScript 禁 `any`(NodeViewContent 的类型收窄参考 `packages/editor/src/toolbar/CodeBlockView.tsx` 的 `TypedNodeViewContent` 写法);非显然逻辑写中文注释。
- 每个 task 测试先行;editor 包测试需文件首行 `// @vitest-environment jsdom`(既有惯例);测试命令 `pnpm --filter @repo/editor test`、`pnpm --filter @repo/hooks test`、`pnpm --filter admin test`。
- **markdown 契约(与前台渲染计划共享,不得擅改)**:gallery 序列化 = 子图片的 `![alt](src)` 以一个空行(`\n\n`)连接;任何非图片块(含仅含 nbsp `\u00a0` 的段落)阻断相邻图片成组。拆组分隔段落必须包含 nbsp `\u00a0` 文本(代码中一律写显式转义 "\u00a0",不要粘贴不可见字符)(空段落序列化后可能被 remark 折叠导致前台重新成组,nbsp 段落不会)。
- commit message 由钩子强校验,格式见各 task。
- 若实现中发现计划与 Tiptap 实际 API 冲突(如 `renderMarkdown` helpers 签名、`NodeViewContent` ref 行为),在不偏离架构(gallery node + contentDOM 滑道 + normalize 收敛)的前提下按官方 API 微调,并在产出报告中说明;架构级冲突则停下报告。

---

### Task 1: 提取图片 markdown 序列化纯函数

**Files:**
- Modify: `packages/editor/src/extensions/image.ts`
- Test: `packages/editor/src/__tests__/image-render-markdown.test.ts`(新建)

**Interfaces:**
- Produces: `renderImageMarkdown(node: JSONContent): string` — 从 `extensions/image.ts` 导出;上传中/占位图返回 `""`;Task 2 的 gallery `renderMarkdown` 复用。

- [ ] **Step 1: 写失败测试**

创建 `packages/editor/src/__tests__/image-render-markdown.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderImageMarkdown } from "../extensions/image";
import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";

describe("renderImageMarkdown", () => {
  it("常规图片输出 ![alt](src)", () => {
    expect(
      renderImageMarkdown({ type: "image", attrs: { src: "https://e.com/1.png", alt: "一" } }),
    ).toBe("![一](https://e.com/1.png)");
  });

  it("无 alt 输出空 alt", () => {
    expect(renderImageMarkdown({ type: "image", attrs: { src: "https://e.com/1.png" } })).toBe(
      "![](https://e.com/1.png)",
    );
  });

  it("上传中/解码中/占位 src 输出空串", () => {
    expect(
      renderImageMarkdown({
        type: "image",
        attrs: { src: "https://e.com/1.png", uploadState: "loading" },
      }),
    ).toBe("");
    expect(
      renderImageMarkdown({
        type: "image",
        attrs: { src: "https://e.com/1.png", uploadState: "decoding" },
      }),
    ).toBe("");
    expect(
      renderImageMarkdown({ type: "image", attrs: { src: IMAGE_UPLOAD_PLACEHOLDER_SRC } }),
    ).toBe("");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @repo/editor test src/__tests__/image-render-markdown.test.ts`
Expected: FAIL(`renderImageMarkdown` 未导出)。

- [ ] **Step 3: 实现**

在 `image.ts` 中(`ImageExtension` 定义之前)新增导出函数,并让 `ImageExtension.renderMarkdown` 委托给它:

```ts
/** image 节点 → markdown。上传中/占位图返回空串（imageGallery 序列化复用）。 */
export function renderImageMarkdown(node: JSONContent): string {
  if (node.attrs?.uploadState === "loading" || node.attrs?.uploadState === "decoding") {
    return "";
  }
  const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
  if (!src || src === IMAGE_UPLOAD_PLACEHOLDER_SRC) {
    return "";
  }
  const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
  return `![${alt}](${src})`;
}
```

`ImageExtension` 内原 `renderMarkdown` 方法体替换为:

```ts
  renderMarkdown(node: JSONContent, _helpers: MarkdownRendererHelpers, _ctx: RenderContext) {
    return renderImageMarkdown(node);
  },
```

- [ ] **Step 4: 跑 editor 包全部测试确认通过(既有 image 序列化行为零回归)**

Run: `pnpm --filter @repo/editor test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/extensions/image.ts packages/editor/src/__tests__/image-render-markdown.test.ts
git commit -m "refactor(editor): 提取图片节点 markdown 序列化纯函数"
```

---

### Task 2: imageGallery 节点 + 相邻图片自动归一化

**Files:**
- Create: `packages/editor/src/extensions/image-gallery.ts`
- Test: `packages/editor/src/__tests__/image-gallery.test.ts`(新建)

**Interfaces:**
- Consumes: Task 1 的 `renderImageMarkdown`。
- Produces:
  - `ImageGalleryExtension`(Tiptap Node 扩展,name `"imageGallery"`,`content: "image+"`);
  - `ImageGalleryStorage` 类型:`{ requestImageInsert: ((handlers: ImageInsertHandlers) => void) | null }`(Task 4/5 依赖);
  - 命令 `splitImageGallery()`(Task 3 实现,本 task 先不建);
  - 归一化行为:相邻的顶层/同容器内 `image`/`imageGallery` 兄弟节点自动合并为一个 gallery;仅剩 1 张图的 gallery 解散为普通 image。

**注意事项(实现前必读):**
- NodeView 在 Task 4 才加;本 task 的扩展先不写 `addNodeView`,便于用 `@tiptap/core` 的 `Editor` 纯逻辑测试。
- normalize 采用「每次事务只修复第一处违规」策略:`appendTransaction` 返回的事务会再次触发 `appendTransaction`,ProseMirror 会循环直到返回 null,天然收敛且无 index 错位风险。
- 初始加载(`content` + `contentType: "markdown"`)不产生事务,需在 `onCreate` 里补一次 normalize。

- [ ] **Step 1: 写失败测试**

创建 `packages/editor/src/__tests__/image-gallery.test.ts`:

```ts
// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vitest";
import { ImageExtension, IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../extensions/image";
import { ImageGalleryExtension } from "../extensions/image-gallery";

let editors: Editor[] = [];

function createEditor(initialMarkdown = ""): Editor {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit.configure({
        underline: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Markdown.configure({}),
      ImageExtension.configure({ imageOptimizationPreset: "off" }),
      ImageGalleryExtension,
    ],
    content: initialMarkdown,
    contentType: "markdown",
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.forEach((editor) => editor.destroy());
  editors = [];
});

/** 收集 doc 顶层节点类型名列表，断言结构用 */
function topLevelTypes(editor: Editor): string[] {
  const types: string[] = [];
  editor.state.doc.forEach((node) => types.push(node.type.name));
  return types;
}

function findGallery(editor: Editor): { node: import("@tiptap/pm/model").Node; pos: number } | null {
  let found: { node: import("@tiptap/pm/model").Node; pos: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "imageGallery" && !found) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

describe("imageGallery 归一化", () => {
  it("加载相邻两图 markdown 后合并为一个 gallery", () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    const gallery = findGallery(editor);
    expect(gallery?.node.childCount).toBe(2);
    expect(topLevelTypes(editor)).toEqual(["imageGallery"]);
  });

  it("三张相邻图合并为一个 gallery", () => {
    const editor = createEditor(
      "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)\n\n![三](https://e.com/3.png)",
    );
    expect(findGallery(editor)?.node.childCount).toBe(3);
  });

  it("单张图不成组", () => {
    const editor = createEditor("![一](https://e.com/1.png)");
    expect(findGallery(editor)).toBeNull();
  });

  it("图片间有文字段落时不合并", () => {
    const editor = createEditor(
      "![一](https://e.com/1.png)\n\n中间文字\n\n![二](https://e.com/2.png)",
    );
    expect(findGallery(editor)).toBeNull();
  });

  it("图片间的 nbsp 段落阻断合并（拆组契约）", () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n\u00a0\n\n![二](https://e.com/2.png)");
    expect(findGallery(editor)).toBeNull();
  });

  it("gallery 序列化为相邻图片段落（round-trip）", () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    expect(editor.getMarkdown()).toBe("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
  });

  it("删到仅剩一张图时 gallery 解散为普通 image", () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    const gallery = findGallery(editor);
    if (!gallery) throw new Error("gallery 不存在");
    // 删除 gallery 内第一张图（gallery 内容起点 = pos + 1）
    const firstChild = gallery.node.child(0);
    editor.view.dispatch(
      editor.state.tr.delete(gallery.pos + 1, gallery.pos + 1 + firstChild.nodeSize),
    );
    expect(findGallery(editor)).toBeNull();
    expect(topLevelTypes(editor)).toEqual(["image"]);
  });

  it("在 gallery 后紧邻插入图片会被并入", () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: "image",
      attrs: { src: "https://e.com/3.png", alt: "三" },
    });
    expect(findGallery(editor)?.node.childCount).toBe(3);
    expect(topLevelTypes(editor)).toEqual(["imageGallery"]);
  });

  it("上传占位图在 gallery 内可被 resolveImagePlaceholder 替换", () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    const gallery = findGallery(editor);
    if (!gallery) throw new Error("gallery 不存在");
    editor.commands.insertContentAt(gallery.pos + gallery.node.nodeSize - 1, {
      type: "image",
      attrs: {
        src: IMAGE_UPLOAD_PLACEHOLDER_SRC,
        alt: "",
        uploadState: "loading",
        uploadId: "u-1",
        aspectRatio: "1.5",
      },
    });
    expect(findGallery(editor)?.node.childCount).toBe(3);
    // 占位图不参与序列化
    expect(editor.getMarkdown()).toBe(
      "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)",
    );
    editor.commands.resolveImagePlaceholder({ uploadId: "u-1", src: "https://e.com/3.png" });
    expect(editor.getMarkdown()).toContain("https://e.com/3.png");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @repo/editor test src/__tests__/image-gallery.test.ts`
Expected: FAIL(模块不存在)。

- [ ] **Step 3: 实现 `extensions/image-gallery.ts`**

```ts
import { Node, mergeAttributes } from "@tiptap/core";
import type { JSONContent, MarkdownRendererHelpers, RenderContext } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { renderImageMarkdown } from "./image";
import type { ImageInsertHandlers } from "../types";

const GALLERY_TYPE = "imageGallery";
const IMAGE_TYPE = "image";

/** RichEditor 通过 storage 注入「添加图片」的选图流程（复用工具栏的 onInsertImage） */
export interface ImageGalleryStorage {
  requestImageInsert: ((handlers: ImageInsertHandlers) => void) | null;
}

interface Rewrite {
  from: number;
  to: number;
  nodes: PMNode[];
}

/** 展平 run 内所有图片（gallery 摊开为子图，保持顺序） */
function flattenRunImages(run: PMNode[]): PMNode[] {
  const images: PMNode[] = [];
  for (const node of run) {
    if (node.type.name === IMAGE_TYPE) {
      images.push(node);
      continue;
    }
    node.forEach((child) => images.push(child));
  }
  return images;
}

/**
 * 在 parent 的 children 中找第一处需要归一化的相邻 image/imageGallery run。
 * contentStart 为 parent 内容区起始的绝对位置（doc 为 0，其余为 pos + 1）。
 */
function findRewriteInParent(parent: PMNode, contentStart: number, state: EditorState): Rewrite | null {
  const galleryType = state.schema.nodes[GALLERY_TYPE];
  let run: Array<{ node: PMNode; from: number; to: number }> = [];

  const evaluate = (): Rewrite | null => {
    if (run.length === 0) return null;
    const totalImages = run.reduce(
      (sum, item) => sum + (item.node.type.name === IMAGE_TYPE ? 1 : item.node.childCount),
      0,
    );
    // 违规情形：run 里多个节点（需要合并）、或单个 gallery 图数不足（需要解散）
    const needsRewrite =
      run.length > 1 || (run[0].node.type.name === GALLERY_TYPE && run[0].node.childCount < 2);
    if (!needsRewrite) return null;

    const images = flattenRunImages(run.map((item) => item.node));
    const nodes =
      totalImages >= 2 ? [galleryType.create(null, images)] : images.slice(0, 1);
    return { from: run[0].from, to: run[run.length - 1].to, nodes };
  };

  let offset = contentStart;
  for (let index = 0; index < parent.childCount; index++) {
    const child = parent.child(index);
    const from = offset;
    const to = offset + child.nodeSize;
    offset = to;

    if (child.type.name === IMAGE_TYPE || child.type.name === GALLERY_TYPE) {
      run.push({ node: child, from, to });
      continue;
    }
    const rewrite = evaluate();
    if (rewrite) return rewrite;
    run = [];
  }
  return evaluate();
}

/** 全文档找第一处违规并生成修复事务；无违规返回 null。 */
function buildNormalizeStep(state: EditorState): Transaction | null {
  let rewrite = findRewriteInParent(state.doc, 0, state);
  if (!rewrite) {
    state.doc.descendants((node, pos) => {
      if (rewrite) return false;
      // 跳过 image 与 gallery 自身；其余块级容器（blockquote 等）逐层扫描
      if (node.type.name === IMAGE_TYPE || node.type.name === GALLERY_TYPE) return false;
      if (!node.isBlock || node.childCount === 0) return true;
      rewrite = findRewriteInParent(node, pos + 1, state);
      return !rewrite;
    });
  }
  if (!rewrite) return null;
  return state.tr.replaceWith(rewrite.from, rewrite.to, rewrite.nodes);
}

export const ImageGalleryExtension = Node.create({
  name: GALLERY_TYPE,

  group: "block",
  content: "image+",
  isolating: true,
  selectable: true,
  draggable: false,

  addStorage(): ImageGalleryStorage {
    return { requestImageInsert: null };
  },

  parseHTML() {
    return [{ tag: "div[data-image-gallery]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-image-gallery": "" }, HTMLAttributes), 0];
  },

  renderMarkdown(node: JSONContent, _helpers: MarkdownRendererHelpers, _ctx: RenderContext) {
    // 契约：序列化为相邻纯图片段落，前台 rehype 插件按同一规则重新成组
    const parts = (node.content ?? [])
      .map((child) => renderImageMarkdown(child))
      .filter(Boolean);
    return parts.join("\n\n");
  },

  onCreate() {
    // 初始 markdown 解析不产生事务，appendTransaction 不会触发，这里补一次；
    // 后续收敛由 appendTransaction 链完成
    const tr = buildNormalizeStep(this.editor.state);
    if (tr) this.editor.view.dispatch(tr);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imageGalleryNormalize"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          // 每次只修复第一处违规；返回的事务会再次进入 appendTransaction，直到收敛
          return buildNormalizeStep(newState);
        },
      }),
    ];
  },
});
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @repo/editor test src/__tests__/image-gallery.test.ts`
Expected: PASS。

常见失败排查:
- 「加载后未合并」:确认 `onCreate` 在 view 就绪后执行(Tiptap `onCreate` 是 view 创建后的钩子,可直接 dispatch);若 `this.editor.view` 未就绪报错,改用 `queueMicrotask(() => …)` 包裹并在报告中说明。
- 「round-trip 尾部多空行」:比对 `getMarkdown()` 实际输出,若差异仅是首尾空白,断言改为 `.trim()` 后比较,并在报告中说明。
- 「resolveImagePlaceholder 找不到 gallery 内占位图」:检查 `findImagePositionByUploadId`(image.ts)用的是 `doc.descendants`,应能进入 gallery;若它对 `imageGallery` 提前 `return false`,修正该函数。

- [ ] **Step 5: 跑 editor 包全部测试**

Run: `pnpm --filter @repo/editor test`
Expected: PASS(重点:未注册 gallery 的既有测试不受影响)。

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/extensions/image-gallery.ts packages/editor/src/__tests__/image-gallery.test.ts
git commit -m "feat(editor): 新增 imageGallery 节点与相邻图片自动归一化"
```

---

### Task 3: 回车拆组(splitImageGallery 命令)

**Files:**
- Modify: `packages/editor/src/extensions/image-gallery.ts`
- Test: `packages/editor/src/__tests__/image-gallery.test.ts`(追加用例)

**Interfaces:**
- Produces: 命令 `splitImageGallery()`;键位:gallery 内图片处于 NodeSelection 时按 Enter 触发。
- 行为:以选中图片为界拆分 —— `[界前图片(含选中)] + 含 nbsp(\u00a0) 的分隔段落 + [界后图片]`;两侧不足 2 张自动落为普通 image(由 wrap 逻辑直接生成,不依赖 normalize);光标落入分隔段落。

- [ ] **Step 1: 写失败测试**

在 `image-gallery.test.ts` 追加:

```ts
describe("splitImageGallery 回车拆组", () => {
  it("选中第一张图回车：拆为 image + nbsp 段落 + image", () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    const gallery = findGallery(editor);
    if (!gallery) throw new Error("gallery 不存在");
    // NodeSelection 选中 gallery 内第一张图（内容起点 = gallery.pos + 1）
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, gallery.pos + 1)),
    );
    const handled = editor.commands.splitImageGallery();
    expect(handled).toBe(true);
    expect(topLevelTypes(editor)).toEqual(["image", "paragraph", "image"]);
    // 分隔段落包含 nbsp，序列化后不会被 remark 折叠导致前台重新成组
    expect(editor.getMarkdown()).toContain("\u00a0");
  });

  it("三图 gallery 选中第二张回车：前两张成组 + nbsp 段落 + 单图", () => {
    const editor = createEditor(
      "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)\n\n![三](https://e.com/3.png)",
    );
    const gallery = findGallery(editor);
    if (!gallery) throw new Error("gallery 不存在");
    const secondPos = gallery.pos + 1 + gallery.node.child(0).nodeSize;
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, secondPos)),
    );
    editor.commands.splitImageGallery();
    expect(topLevelTypes(editor)).toEqual(["imageGallery", "paragraph", "image"]);
    expect(findGallery(editor)?.node.childCount).toBe(2);
  });

  it("拆组后的 markdown 再次加载仍是拆开状态（round-trip 稳定）", () => {
    const editor = createEditor("![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)");
    const gallery = findGallery(editor);
    if (!gallery) throw new Error("gallery 不存在");
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, gallery.pos + 1)),
    );
    editor.commands.splitImageGallery();
    const markdown = editor.getMarkdown();
    const reloaded = createEditor(markdown);
    expect(findGallery(reloaded)).toBeNull();
  });

  it("选中不在 gallery 内时命令返回 false（不拦截默认回车）", () => {
    const editor = createEditor("![一](https://e.com/1.png)");
    expect(editor.commands.splitImageGallery()).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @repo/editor test src/__tests__/image-gallery.test.ts`
Expected: 新增用例 FAIL(命令不存在)。

- [ ] **Step 3: 实现**

`image-gallery.ts` 顶部补 import:`NodeSelection, TextSelection`(来自 `@tiptap/pm/state`)。声明命令类型并实现:

```ts
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageGallery: {
      /** gallery 内图片处于 NodeSelection 时，以该图为界拆分并插入 nbsp 分隔段落 */
      splitImageGallery: () => ReturnType;
    };
  }
}
```

在 `ImageGalleryExtension` 内追加:

```ts
  addCommands() {
    return {
      splitImageGallery:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection)) return false;
          if (selection.node.type.name !== IMAGE_TYPE) return false;

          const $from = selection.$from;
          const depth = $from.depth;
          if (depth === 0 || $from.node(depth).type.name !== GALLERY_TYPE) return false;
          if (!dispatch) return true;

          const gallery = $from.node(depth);
          const galleryFrom = $from.before(depth);
          const galleryTo = galleryFrom + gallery.nodeSize;
          const splitIndex = $from.index(depth); // 选中图片在 gallery 内的序号

          const before: PMNode[] = [];
          const after: PMNode[] = [];
          gallery.forEach((child, _offset, index) => {
            (index <= splitIndex ? before : after).push(child);
          });

          const galleryType = state.schema.nodes[GALLERY_TYPE];
          // 不足 2 张直接落为普通 image，避免产出违规 gallery
          const wrap = (images: PMNode[]): PMNode[] => {
            if (images.length === 0) return [];
            if (images.length === 1) return [images[0]];
            return [galleryType.create(null, images)];
          };

          // 契约：分隔段落必须含 nbsp——纯空段落序列化后会被 remark 折叠，
          // 导致两侧图片在文章页重新相邻成组
          const separator = state.schema.nodes.paragraph.create(
            null,
            state.schema.text("\u00a0"),
          );
          const nodes = [...wrap(before), separator, ...wrap(after)];

          const tr = state.tr.replaceWith(galleryFrom, galleryTo, nodes);
          const beforeSize = wrap(before).reduce((sum, node) => sum + node.nodeSize, 0);
          // 光标落到分隔段落内（nbsp 之后）
          tr.setSelection(
            TextSelection.create(tr.doc, galleryFrom + beforeSize + separator.nodeSize - 1),
          );
          dispatch(tr);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitImageGallery(),
    };
  },
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @repo/editor test`
Expected: 全部 PASS(含 Task 2 用例:拆分产物不得被 normalize 二次改写 —— nbsp 段落阻断合并)。

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/extensions/image-gallery.ts packages/editor/src/__tests__/image-gallery.test.ts
git commit -m "feat(editor): 轮播 gallery 支持回车拆组"
```

---

### Task 4: 所见即所得 NodeView(scroll-snap 滑道 + chrome)

**Files:**
- Create: `packages/editor/src/nodes/image-gallery-node-view.tsx`
- Modify: `packages/editor/src/extensions/image-gallery.ts`(挂 `addNodeView`)
- Test: `packages/editor/src/__tests__/image-gallery-node-view.test.tsx`(新建;通过 RichEditor 挂载验证,mock 方式参照既有 `RichEditor.test.tsx` 与 `__tests__/setup.ts`)

**Interfaces:**
- Consumes: Task 2 的 `ImageGalleryStorage`(读 `editor.storage.imageGallery.requestImageInsert`)、`ImageInsertHandlers`(types.ts)、`IMAGE_UPLOAD_PLACEHOLDER_SRC`。
- 结构:NodeViewWrapper > 相对定位容器 > NodeViewContent(横向 scroll-snap 滑道,ProseMirror 托管子 image NodeView)+ 不可编辑 chrome(prev/next/dots/计数/添加图片)。
- 依赖 Task 5 注入 storage 后「添加图片」按钮才可见;未注入时按钮不渲染。

- [ ] **Step 1: 写失败测试**

创建 `packages/editor/src/__tests__/image-gallery-node-view.test.tsx`(**先阅读 `RichEditor.test.tsx` 的挂载与等待方式,保持一致**;下面代码中的 mock 若与 setup.ts 重复则省略):

```tsx
// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichEditor } from "../RichEditor";

const TWO_IMAGES = "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)";

describe("ImageGalleryNodeView", () => {
  it("启用 enableImageGallery 时相邻图片渲染为轮播滑道与 chrome", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery />);
    await waitFor(() => {
      expect(screen.getByLabelText("下一张")).toBeTruthy();
    });
    expect(screen.getByLabelText("上一张")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getAllByLabelText(/跳转到第 \d 张/)).toHaveLength(2);
    // 未注入 requestImageInsert 时不渲染添加按钮
    expect(screen.queryByLabelText("添加图片")).toBeNull();
  });

  it("未启用 enableImageGallery 时不出现轮播 chrome", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} />);
    // 等编辑器挂载完成（复用 RichEditor.test.tsx 的等待方式）
    await waitFor(() => {
      expect(document.querySelector(".ProseMirror")).toBeTruthy();
    });
    expect(screen.queryByLabelText("下一张")).toBeNull();
  });

  it("注入 onInsertImage 后显示添加图片按钮", async () => {
    render(
      <RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery onInsertImage={vi.fn()} />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("添加图片")).toBeTruthy();
    });
  });
});
```

注意:此测试依赖 Task 5 的 `enableImageGallery` prop,因此 **Task 4 与 Task 5 完成后才能全绿**。执行顺序:先写本测试(红)→ Task 4 Step 2 实现 NodeView → Task 5 实现 prop/storage → 回来跑绿 → 按文件归属分两次 commit(Task 4 提交 NodeView 与扩展改动,Task 5 提交 prop/storage 与本测试文件)。不要用 `it.todo` 绕过。

- [ ] **Step 2: 实现 `nodes/image-gallery-node-view.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { cn } from "@repo/ui";
import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";
import type { ImageGalleryStorage } from "../extensions/image-gallery";
import type { ImageInsertHandlers } from "../types";

// NodeViewContent 的泛型 props 收窄（同 CodeBlockView 的处理）
type AnyNodeViewContent = React.ComponentType<{ as?: string; className?: string }>;
const TypedNodeViewContent = NodeViewContent as AnyNodeViewContent;

const NAV_BUTTON_CLASSES = cn(
  "absolute top-1/2 -translate-y-1/2 z-10 inline-flex size-8 items-center justify-center",
  "rounded-full border-0 bg-black/45 text-white cursor-pointer",
  "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
  "disabled:opacity-0 disabled:pointer-events-none",
);

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={direction === "left" ? "10 4 6 8 10 12" : "6 4 10 8 6 12"} />
    </svg>
  );
}

/** imageGallery 的 WYSIWYG NodeView：contentDOM 即横向 scroll-snap 滑道 */
export function ImageGalleryNodeView({ node, editor, getPos, selected }: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = node.childCount;

  // contentDOM 由 Tiptap 渲染，带 data-node-view-content 标记，用 wrapper 查询定位
  const getTrack = () =>
    wrapperRef.current?.querySelector<HTMLElement>("[data-node-view-content]") ?? null;

  useEffect(() => {
    const track = getTrack();
    if (!track) return;
    const handleScroll = () => {
      const width = track.clientWidth || 1;
      setIndex(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / width))));
    };
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, [count]);

  // 删除 slide 后当前页码越界时回夹
  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  const scrollToIndex = (next: number) => {
    const track = getTrack();
    if (!track) return;
    const clamped = Math.min(count - 1, Math.max(0, next));
    const left = clamped * track.clientWidth;
    if (typeof track.scrollTo === "function") {
      track.scrollTo({ left, behavior: "smooth" });
    } else {
      track.scrollLeft = left;
    }
  };

  const storage = editor.storage.imageGallery as ImageGalleryStorage | undefined;
  const requestImageInsert = storage?.requestImageInsert ?? null;

  // 「添加图片」复用工具栏选图流程，但插入位置固定在 gallery 内容末尾；
  // getPos 每次调用现取，避免文档变更后的过期位置
  const handleAddImage = () => {
    if (!requestImageInsert) return;
    const galleryEnd = () => {
      const pos = getPos();
      if (pos === undefined) return null;
      return pos + node.nodeSize - 1;
    };
    const insertAt = (content: Record<string, unknown>) => {
      const pos = galleryEnd();
      if (pos === null) return;
      editor.chain().insertContentAt(pos, content).run();
    };
    const handlers: ImageInsertHandlers = {
      insert: (url, alt) => insertAt({ type: "image", attrs: { src: url, alt: alt ?? "" } }),
      insertLoading: ({ uploadId, aspectRatio, alt }) =>
        insertAt({
          type: "image",
          attrs: {
            src: IMAGE_UPLOAD_PLACEHOLDER_SRC,
            alt: alt ?? "",
            uploadState: "loading",
            uploadId,
            aspectRatio: String(aspectRatio),
          },
        }),
      resolveLoading: (uploadId, url, alt) =>
        editor.chain().resolveImagePlaceholder({ uploadId, src: url, alt }).run(),
      removeLoading: (uploadId) => editor.chain().removeImagePlaceholder({ uploadId }).run(),
    };
    requestImageInsert(handlers);
  };

  return (
    <NodeViewWrapper
      as="div"
      className={cn("my-6", selected && "rounded-2xl outline outline-2 outline-primary -outline-offset-2")}
    >
      <div ref={wrapperRef} className="group relative">
        <TypedNodeViewContent
          as="div"
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto rounded-2xl",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "[&>*]:w-full [&>*]:shrink-0 [&>*]:snap-center [&>*]:snap-always",
          )}
        />
        <div contentEditable={false}>
          <button
            type="button"
            aria-label="上一张"
            className={cn(NAV_BUTTON_CLASSES, "left-3")}
            disabled={index <= 0}
            onClick={() => scrollToIndex(index - 1)}
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            aria-label="下一张"
            className={cn(NAV_BUTTON_CLASSES, "right-3")}
            disabled={index >= count - 1}
            onClick={() => scrollToIndex(index + 1)}
          >
            <ChevronIcon direction="right" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {Array.from({ length: count }, (_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                aria-label={`跳转到第 ${dotIndex + 1} 张`}
                className={cn(
                  "size-1.5 cursor-pointer rounded-full border-0 p-0 transition-all",
                  dotIndex === index ? "w-4 bg-white" : "bg-white/55",
                )}
                onClick={() => scrollToIndex(dotIndex)}
              />
            ))}
          </div>
          <span className="absolute right-3 top-3 z-10 rounded-full bg-black/45 px-2 py-0.5 text-xs leading-tight text-white">
            {index + 1}/{count}
          </span>
          {requestImageInsert && (
            <button
              type="button"
              aria-label="添加图片"
              className={cn(
                "absolute bottom-3 right-3 z-10 rounded-full bg-black/45 px-2.5 py-1 text-xs text-white",
                "cursor-pointer border-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
              )}
              onClick={handleAddImage}
            >
              ＋ 添加图片
            </button>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
```

在 `image-gallery.ts` 中挂 NodeView(顶部 import `ReactNodeViewRenderer` 自 `@tiptap/react`、`ImageGalleryNodeView`):

```ts
  addNodeView() {
    return ReactNodeViewRenderer(ImageGalleryNodeView);
  },
```

注意:挂上 NodeView 后,Task 2/3 用 `@tiptap/core` 的 `Editor` 建的测试预期仍可运行——既有 `image-upload-placeholder.test.ts` 测的 ImageExtension 同样带 ReactNodeViewRenderer,在该环境下没有问题;那些测试只断言 doc 结构与序列化,不断言 DOM。若真的因 NodeView 抛错,停下在报告中说明,不要通过改被测物(如 extend 掉 addNodeView)绕过。

- [ ] **Step 3: 跑既有测试确认无回归**

Run: `pnpm --filter @repo/editor test src/__tests__/image-gallery.test.ts`
Expected: PASS(Task 2/3 用例在挂 NodeView 后仍绿)。

- [ ] **Step 4: Commit(NodeView 本体;node-view 测试待 Task 5 后一起绿)**

```bash
git add packages/editor/src/nodes/image-gallery-node-view.tsx packages/editor/src/extensions/image-gallery.ts
git commit -m "feat(editor): 轮播 gallery 所见即所得 NodeView"
```

---

### Task 5: RichEditor 开关 + storage 注入

**Files:**
- Modify: `packages/editor/src/hooks/use-rich-editor.ts`
- Modify: `packages/editor/src/RichEditor.tsx`
- Modify: `packages/editor/src/types.ts`
- Test: Task 4 的 `image-gallery-node-view.test.tsx` 在本 task 完成后跑绿

**Interfaces:**
- Produces: `RichEditorProps.enableImageGallery?: boolean`(默认 false;评论场景不受影响);启用时注册 `ImageGalleryExtension` 并把 `onInsertImage` 注入 `editor.storage.imageGallery.requestImageInsert`。

- [ ] **Step 1: types.ts 增加 prop**

在 `RichEditorProps`(`value` 字段附近)追加:

```ts
  /**
   * 启用相邻图片自动成组为轮播（imageGallery 节点）。
   * 仅文章编辑场景开启；评论场景保持普通图片行为。
   */
  enableImageGallery?: boolean;
```

- [ ] **Step 2: use-rich-editor.ts 注册扩展**

`UseRichEditorOptions` 加 `enableImageGallery?: boolean`,解构默认 `false`;extensions 数组在 `ImageExtension.configure(...)` 之后追加:

```ts
        // ⑤.5 相邻图片自动成组轮播（仅文章编辑器启用）
        ...(enableImageGallery ? [ImageGalleryExtension] : []),
```

deps 数组追加 `enableImageGallery`。顶部 import `ImageGalleryExtension`。

- [ ] **Step 3: RichEditor.tsx 透传 + storage 注入**

props 解构处加 `enableImageGallery = false`,传给 `useRichEditor({ ... , enableImageGallery })`。在既有「外部 value 同步」useEffect 附近追加:

```ts
  // gallery NodeView 的「添加图片」按钮借用工具栏的选图流程（storage 注入而非 props 层层透传）
  useEffect(() => {
    if (!editor || !enableImageGallery) return;
    const storage = editor.storage.imageGallery as ImageGalleryStorage | undefined;
    if (!storage) return;
    storage.requestImageInsert = onInsertImage ?? null;
    return () => {
      storage.requestImageInsert = null;
    };
  }, [editor, enableImageGallery, onInsertImage]);
```

顶部 import type `ImageGalleryStorage`(自 `./extensions/image-gallery`)。

- [ ] **Step 4: 跑 Task 4 的 NodeView 测试 + 全包测试**

Run: `pnpm --filter @repo/editor test src/__tests__/image-gallery-node-view.test.tsx`,然后 `pnpm --filter @repo/editor test`
Expected: 全部 PASS(重点回归:`RichEditor.test.tsx` 等评论场景用例不受影响)。

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/types.ts packages/editor/src/hooks/use-rich-editor.ts packages/editor/src/RichEditor.tsx packages/editor/src/__tests__/image-gallery-node-view.test.tsx
git commit -m "feat(editor): RichEditor 开放 enableImageGallery 开关"
```

---

### Task 6: 插图上传支持多选批量

**Files:**
- Modify: `packages/hooks/src/use-editor-image-upload.ts`
- Test: `packages/hooks/src/use-editor-image-upload.test.ts`(追加用例;先读现有用例的 mock 方式并保持一致)

**Interfaces:**
- 行为变更:`handleFileChange` 处理 `event.target.files` 的全部文件 —— 先为每个文件依次插入占位(保证相邻 → 自动成组),再逐个上传替换;单个文件失败只移除自己的占位并报错,不影响其余。

- [ ] **Step 1: 写失败测试**

在 `use-editor-image-upload.test.ts` 追加(mock `readImageAspectRatio`/`prepareImageForUpload` 的方式沿用该文件现有写法):

```ts
it("多选文件：全部先插占位再依次上传替换", async () => {
  const upload = vi.fn().mockResolvedValueOnce("https://e.com/1.png").mockResolvedValueOnce("https://e.com/2.png");
  const { result } = renderHook(() => useEditorImageUpload({ scene: "article", upload }));
  const handlers = {
    insert: vi.fn(),
    insertLoading: vi.fn(),
    resolveLoading: vi.fn(),
    removeLoading: vi.fn(),
  };
  act(() => result.current.handleInsertImageRequest(handlers));

  const fileA = new File(["a"], "a.png", { type: "image/png" });
  const fileB = new File(["b"], "b.png", { type: "image/png" });
  await act(async () => {
    await result.current.handleFileChange({
      target: { files: [fileA, fileB], value: "" },
    } as unknown as ChangeEvent<HTMLInputElement>);
  });

  expect(handlers.insertLoading).toHaveBeenCalledTimes(2);
  expect(handlers.resolveLoading).toHaveBeenCalledTimes(2);
  expect(upload).toHaveBeenCalledTimes(2);
});

it("多选中单个文件上传失败：只移除该文件占位，其余正常", async () => {
  const upload = vi
    .fn()
    .mockRejectedValueOnce(new Error("boom"))
    .mockResolvedValueOnce("https://e.com/2.png");
  const onError = vi.fn();
  const { result } = renderHook(() => useEditorImageUpload({ scene: "article", upload, onError }));
  const handlers = {
    insert: vi.fn(),
    insertLoading: vi.fn(),
    resolveLoading: vi.fn(),
    removeLoading: vi.fn(),
  };
  act(() => result.current.handleInsertImageRequest(handlers));

  await act(async () => {
    await result.current.handleFileChange({
      target: {
        files: [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })],
        value: "",
      },
    } as unknown as ChangeEvent<HTMLInputElement>);
  });

  expect(handlers.removeLoading).toHaveBeenCalledTimes(1);
  expect(handlers.resolveLoading).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @repo/hooks test src/use-editor-image-upload.test.ts`
Expected: 新用例 FAIL(第二个文件被忽略)。

- [ ] **Step 3: 实现**

`handleFileChange` 改为:

```ts
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const handlers = handlersRef.current;
    if (!handlers) return;

    setIsUploading(true);
    try {
      // 先为所有文件插入相邻占位（文章场景下相邻图片会自动成组为轮播），再逐个上传
      const pending: Array<{ file: File; uploadId: string }> = [];
      for (const file of files) {
        const uploadId = createUploadId();
        let aspectRatio = 16 / 9;
        try {
          aspectRatio = await readImageAspectRatio(file);
        } catch {
          aspectRatio = 16 / 9;
        }
        handlers.insertLoading({ uploadId, aspectRatio, alt: file.name });
        pending.push({ file, uploadId });
      }

      for (const { file, uploadId } of pending) {
        try {
          logUploadFileSize(`${scene}:select`, file);
          const prepared = await prepareImageForUpload(
            file,
            scene === "comment" ? "comment" : "article",
          );
          logUploadFileSize(`${scene}:upload`, prepared, {
            originalBytes: file.size,
            originalLabel: formatUploadFileSize(file.size),
            ...(await readUploadDimensions(prepared)),
          });
          const url = await upload(prepared);
          handlers.resolveLoading(uploadId, url, prepared.name);
        } catch (err) {
          // 单文件失败只回收自己的占位，不影响批次内其他文件
          handlers.removeLoading(uploadId);
          onError?.(getImageUploadErrorMessage(err));
        }
      }
    } finally {
      setIsUploading(false);
      handlersRef.current = null;
    }
  };
```

- [ ] **Step 4: 跑 hooks 包全部测试**

Run: `pnpm --filter @repo/hooks test`
Expected: PASS(既有单文件用例不回归)。

- [ ] **Step 5: Commit**

```bash
git add packages/hooks/src/use-editor-image-upload.ts packages/hooks/src/use-editor-image-upload.test.ts
git commit -m "feat(hooks): 编辑器插图支持多选批量上传"
```

---

### Task 7: admin 文章编辑器启用

**Files:**
- Modify: `apps/admin/src/modules/articles/components/ArticleEditorWritingPanel.tsx`(RichEditor 加 `enableImageGallery`;`contentImageInputRef` 的 `<input type="file">` 加 `multiple`)
- Test: `apps/admin/src/modules/articles/components/ArticleEditorWritingPanel.test.tsx`(追加断言;先读该文件现有 mock 结构并保持一致)

**Interfaces:**
- Consumes: Task 5 的 `enableImageGallery`、Task 6 的多文件 `handleFileChange`。
- 范围:仅文章编辑器;`ModerationCorrectContentEditor` 等其他 RichEditor 用法不改。

- [ ] **Step 1: 写失败测试**

在 `ArticleEditorWritingPanel.test.tsx` 追加(该文件若已 mock `@repo/editor`,在 mock 的 RichEditor 上捕获 props 断言;若直接渲染真组件则改为查询 DOM 属性 —— 以现有文件风格为准,下面按「mock 捕获 props」示例):

```tsx
it("文章编辑器启用图片轮播并支持多选插图", () => {
  renderPanel(); // 使用该文件既有的渲染辅助
  // RichEditor 收到 enableImageGallery
  expect(latestRichEditorProps().enableImageGallery).toBe(true);
  // 插图 input 支持多选
  const input = document.querySelector('input[type="file"][accept="image/*"]');
  expect(input?.hasAttribute("multiple")).toBe(true);
});
```

`latestRichEditorProps` 若不存在,按现有 mock 补一个记录最近一次 props 的实现,例如:

```tsx
const richEditorProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock("@repo/editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/editor")>();
  return {
    ...actual,
    RichEditor: (props: Record<string, unknown>) => {
      richEditorProps.current = props;
      return <div data-testid="rich-editor" />;
    },
  };
});
```

(若现有测试已自建 RichEditor mock,把 props 记录合入现有 mock,不要重复 mock。)

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter admin test src/modules/articles/components/ArticleEditorWritingPanel.test.tsx`
Expected: 新用例 FAIL。

- [ ] **Step 3: 实现**

`ArticleEditorWritingPanel.tsx`:
- `<RichEditor …>` 增加 `enableImageGallery`;
- `contentImageInputRef` 对应的 `<input type="file" accept="image/*" …>` 增加 `multiple`。

- [ ] **Step 4: 跑 admin 相关测试**

Run: `pnpm --filter admin test src/modules/articles`,然后 `pnpm --filter admin test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/modules/articles/components/ArticleEditorWritingPanel.tsx apps/admin/src/modules/articles/components/ArticleEditorWritingPanel.test.tsx
git commit -m "feat(admin): 文章编辑器启用图片轮播编辑"
```

---

### Task 8: 全仓回归 + 收尾

- [ ] **Step 1: 全仓测试**

Run: `pnpm test:run`
Expected: 全部 PASS。重点:评论场景 RichEditor(web、moderation)行为零变化;`getMarkdown` 对不含 gallery 的文档零变化。

- [ ] **Step 2: Lint/类型检查**

Run: `pnpm --filter @repo/editor lint && pnpm --filter @repo/hooks lint && pnpm --filter admin lint`(无对应 script 则跑根 `pnpm lint`)
Expected: 无错误。

- [ ] **Step 3: 按 AGENTS.md 输出控制汇报**

报告:做了什么、改了哪些文件、验证了什么(测试命令与结果)、风险。已知需人工验证项(报告中必须列出):
- contentDOM 作为横向滚动容器时,ProseMirror 光标/NodeSelection 在真实浏览器中的表现(spec 风险项);
- 拖拽图片进出 gallery 的体验;
- `&nbsp;` 分隔段落在编辑器中显示为一个空白行是否可接受。
