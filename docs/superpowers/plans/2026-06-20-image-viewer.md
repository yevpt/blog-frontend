# 图片全屏预览（ImageViewer）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为文章正文/评论/留言板的 markdown 图片及文章封面提供点击全屏预览，支持缩放、平移、旋转、移动端捏合、键盘与工具栏操作，并为多图画廊预留扩展。

**Architecture:** 三层解耦——渲染层 `@repo/ui` 自建受控组件 `ImageViewer`（复用 React Aria `Modal` + 自写手势 transform 状态机）；状态层 `apps/web` 的 Zustand 单例 `useImageViewer`；触发层为 `MarkdownContent` 事件委托回调与封面 `onClick`。全站只挂一个 viewer 实例，任意触发源调 `open(images, index)` 即可。

**Tech Stack:** React + TypeScript + TailwindCSS + Zustand + react-aria-components；测试 Vitest（`@repo/ui` happy-dom、`apps/web` jsdom、`@repo/markdown` 默认）。

参考设计：`docs/superpowers/specs/2026-06-20-image-viewer-design.md`

---

## 命令速查

- 单包测试：`pnpm --filter @repo/ui test -- <file>`、`pnpm --filter web test -- <file>`、`pnpm --filter @repo/markdown test -- <file>`
- 类型检查：`pnpm -r --if-present check-types`
- icons 构建：`pnpm --filter @repo/icons build`
- commit message 规范见 `.claude/skills/git-commit/SKILL.md`（`<type>(<scope>): <中文主题>`）

---

## Task 1: 新增工具栏图标（zoom-in / zoom-out / rotate-cw / download）

**Files:**

- Create: `packages/icons/svg/zoom-in.svg`
- Create: `packages/icons/svg/zoom-out.svg`
- Create: `packages/icons/svg/rotate-cw.svg`
- Create: `packages/icons/svg/download.svg`
- Generated (勿手改): `packages/icons/src/generated/types.ts`、`packages/icons/src/generated/sprite.ts`

- [ ] **Step 1: 写 4 个 svg 文件**（沿用现有 stroke/currentColor 风格）

`packages/icons/svg/zoom-in.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <path d="m21 21-4.3-4.3"/>
  <path d="M11 8v6"/>
  <path d="M8 11h6"/>
</svg>
```

`packages/icons/svg/zoom-out.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <path d="m21 21-4.3-4.3"/>
  <path d="M8 11h6"/>
</svg>
```

`packages/icons/svg/rotate-cw.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
  <path d="M21 3v5h-5"/>
</svg>
```

`packages/icons/svg/download.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <path d="m7 10 5 5 5-5"/>
  <path d="M12 15V3"/>
</svg>
```

- [ ] **Step 2: 重新生成 sprite/types**

Run: `pnpm --filter @repo/icons build`
Expected: 退出码 0；命令重写 `generated/types.ts` 与 `generated/sprite.ts`。

- [ ] **Step 3: 验证新图标名已注册**

Run: `grep -E "zoom-in|zoom-out|rotate-cw|download" packages/icons/src/generated/types.ts`
Expected: 4 个名称都出现在 `IconName` 联合类型中。

- [ ] **Step 4: 类型检查**

Run: `pnpm --filter @repo/icons check-types`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/icons/svg packages/icons/src/generated
git commit -m "feat(icons): 新增 zoom-in/zoom-out/rotate-cw/download 图标"
```

---

## Task 2: `@repo/ui` ImageViewer 类型定义

**Files:**

- Create: `packages/ui/src/image-viewer/types.ts`

- [ ] **Step 1: 写类型文件**

`packages/ui/src/image-viewer/types.ts`:

```ts
/** 单张可预览图片。结构保持最小，预留 caption/downloadUrl/srcSet 等未来字段。 */
export interface ImageItem {
  src: string;
  alt?: string;
}

/** 预览器内部的变换状态。 */
export interface ViewerTransform {
  scale: number;
  x: number;
  y: number;
  /** 旋转角度，90° 步进。 */
  rotation: number;
}

/** `ImageViewer` 受控 props。 */
export interface ImageViewerProps {
  images: ImageItem[];
  index: number;
  isOpen: boolean;
  onClose: () => void;
  /** 画廊切换回调；未提供则隐藏左右切换。 */
  onIndexChange?: (index: number) => void;
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS（类型文件无引用错误）。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/image-viewer/types.ts
git commit -m "feat(image-viewer): 定义 ImageItem/ViewerTransform/Props 类型"
```

---

## Task 3: 手势变换状态机 `useViewerTransform`（核心）

**Files:**

- Create: `packages/ui/src/image-viewer/internal/use-viewer-transform.ts`
- Test: `packages/ui/src/image-viewer/internal/use-viewer-transform.test.ts`

- [ ] **Step 1: 写失败测试**

`packages/ui/src/image-viewer/internal/use-viewer-transform.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { clamp, useViewerTransform } from "./use-viewer-transform";

describe("clamp", () => {
  it("钳制到上下界", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-2, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});

describe("useViewerTransform", () => {
  it("初始为单位变换", () => {
    const { result } = renderHook(() => useViewerTransform());
    expect(result.current.transform).toEqual({ scale: 1, x: 0, y: 0, rotation: 0 });
  });

  it("zoomIn 放大，zoomOut 不低于最小值 1", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => result.current.zoomIn());
    expect(result.current.transform.scale).toBeGreaterThan(1);
    act(() => {
      result.current.zoomOut();
      result.current.zoomOut();
      result.current.zoomOut();
    });
    expect(result.current.transform.scale).toBe(1);
  });

  it("zoomIn 不超过最大值 5", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => {
      for (let i = 0; i < 20; i++) result.current.zoomIn();
    });
    expect(result.current.transform.scale).toBeLessThanOrEqual(5);
  });

  it("rotate 以 90° 步进并在 360 处归零", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => result.current.rotate());
    expect(result.current.transform.rotation).toBe(90);
    act(() => {
      result.current.rotate();
      result.current.rotate();
      result.current.rotate();
    });
    expect(result.current.transform.rotation).toBe(0);
  });

  it("双击在放大与还原间切换", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => result.current.handlers.onDoubleClick());
    expect(result.current.transform.scale).toBeGreaterThan(1);
    act(() => result.current.handlers.onDoubleClick());
    expect(result.current.transform).toEqual({ scale: 1, x: 0, y: 0, rotation: 0 });
  });

  it("滚轮向上放大、向下缩小且不破下界", () => {
    const { result } = renderHook(() => useViewerTransform());
    const wheel = (deltaY: number) =>
      ({ deltaY, preventDefault: () => {} }) as unknown as React.WheelEvent;
    act(() => result.current.handlers.onWheel(wheel(-200)));
    expect(result.current.transform.scale).toBeGreaterThan(1);
    act(() => result.current.handlers.onWheel(wheel(2000)));
    expect(result.current.transform.scale).toBe(1);
  });

  it("reset 还原所有变换", () => {
    const { result } = renderHook(() => useViewerTransform());
    act(() => {
      result.current.zoomIn();
      result.current.rotate();
    });
    act(() => result.current.reset());
    expect(result.current.transform).toEqual({ scale: 1, x: 0, y: 0, rotation: 0 });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @repo/ui test -- use-viewer-transform`
Expected: FAIL（`use-viewer-transform` 模块不存在）。

- [ ] **Step 3: 实现 hook**

`packages/ui/src/image-viewer/internal/use-viewer-transform.ts`:

```ts
import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { ViewerTransform } from "../types";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const WHEEL_STEP = 0.0015; // 每单位 deltaY 的缩放系数
const BUTTON_FACTOR = 1.5; // 按钮单次缩放倍率
const DOUBLE_CLICK_SCALE = 2;

const IDENTITY: ViewerTransform = { scale: 1, x: 0, y: 0, rotation: 0 };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface PointerTracker {
  pointers: Map<number, { x: number; y: number }>;
  startDistance: number;
  startScale: number;
}

export interface UseViewerTransformResult {
  transform: ViewerTransform;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  rotate: () => void;
  isZoomed: boolean;
  handlers: {
    onWheel: (e: ReactWheelEvent) => void;
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
    onDoubleClick: () => void;
  };
}

export function useViewerTransform(): UseViewerTransformResult {
  const [transform, setTransform] = useState<ViewerTransform>(IDENTITY);
  const tracker = useRef<PointerTracker>({ pointers: new Map(), startDistance: 0, startScale: 1 });

  const reset = useCallback(() => setTransform(IDENTITY), []);

  const zoomBy = useCallback((factor: number) => {
    setTransform((t) => ({ ...t, scale: clamp(t.scale * factor, MIN_SCALE, MAX_SCALE) }));
  }, []);

  const zoomIn = useCallback(() => zoomBy(BUTTON_FACTOR), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / BUTTON_FACTOR), [zoomBy]);

  const rotate = useCallback(() => {
    setTransform((t) => ({ ...t, rotation: (t.rotation + 90) % 360 }));
  }, []);

  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    const factor = 1 - e.deltaY * WHEEL_STEP;
    setTransform((t) => ({ ...t, scale: clamp(t.scale * factor, MIN_SCALE, MAX_SCALE) }));
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const { pointers } = tracker.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      tracker.current.startDistance = Math.hypot(a.x - b.x, a.y - b.y);
      setTransform((t) => {
        tracker.current.startScale = t.scale;
        return t;
      });
    }
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    const { pointers } = tracker.current;
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, next);

    if (pointers.size === 1) {
      // 单指/鼠标拖拽平移（仅在已放大时生效）
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      setTransform((t) => (t.scale <= MIN_SCALE ? t : { ...t, x: t.x + dx, y: t.y + dy }));
    } else if (pointers.size === 2 && tracker.current.startDistance > 0) {
      // 双指捏合缩放
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = distance / tracker.current.startDistance;
      setTransform((t) => ({
        ...t,
        scale: clamp(tracker.current.startScale * factor, MIN_SCALE, MAX_SCALE),
      }));
    }
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    const { pointers } = tracker.current;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) tracker.current.startDistance = 0;
  }, []);

  const onDoubleClick = useCallback(() => {
    setTransform((t) => (t.scale > MIN_SCALE ? IDENTITY : { ...t, scale: DOUBLE_CLICK_SCALE }));
  }, []);

  return {
    transform,
    reset,
    zoomIn,
    zoomOut,
    rotate,
    isZoomed: transform.scale > MIN_SCALE,
    handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp, onDoubleClick },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @repo/ui test -- use-viewer-transform`
Expected: PASS（全部用例）。

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/image-viewer/internal/use-viewer-transform.ts packages/ui/src/image-viewer/internal/use-viewer-transform.test.ts
git commit -m "feat(image-viewer): 实现手势缩放/平移/旋转状态机"
```

---

## Task 4: 工具栏 `ImageViewerToolbar`

**Files:**

- Create: `packages/ui/src/image-viewer/internal/toolbar.tsx`

- [ ] **Step 1: 写工具栏组件**（无独立测试，行为由 Task 5 的组件测试覆盖）

`packages/ui/src/image-viewer/internal/toolbar.tsx`:

```tsx
"use client";

import { SvgIcon } from "@repo/icons";

export interface ImageViewerToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onClose: () => void;
  downloadUrl: string;
  downloadName?: string;
}

const BTN =
  "flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60";

export function ImageViewerToolbar({
  onZoomIn,
  onZoomOut,
  onRotate,
  onClose,
  downloadUrl,
  downloadName,
}: ImageViewerToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur">
      <button type="button" aria-label="缩小" className={BTN} onClick={onZoomOut}>
        <SvgIcon name="zoom-out" size={20} />
      </button>
      <button type="button" aria-label="放大" className={BTN} onClick={onZoomIn}>
        <SvgIcon name="zoom-in" size={20} />
      </button>
      <button type="button" aria-label="旋转" className={BTN} onClick={onRotate}>
        <SvgIcon name="rotate-cw" size={20} />
      </button>
      {/* 跨域外链无法强制下载时降级为新标签打开 */}
      <a
        href={downloadUrl}
        download={downloadName ?? ""}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="下载"
        className={BTN}
      >
        <SvgIcon name="download" size={20} />
      </a>
      <button type="button" aria-label="关闭预览" className={BTN} onClick={onClose}>
        <SvgIcon name="close" size={20} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/image-viewer/internal/toolbar.tsx
git commit -m "feat(image-viewer): 新增底部操作工具栏"
```

---

## Task 5: 主组件 `ImageViewer` + barrel + 导出

**Files:**

- Create: `packages/ui/src/image-viewer/image-viewer.tsx`
- Create: `packages/ui/src/image-viewer/index.ts`
- Test: `packages/ui/src/image-viewer/image-viewer.test.tsx`
- Modify: `packages/ui/src/index.ts`（追加导出）

- [ ] **Step 1: 写失败测试**

`packages/ui/src/image-viewer/image-viewer.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageViewer } from "./image-viewer";

const imgs = [
  { src: "https://example.com/a.jpg", alt: "图A" },
  { src: "https://example.com/b.jpg", alt: "图B" },
];

describe("ImageViewer", () => {
  it("isOpen=false 不渲染对话框", () => {
    render(<ImageViewer images={imgs} index={0} isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("isOpen=true 渲染当前图片", () => {
    render(<ImageViewer images={imgs} index={0} isOpen onClose={() => {}} />);
    const img = screen.getByAltText("图A") as HTMLImageElement;
    expect(img.src).toContain("a.jpg");
  });

  it("点击关闭按钮触发 onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ImageViewer images={imgs} index={0} isOpen onClose={onClose} />);
    await user.click(screen.getByLabelText("关闭预览"));
    expect(onClose).toHaveBeenCalled();
  });

  it("多图时显示上下张按钮并回调 onIndexChange", async () => {
    const onIndexChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ImageViewer
        images={imgs}
        index={0}
        isOpen
        onClose={() => {}}
        onIndexChange={onIndexChange}
      />,
    );
    await user.click(screen.getByLabelText("下一张"));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("单图时不显示切换按钮", () => {
    render(<ImageViewer images={[imgs[0]]} index={0} isOpen onClose={() => {}} />);
    expect(screen.queryByLabelText("下一张")).not.toBeInTheDocument();
  });

  it("点击放大后再缩小不报错且渲染稳定", () => {
    render(<ImageViewer images={imgs} index={0} isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText("放大"));
    fireEvent.click(screen.getByLabelText("缩小"));
    expect(screen.getByAltText("图A")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @repo/ui test -- image-viewer`
Expected: FAIL（`image-viewer` 组件不存在）。

- [ ] **Step 3: 写主组件**

`packages/ui/src/image-viewer/image-viewer.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { SvgIcon } from "@repo/icons";
import { Modal } from "../modal";
import { ImageViewerToolbar } from "./internal/toolbar";
import { useViewerTransform } from "./internal/use-viewer-transform";
import type { ImageViewerProps } from "./types";

const NAV_BTN =
  "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/90 transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60";

export function ImageViewer({ images, index, isOpen, onClose, onIndexChange }: ImageViewerProps) {
  const { transform, reset, zoomIn, zoomOut, rotate, handlers } = useViewerTransform();
  const current = images[index];
  const hasGallery = images.length > 1 && !!onIndexChange;

  // 切换图片或开关时重置变换
  useEffect(() => {
    reset();
  }, [index, isOpen, reset]);

  const goPrev = () => onIndexChange?.((index - 1 + images.length) % images.length);
  const goNext = () => onIndexChange?.((index + 1) % images.length);

  // 键盘左右切换
  useEffect(() => {
    if (!isOpen || !hasGallery) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // goPrev/goNext 依赖 index、images.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasGallery, index, images.length]);

  if (!current) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable
      role="dialog"
      aria-label="图片预览"
      overlayClassName="bg-black/80 backdrop-blur-md"
      positionerClassName="items-center justify-center p-0"
      modalClassName="!h-dvh !w-screen !max-w-none !rounded-none !border-0 !bg-transparent !shadow-none"
      dialogClassName="relative h-dvh w-screen"
    >
      <div
        data-testid="image-viewer-stage"
        className="relative flex h-dvh w-screen touch-none items-center justify-center overflow-hidden"
        onWheel={handlers.onWheel}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerUp}
        onDoubleClick={handlers.onDoubleClick}
        onClick={(e) => {
          // 点击图片以外的暗区关闭
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={current.src}
          alt={current.alt ?? ""}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
            cursor: transform.scale > 1 ? "grab" : "default",
          }}
        />
      </div>

      {hasGallery && (
        <>
          <button
            type="button"
            aria-label="上一张"
            className={`${NAV_BTN} left-4`}
            onClick={goPrev}
          >
            <SvgIcon name="chevron-left" size={24} />
          </button>
          <button
            type="button"
            aria-label="下一张"
            className={`${NAV_BTN} right-4`}
            onClick={goNext}
          >
            <SvgIcon name="chevron-right" size={24} />
          </button>
        </>
      )}

      <ImageViewerToolbar
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onRotate={rotate}
        onClose={onClose}
        downloadUrl={current.src}
        downloadName={current.alt}
      />
    </Modal>
  );
}
```

- [ ] **Step 4: 写 barrel**

`packages/ui/src/image-viewer/index.ts`:

```ts
export { ImageViewer } from "./image-viewer";
export type { ImageItem, ImageViewerProps, ViewerTransform } from "./types";
```

- [ ] **Step 5: 追加到包入口**

在 `packages/ui/src/index.ts` 末尾追加：

```ts
export {
  ImageViewer,
  type ImageItem,
  type ImageViewerProps,
  type ViewerTransform,
} from "./image-viewer";
```

- [ ] **Step 6: 运行测试确认通过**

Run: `pnpm --filter @repo/ui test -- image-viewer`
Expected: PASS。

> 若 happy-dom 缺少 `setPointerCapture`，hook 已用可选链 `?.` 保护，不影响测试。

- [ ] **Step 7: 类型检查**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/image-viewer packages/ui/src/index.ts
git commit -m "feat(image-viewer): 实现受控预览主组件并对外导出"
```

---

## Task 6: `apps/web` Zustand store `useImageViewer`

**Files:**

- Create: `apps/web/store/use-image-viewer.ts`
- Test: `apps/web/store/use-image-viewer.test.ts`

- [ ] **Step 1: 写失败测试**

`apps/web/store/use-image-viewer.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useImageViewer } from "./use-image-viewer";

const imgs = [
  { src: "a.jpg", alt: "A" },
  { src: "b.jpg", alt: "B" },
];

beforeEach(() => {
  useImageViewer.setState({ isOpen: false, images: [], index: 0 });
});

describe("useImageViewer", () => {
  it("open 设置图片与索引并打开", () => {
    useImageViewer.getState().open(imgs, 1);
    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    expect(s.images).toHaveLength(2);
    expect(s.index).toBe(1);
  });

  it("open 空数组不打开", () => {
    useImageViewer.getState().open([], 0);
    expect(useImageViewer.getState().isOpen).toBe(false);
  });

  it("open 越界索引被钳制", () => {
    useImageViewer.getState().open(imgs, 9);
    expect(useImageViewer.getState().index).toBe(1);
  });

  it("setIndex 钳制到有效范围", () => {
    useImageViewer.getState().open(imgs, 0);
    useImageViewer.getState().setIndex(-3);
    expect(useImageViewer.getState().index).toBe(0);
  });

  it("close 关闭", () => {
    useImageViewer.getState().open(imgs, 0);
    useImageViewer.getState().close();
    expect(useImageViewer.getState().isOpen).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- use-image-viewer`
Expected: FAIL（store 不存在）。

- [ ] **Step 3: 实现 store**

`apps/web/store/use-image-viewer.ts`:

```ts
import { create } from "zustand";
import type { ImageItem } from "@repo/ui";

interface ImageViewerStore {
  isOpen: boolean;
  images: ImageItem[];
  index: number;
  open: (images: ImageItem[], index: number) => void;
  close: () => void;
  setIndex: (index: number) => void;
}

const clampIndex = (index: number, length: number) =>
  Math.min(Math.max(index, 0), Math.max(length - 1, 0));

export const useImageViewer = create<ImageViewerStore>((set) => ({
  isOpen: false,
  images: [],
  index: 0,
  open: (images, index) => {
    if (images.length === 0) return;
    set({ isOpen: true, images, index: clampIndex(index, images.length) });
  },
  close: () => set({ isOpen: false }),
  setIndex: (index) => set((s) => ({ index: clampIndex(index, s.images.length) })),
}));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- use-image-viewer`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/store/use-image-viewer.ts apps/web/store/use-image-viewer.test.ts
git commit -m "feat(web): 新增图片预览全局 store"
```

---

## Task 7: `ImageViewerHost` 并挂载到全局

**Files:**

- Create: `apps/web/components/common/image-viewer-host.tsx`
- Modify: `apps/web/app/providers/global-modals.tsx`

- [ ] **Step 1: 写 host 组件**

`apps/web/components/common/image-viewer-host.tsx`:

```tsx
"use client";

import { ImageViewer } from "@repo/ui";
import { useImageViewer } from "@/store/use-image-viewer";

export function ImageViewerHost() {
  const isOpen = useImageViewer((s) => s.isOpen);
  const images = useImageViewer((s) => s.images);
  const index = useImageViewer((s) => s.index);
  const close = useImageViewer((s) => s.close);
  const setIndex = useImageViewer((s) => s.setIndex);

  return (
    <ImageViewer
      images={images}
      index={index}
      isOpen={isOpen}
      onClose={close}
      onIndexChange={setIndex}
    />
  );
}
```

- [ ] **Step 2: 挂载到 GlobalModals**

修改 `apps/web/app/providers/global-modals.tsx`，导入并在 fragment 内加 `<ImageViewerHost />`：

```tsx
"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

import { SnippetModal } from "@/components/snippets/snippet-modal";
import { ImageViewerHost } from "@/components/common/image-viewer-host";

export function GlobalModals() {
  return (
    <>
      <LoginModal />
      <SnippetModal />
      <ImageViewerHost />
      <ToastRegion queue={toastQueue} />
    </>
  );
}
```

- [ ] **Step 3: 类型检查**

Run: `pnpm --filter web check-types`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/common/image-viewer-host.tsx apps/web/app/providers/global-modals.tsx
git commit -m "feat(web): 全局挂载图片预览 host"
```

---

## Task 8: `MarkdownContent` 图片点击委托 + `onImagePreview`

**Files:**

- Modify: `packages/markdown/src/markdown-content.tsx`
- Test: `packages/markdown/src/markdown-content.test.tsx`（追加用例）

- [ ] **Step 1: 追加失败测试**

在 `packages/markdown/src/markdown-content.test.tsx` 末尾追加：

```tsx
import { fireEvent } from "@testing-library/react";

describe("MarkdownContent 图片预览", () => {
  it("点击图片以 (images, index) 调用 onImagePreview", () => {
    const onImagePreview = vi.fn();
    const html = '<p><img src="x.jpg" alt="第一张"><img src="y.jpg" alt="第二张"></p>';
    render(<MarkdownContent html={html} onImagePreview={onImagePreview} />);
    const second = screen.getByAltText("第二张");
    fireEvent.click(second);
    expect(onImagePreview).toHaveBeenCalledWith(
      [
        { src: "x.jpg", alt: "第一张" },
        { src: "y.jpg", alt: "第二张" },
      ],
      1,
    );
  });

  it("未传 onImagePreview 时点击图片不报错", () => {
    const html = '<p><img src="x.jpg" alt="图"></p>';
    render(<MarkdownContent html={html} />);
    expect(() => fireEvent.click(screen.getByAltText("图"))).not.toThrow();
  });
});
```

> 若该测试文件顶部尚未引入 `vi` / `screen` / `render`，沿用文件已有 import 即可（已存在）。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @repo/markdown test -- markdown-content`
Expected: FAIL（`onImagePreview` 未实现）。

- [ ] **Step 3: 修改组件**

在 `packages/markdown/src/markdown-content.tsx` 中：

(a) 扩展 props 接口，新增字段：

```tsx
export interface MarkdownContentProps {
  /** 已由 markdownToHtml 渲染好的 HTML 字符串 */
  html: string;
  variant?: "article" | "comment";
  className?: string;
  /** 点击正文图片时回调（已渲染的原生 img 用事件委托捕获）。 */
  onImagePreview?: (images: { src: string; alt?: string }[], index: number) => void;
}
```

(b) 函数签名解构加入 `onImagePreview`：

```tsx
export function MarkdownContent({ html, variant = "article", className, onImagePreview }: MarkdownContentProps) {
```

(c) 在 `handleClick` 内、复制按钮逻辑**之前**插入图片分支：

```tsx
    const handleClick = (event: MouseEvent) => {
      // 图片预览：点击正文 <img> 收集同容器全部图片
      const img = (event.target as Element).closest<HTMLImageElement>("img");
      if (img && onImagePreview) {
        const all = Array.from(container.querySelectorAll("img"));
        const items = all.map((el) => ({
          src: el.currentSrc || el.src,
          alt: el.alt || undefined,
        }));
        const index = all.indexOf(img);
        if (index >= 0) onImagePreview(items, index);
        return;
      }

      const btn = (event.target as Element).closest<HTMLButtonElement>(".md-copy-btn");
      // ...原有复制逻辑不变...
```

(d) effect 依赖数组由 `[]` 改为 `[onImagePreview]`：

```tsx
  }, [onImagePreview]);
```

(e) 容器 className 在有回调时加图片光标提示：

```tsx
<div
  ref={containerRef}
  className={clsx(VARIANT_CLASSES[variant], onImagePreview && "[&_img]:cursor-zoom-in", className)}
  dangerouslySetInnerHTML={{ __html: html }}
/>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @repo/markdown test -- markdown-content`
Expected: PASS（新旧用例全过）。

- [ ] **Step 5: 类型检查**

Run: `pnpm --filter @repo/markdown check-types`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add packages/markdown/src/markdown-content.tsx packages/markdown/src/markdown-content.test.tsx
git commit -m "feat(markdown): MarkdownContent 支持图片点击预览回调"
```

---

## Task 9: `PreviewableMarkdown` 包装组件并替换调用点

**Files:**

- Create: `apps/web/components/common/previewable-markdown.tsx`
- Test: `apps/web/components/common/previewable-markdown.test.tsx`
- Modify: `apps/web/components/article-detail/article-content.tsx`
- Modify: `apps/web/components/comments/comment-item.tsx`
- Modify: `apps/web/components/comments/comment-replies.tsx`
- Modify: `apps/web/components/guestbook/guestbook-item.tsx`

- [ ] **Step 1: 写失败测试**

`apps/web/components/common/previewable-markdown.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreviewableMarkdown } from "./previewable-markdown";
import { useImageViewer } from "@/store/use-image-viewer";

beforeEach(() => {
  useImageViewer.setState({ isOpen: false, images: [], index: 0 });
});

describe("PreviewableMarkdown", () => {
  it("点击图片打开全局预览 store", () => {
    const html = '<p><img src="z.jpg" alt="封图"></p>';
    render(<PreviewableMarkdown html={html} />);
    fireEvent.click(screen.getByAltText("封图"));
    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    expect(s.images[0]).toEqual({ src: "z.jpg", alt: "封图" });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- previewable-markdown`
Expected: FAIL（组件不存在）。

- [ ] **Step 3: 写包装组件**

`apps/web/components/common/previewable-markdown.tsx`:

```tsx
"use client";

import { MarkdownContent, type MarkdownContentProps } from "@repo/markdown";
import { useImageViewer } from "@/store/use-image-viewer";

/** 在 MarkdownContent 基础上把图片点击接到全局预览 store。 */
export function PreviewableMarkdown(props: Omit<MarkdownContentProps, "onImagePreview">) {
  const open = useImageViewer((s) => s.open);
  return <MarkdownContent {...props} onImagePreview={open} />;
}
```

- [ ] **Step 4: 替换四处调用点**

将以下文件中对 `MarkdownContent` 的渲染替换为 `PreviewableMarkdown`（仅改组件名与 import，props 不变）：

- `apps/web/components/article-detail/article-content.tsx`：
  `import { MarkdownContent } from "@repo/markdown";` → `import { PreviewableMarkdown } from "@/components/common/previewable-markdown";`，
  `<MarkdownContent html={contentHtml} variant="article" />` → `<PreviewableMarkdown html={contentHtml} variant="article" />`
- `apps/web/components/comments/comment-item.tsx`（第 37 行 return）：保留 `markdownToHtmlSync` 的 import，仅把 `MarkdownContent` 换成 `PreviewableMarkdown`：
  `import { markdownToHtmlSync } from "@repo/markdown";`
  `import { PreviewableMarkdown } from "@/components/common/previewable-markdown";`
  `return <PreviewableMarkdown html={html} variant="comment" />;`
- `apps/web/components/comments/comment-replies.tsx`（第 43 行 return）：同上替换。
- `apps/web/components/guestbook/guestbook-item.tsx`（第 20 行 return）：同上替换。

> 注意：这些文件原先从 `@repo/markdown` 同时导入了 `markdownToHtmlSync` 与 `MarkdownContent`；改后 `markdownToHtmlSync` 仍从 `@repo/markdown` 导入，`MarkdownContent` 这一项从 import 中移除。

- [ ] **Step 5: 运行相关测试确认通过**

Run: `pnpm --filter web test -- previewable-markdown comment-item comment-replies guestbook-item`
Expected: PASS（若上述组件已有测试且因 import 改动失败，更新其断言/mock；预览组件结构未变，通常无需改）。

- [ ] **Step 6: 类型检查**

Run: `pnpm --filter web check-types`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/common/previewable-markdown.tsx apps/web/components/common/previewable-markdown.test.tsx apps/web/components/article-detail/article-content.tsx apps/web/components/comments/comment-item.tsx apps/web/components/comments/comment-replies.tsx apps/web/components/guestbook/guestbook-item.tsx
git commit -m "feat(web): 正文/评论/留言板 markdown 图片接入预览"
```

---

## Task 10: 文章封面点击预览

**Files:**

- Modify: `apps/web/components/article-detail/article-hero.tsx`
- Test: `apps/web/components/article-detail/article-hero.test.tsx`（追加用例）

- [ ] **Step 1: 追加失败测试**

在 `apps/web/components/article-detail/article-hero.test.tsx` 末尾追加：

```tsx
import { fireEvent } from "@testing-library/react";
import { useImageViewer } from "@/store/use-image-viewer";

describe("ArticleHero 封面预览", () => {
  it("点击封面以单图打开预览 store", () => {
    useImageViewer.setState({ isOpen: false, images: [], index: 0 });
    render(
      <ArticleHero
        article={{ ...base, cover_img_url: "https://example.com/cover.jpg", title: "标题" }}
      />,
    );
    fireEvent.click(screen.getByLabelText("查看封面大图"));
    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    expect(s.images[0]).toEqual({ src: "https://example.com/cover.jpg", alt: "标题" });
  });
});
```

> `base` 为该测试文件已存在的基础 article fixture（见文件顶部）。如需要，沿用其已有 import（`render`、`screen`、`describe`、`it`、`expect`）。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- article-hero`
Expected: FAIL（无 "查看封面大图" 按钮）。

- [ ] **Step 3: 修改组件**

在 `apps/web/components/article-detail/article-hero.tsx`：

(a) 顶部加 import 与 store hook：

```tsx
import { useImageViewer } from "@/store/use-image-viewer";
```

在组件体内（其他 hooks 旁）：

```tsx
const openViewer = useImageViewer((s) => s.open);
```

(b) 把封面 `<div>` 容器换成可点击 `<button>`：

```tsx
{
  article.cover_img_url && (
    <button
      type="button"
      aria-label="查看封面大图"
      onClick={() => openViewer([{ src: article.cover_img_url!, alt: article.title }], 0)}
      className="group relative mb-8 block aspect-video w-full cursor-zoom-in overflow-hidden rounded-2xl"
    >
      <LoadingImage
        src={article.cover_img_url}
        alt={article.title}
        fill
        className="object-cover object-center"
        priority
      />
    </button>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- article-hero`
Expected: PASS。

- [ ] **Step 5: 类型检查**

Run: `pnpm --filter web check-types`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/article-detail/article-hero.tsx apps/web/components/article-detail/article-hero.test.tsx
git commit -m "feat(web): 文章封面支持点击全屏预览"
```

---

## Task 11: 全量校验与浏览器验证

**Files:** 无新增（收尾）

- [ ] **Step 1: 全仓库类型 + lint + 测试**

Run:

```bash
pnpm -r --if-present check-types && pnpm -r --if-present lint && pnpm -r --if-present test
```

Expected: 全部 PASS（pre-commit 也会跑 check-types/lint）。

- [ ] **Step 2: 浏览器验证（preview 工具）**

启动 web dev server，打开一篇含正文图片且有封面的文章：

- 点击封面 → 全屏预览打开，可滚轮缩放、拖拽、旋转、ESC/关闭按钮关闭。
- 点击正文图片 → 预览打开。
- 缩小到底限 1×、放大到上限 5×。
- 移动端尺寸（preview_resize）下双击放大、捏合（如工具支持）；至少验证布局占满屏。
- 评论区图片点击可预览。
  截图留证（preview_screenshot）。

- [ ] **Step 3: 最终提交（若验证中有微调）**

```bash
git add -A
git commit -m "test(image-viewer): 收尾校验与样式微调"
```

> 若 Step 1/2 全绿且无改动，跳过本步。

---

## Self-Review 记录

- **Spec 覆盖**：正文图片(Task 8/9)、评论+留言板(Task 9)、封面(Task 10)、缩放/平移/旋转/捏合/双击(Task 3)、滚轮(Task 3)、键盘+工具栏+ESC(Task 5)、画廊预留(类型与 onIndexChange，Task 2/5/6)、自建 @repo/ui(Task 2–5)、Zustand 在 app 层(Task 6)、解耦回调注入(Task 8/9)、下载降级(Task 4)、安全只读 DOM(Task 8)。均有对应任务。
- **类型一致**：`ImageItem`(@repo/ui) 贯穿 store/host/viewer；`onImagePreview` 签名 `(images, index)` 与 `store.open` 一致；`useViewerTransform` 的 `handlers`/`zoomIn` 等命名在 Task 3 定义、Task 5 调用一致。
- **无占位符**：各步骤含完整代码与命令。
- **已知风险**：happy-dom 的 `setPointerCapture` 缺失已用可选链规避；跨域下载降级为新标签；封面改 `<button>` 已保留 aria-label 与焦点样式。
