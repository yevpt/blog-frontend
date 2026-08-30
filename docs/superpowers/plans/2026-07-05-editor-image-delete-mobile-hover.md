# 文章编辑器:轮播删图 + 移动端呼出修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 文章编辑器正文的多图轮播增加"删除当前图片"按钮,顶层单图也增加同款删除按钮;所有依赖 hover 呼出的覆盖层按钮(翻页箭头/添加图片/删除)在不支持 hover 的设备(移动端触屏)上改为默认常显。

**Architecture:** 新增一个 Tailwind v4 `@custom-variant can-hover (@media (hover: hover));`,把现有 `opacity-0 group-hover:opacity-100` 可见性写法整体换成 `opacity-100 can-hover:opacity-0 can-hover:group-hover:opacity-100`;删除按钮复用 Tiptap 内置的 `editor.commands.deleteRange({ from, to })` 命令直接删掉图片子节点,轮播"删到剩 1 张自动解组"依赖已有的 `imageGalleryNormalize` appendTransaction 插件,不需要新写合并/解组逻辑。

**Tech Stack:** React 19、Tiptap 3(`@tiptap/core` `@tiptap/react`)、Tailwind CSS v4、`@repo/ui`(`Button`/`cn`)、`@repo/icons`(`SvgIcon`)、Vitest + Testing Library。

## Global Constraints

- 禁止 `any`(用 `unknown` 或精确类型)。
- 非显然逻辑写中文注释。
- 每个改动的组件/Hook 必须有对应测试文件,缺测视为未完成。
- 复用优先:不新增图标资源,`trash`/`plus` 等图标已存在于 `@repo/icons`。
- 设计文档:[docs/superpowers/specs/2026-07-05-editor-image-delete-mobile-hover-design.md](../specs/2026-07-05-editor-image-delete-mobile-hover-design.md)。

---

## Task 1: `can-hover` 自定义变体 + 轮播删除按钮

**Files:**

- Modify: `packages/styles/src/base.css:34-44`(在现有 `@custom-variant dark {...}` 块后新增)
- Modify: `packages/editor/src/nodes/image-gallery-node-view.tsx:12-13,239-257`
- Test: `packages/editor/src/__tests__/image-gallery-node-view.test.tsx`

**Interfaces:**

- Consumes:`ImageGalleryStorage.requestImageInsert`(已存在,来自 `packages/editor/src/extensions/image-gallery.ts`)、Tiptap 内置命令 `editor.commands.deleteRange(range: { from: number; to: number })`。
- Produces:Tailwind 自定义 variant `can-hover:`(供 Task 2 复用);轮播内新增 `aria-label="删除图片"` 的按钮。

- [ ] **Step 1: 在 `base.css` 新增 `can-hover` 变体**

在 `packages/styles/src/base.css` 第 44 行(`@custom-variant dark {...}` 块的结束 `}` 之后、`/* --- Tailwind 设计令牌 --- */` 注释之前)插入:

```css
/*
  can-hover 变体:仅在设备支持真正的 hover(鼠标/触控笔)时生效。
  覆盖层按钮(翻页/添加图片/删除图片)默认常显,支持 hover 的设备才收起靠悬浮呼出,
  否则移动端触屏没有 hover,按钮会永远不可见。
*/
@custom-variant can-hover (@media (hover: hover));
```

- [ ] **Step 2: 写失败测试 — 点击删除按钮移除轮播当前图,剩 1 张自动解组**

在 `packages/editor/src/__tests__/image-gallery-node-view.test.tsx` 文件末尾、`describe` 块的最后一个 `it` 之后(第 283 行 `});` 之前)新增:

```tsx
it("点击删除按钮移除轮播当前这张图片,只剩一张时自动解组为单图", async () => {
  render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery />);
  await waitFor(() => {
    expect(screen.getByLabelText("下一张")).toBeTruthy();
  });
  expect(screen.getByText("1/2")).toBeTruthy();

  await userEvent.click(screen.getByLabelText("删除图片"));

  await waitFor(() => {
    expect(screen.queryByLabelText("下一张")).toBeNull();
  });
  expect(screen.getByAltText("二")).toBeTruthy();
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @repo/editor test -- image-gallery-node-view`
Expected: FAIL,报错内容包含 `Unable to find an element by: [aria-label="删除图片"]`(按钮还不存在)。

- [ ] **Step 4: 实现——改造 `NAV_BUTTON_CLASSES` 并新增删除按钮**

修改 `packages/editor/src/nodes/image-gallery-node-view.tsx` 第 12-13 行,把:

```tsx
const NAV_BUTTON_CLASSES =
  "absolute top-1/2 z-10 size-8 -translate-y-1/2 rounded-full border-0 p-0 bg-black/45 text-white shadow-none hover:bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0";
```

改为:

```tsx
const NAV_BUTTON_CLASSES =
  "absolute top-1/2 z-10 size-8 -translate-y-1/2 rounded-full border-0 p-0 bg-black/45 text-white shadow-none hover:bg-black/60 opacity-100 can-hover:opacity-0 transition-opacity can-hover:group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0";
```

在 `handleAddImage` 函数(第 157-166 行)之后新增 `handleDeleteImage`:

```tsx
// 删除轮播里当前正在查看的这一张;node 是 gallery 节点,child 的绝对
// pos = gallery 起点(getPos())+ 1(跳过 gallery 自身的开始标记)+ forEach 给出的相对 offset
const handleDeleteImage = () => {
  const pos = getPos();
  if (pos === undefined) return;
  let childFrom: number | null = null;
  let childSize = 0;
  node.forEach((child, offset, childIndex) => {
    if (childIndex !== index) return;
    childFrom = pos + 1 + offset;
    childSize = child.nodeSize;
  });
  if (childFrom === null) return;
  editor.commands.deleteRange({ from: childFrom, to: childFrom + childSize });
};
```

把第 239-241 行的计数徽标:

```tsx
<span className="absolute right-3 top-3 z-10 rounded-full bg-black/45 px-2 py-0.5 text-xs leading-tight text-white">
  {index + 1}/{count}
</span>
```

改为删除按钮 + 计数徽标并排的分组容器:

```tsx
<div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
  <Button
    type="button"
    variant="ghost"
    aria-label="删除图片"
    className={cn(
      "h-auto rounded-full border-0 bg-black/45 p-1.5 text-white",
      // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
      "opacity-100 can-hover:opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white can-hover:group-hover:opacity-100 focus-visible:opacity-100",
    )}
    onPress={handleDeleteImage}
  >
    <SvgIcon name="trash" size={14} />
  </Button>
  <span className="rounded-full bg-black/45 px-2 py-0.5 text-xs leading-tight text-white">
    {index + 1}/{count}
  </span>
</div>
```

再把"添加图片"按钮(第 247-251 行)的可见性类:

```tsx
              className={cn(
                "absolute bottom-3 right-3 z-10 h-auto rounded-full border-0 bg-black/45 px-2.5 py-1 text-xs text-white",
                // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
                "opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white group-hover:opacity-100 focus-visible:opacity-100",
              )}
```

改为:

```tsx
              className={cn(
                "absolute bottom-3 right-3 z-10 h-auto rounded-full border-0 bg-black/45 px-2.5 py-1 text-xs text-white",
                // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
                "opacity-100 can-hover:opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white can-hover:group-hover:opacity-100 focus-visible:opacity-100",
              )}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @repo/editor test -- image-gallery-node-view`
Expected: PASS,包括新增的删除用例和已有全部用例。

- [ ] **Step 6: 类型检查与 lint**

Run: `pnpm --filter @repo/editor check-types && pnpm --filter @repo/editor lint`
Expected: 两条命令都无报错退出。

- [ ] **Step 7: Commit**

```bash
git add packages/styles/src/base.css packages/editor/src/nodes/image-gallery-node-view.tsx packages/editor/src/__tests__/image-gallery-node-view.test.tsx
git commit -m "feat(editor): 轮播新增删除图片按钮,覆盖层按钮移动端默认常显"
```

---

## Task 2: 顶层单图删除按钮

**Files:**

- Modify: `packages/editor/src/nodes/image-node-view.tsx:143-163,274-292`
- Test: `packages/editor/src/__tests__/image-gallery-node-view.test.tsx`(该文件已经用 `RichEditor` 覆盖了顶层单图场景,继续在此追加,不新建文件)

**Interfaces:**

- Consumes:Task 1 产出的 Tailwind `can-hover:` 变体;Tiptap 内置命令 `editor.commands.deleteRange`。
- Produces:顶层单图新增 `aria-label="删除图片"` 按钮,且不依赖 `showAddToGallery` / gallery 扩展是否启用。

- [ ] **Step 1: 写失败测试 — 顶层单图删除按钮,且不依赖是否启用轮播扩展**

在 `packages/editor/src/__tests__/image-gallery-node-view.test.tsx` 追加两个用例(接着 Task 1 新增的那个用例之后):

```tsx
it("顶层单图新增删除按钮,点击后该图片节点从文档移除", async () => {
  render(
    <RichEditor value={ONE_IMAGE} onChange={vi.fn()} enableImageGallery onInsertImage={vi.fn()} />,
  );
  await waitFor(() => {
    expect(screen.getByLabelText("删除图片")).toBeTruthy();
  });

  await userEvent.click(screen.getByLabelText("删除图片"));

  await waitFor(() => {
    expect(screen.queryByAltText("一")).toBeNull();
  });
});

it("未启用 enableImageGallery 时顶层单图仍显示删除按钮", async () => {
  render(<RichEditor value={ONE_IMAGE} onChange={vi.fn()} />);
  await waitFor(() => {
    expect(screen.getByLabelText("删除图片")).toBeTruthy();
  });
  expect(screen.queryByLabelText("添加图片")).toBeNull();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @repo/editor test -- image-gallery-node-view`
Expected: FAIL,两条新用例都报 `Unable to find an element by: [aria-label="删除图片"]`。

- [ ] **Step 3: 实现——`image-node-view.tsx` 新增删除按钮与可见性类**

在 `packages/editor/src/nodes/image-node-view.tsx` 第 151 行(`const showAddToGallery = ...`)之后、`handleAddToGallery` 定义(152-163 行)之后新增:

```tsx
// 删除按钮独立于 showAddToGallery:即便 gallery 扩展未启用,顶层图片也能删
const showDeleteImage = isTopLevelImage && hasRemoteSrc && !isPending;

const handleDeleteImage = () => {
  if (!editor || typeof getPos !== "function") return;
  const pos = getPos();
  if (pos === undefined) return;
  editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
};
```

把第 274-292 行的:

```tsx
{
  showAddToGallery ? (
    // 内层容器在图片就绪后是 display:contents，定位上下文取 figure 本身
    <div contentEditable={false} className="absolute bottom-3 right-3 z-10">
      <Button
        type="button"
        variant="ghost"
        aria-label="添加图片"
        className={cn(
          "h-auto rounded-full border-0 bg-black/45 px-2.5 py-1 text-xs text-white",
          // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
          "opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white group-hover:opacity-100 focus-visible:opacity-100",
        )}
        onPress={handleAddToGallery}
      >
        <SvgIcon name="plus" size={14} />
        添加图片
      </Button>
    </div>
  ) : null;
}
```

改为:

```tsx
{
  showDeleteImage || showAddToGallery ? (
    // 内层容器在图片就绪后是 display:contents，定位上下文取 figure 本身
    <div
      contentEditable={false}
      className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5"
    >
      {showDeleteImage ? (
        <Button
          type="button"
          variant="ghost"
          aria-label="删除图片"
          className={cn(
            "h-auto rounded-full border-0 bg-black/45 p-1.5 text-white",
            // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
            "opacity-100 can-hover:opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white can-hover:group-hover:opacity-100 focus-visible:opacity-100",
          )}
          onPress={handleDeleteImage}
        >
          <SvgIcon name="trash" size={14} />
        </Button>
      ) : null}
      {showAddToGallery ? (
        <Button
          type="button"
          variant="ghost"
          aria-label="添加图片"
          className={cn(
            "h-auto rounded-full border-0 bg-black/45 px-2.5 py-1 text-xs text-white",
            // ghost 变体自带 hover/active:text-accent-foreground（深色），会把白字盖成不可见，需显式覆盖
            "opacity-100 can-hover:opacity-0 transition-opacity hover:bg-black/60 hover:text-white active:text-white can-hover:group-hover:opacity-100 focus-visible:opacity-100",
          )}
          onPress={handleAddToGallery}
        >
          <SvgIcon name="plus" size={14} />
          添加图片
        </Button>
      ) : null}
    </div>
  ) : null;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @repo/editor test -- image-gallery-node-view`
Expected: PASS,全部用例(含 Task 1、Task 2 新增的)通过。

- [ ] **Step 5: 类型检查与 lint**

Run: `pnpm --filter @repo/editor check-types && pnpm --filter @repo/editor lint`
Expected: 两条命令都无报错退出。

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/nodes/image-node-view.tsx packages/editor/src/__tests__/image-gallery-node-view.test.tsx
git commit -m "feat(editor): 顶层单图新增删除按钮,独立于添加轮播能力"
```

---

## Task 3: 全量校验

**Files:** 无新增/修改,仅运行既有校验命令。

**Interfaces:**

- Consumes:Task 1、Task 2 的全部改动。
- Produces:确认改动未破坏 `packages/editor` 现有测试、类型、lint,以及 `apps/web` / `apps/admin` 的类型检查(它们通过 `@repo/editor`/`@repo/styles` 间接消费这些文件)。

- [ ] **Step 1: 跑 `packages/editor` 全量测试**

Run: `pnpm --filter @repo/editor test`
Expected: 全部通过,无失败用例。

- [ ] **Step 2: 跑受影响下游包的类型检查**

Run: `pnpm --filter web check-types && pnpm --filter admin check-types`
Expected: 两条命令都无类型错误(用于确认 `can-hover:` 只是字符串类名改动,不影响任何 TS 类型;同时捕获 `deleteRange` 调用签名是否正确)。

- [ ] **Step 3: (可选)本地预览确认视觉效果**

若需要肉眼确认移动端常显效果:用 `preview_start` 启动 `admin-dev` 配置,登录后进入 `/articles/new`,插入两张图片使其自动成组为轮播,分别在桌面宽度(hover 生效,悬浮才出现按钮)和 `preview_resize` 切到 `mobile` 预设(常显删除/添加图片按钮)下检查。此步骤依赖管理后台登录,若无可用账号可跳过,不影响功能正确性判断(已由 Task 1/2 的自动化测试覆盖)。

- [ ] **Step 4: Commit(仅当以上步骤有额外修复)**

若 Step 1-2 全部通过且无需改动,则无需提交;若发现问题并修复,按 Task 1/2 的提交粒度单独提交,commit message 需说明修复的具体问题。
