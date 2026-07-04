// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RichEditor } from "../RichEditor";
import type { ImageInsertHandlers } from "../types";

const ONE_IMAGE = "![一](https://e.com/1.png)";
const TWO_IMAGES = "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)";

/**
 * chrome 层的高度计算以 <img> 自身的 getBoundingClientRect 为准（wrapper 的
 * offsetHeight 在 max-height 生效时会比图片真实视觉高度大一截，已用真实浏览器
 * 实测确认），因此测试也要 stub 在 img 元素、而不是 slide wrapper 上。
 */
function stubRectHeight(el: Element, height: number) {
  el.getBoundingClientRect = () => ({ height }) as DOMRect;
}

describe("ImageGalleryNodeView", () => {
  it("翻页驱动 Tiptap 自建 contentDOM 滑道（图片横向单屏，与前台一致）", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery />);
    await waitFor(() => {
      expect(screen.getByLabelText("下一张")).toBeTruthy();
    });

    // Tiptap React 对非叶子节点会在 NodeViewContent 内自建真正的 contentDOM，
    // 图片子节点挂在它里面——滑道（flex/scroll-snap/滚动）必须作用于这一层
    const track = document.querySelector<HTMLElement>("[data-node-view-content-react]");
    if (!track) throw new Error("[data-node-view-content-react] 不存在");
    expect(track.children.length).toBe(2);

    // 补齐 jsdom 缺失的布局/滚动能力
    Object.defineProperty(track, "clientWidth", { value: 600, configurable: true });
    let scrollLeft = 0;
    Object.defineProperty(track, "scrollLeft", {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value;
      },
    });
    Object.defineProperty(track, "scrollTo", {
      configurable: true,
      value: (options: ScrollToOptions) => {
        scrollLeft = options.left ?? 0;
        track.dispatchEvent(new Event("scroll"));
      },
    });

    await userEvent.click(screen.getByLabelText("下一张"));
    await waitFor(() => {
      expect(screen.getByText("2/2")).toBeTruthy();
    });
  });

  it("启用 enableImageGallery 时相邻图片渲染为轮播滑道与 chrome", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery />);
    await waitFor(() => {
      expect(screen.getByLabelText("下一张")).toBeTruthy();
    });
    expect(screen.getByLabelText("上一张")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getAllByLabelText(/跳转到第 \d 张/)).toHaveLength(2);
    expect(screen.queryByLabelText("添加图片")).toBeNull();
  });

  it("未启用 enableImageGallery 时不出现轮播 chrome", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} />);
    await waitFor(() => {
      expect(document.querySelector(".ProseMirror")).toBeTruthy();
    });
    expect(screen.queryByLabelText("下一张")).toBeNull();
  });

  it("单图 hover 显示添加图片，插入后自动并组为轮播", async () => {
    const holder: { current: ImageInsertHandlers | null } = { current: null };
    const onInsertImage = vi.fn((handlers: ImageInsertHandlers) => {
      holder.current = handlers;
    });
    render(
      <RichEditor
        value={ONE_IMAGE}
        onChange={vi.fn()}
        enableImageGallery
        onInsertImage={onInsertImage}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("添加图片")).toBeTruthy();
    });
    // 单图此时还不是轮播
    expect(screen.queryByLabelText("下一张")).toBeNull();

    await userEvent.click(screen.getByLabelText("添加图片"));
    expect(onInsertImage).toHaveBeenCalledTimes(1);
    if (!holder.current) throw new Error("onInsertImage 未收到 handlers");
    holder.current.insert("https://e.com/2.png", "二");

    // 新图插在当前图之后，归一化自动并组为轮播
    await waitFor(() => {
      expect(screen.getByLabelText("下一张")).toBeTruthy();
    });
    expect(screen.getByText("1/2")).toBeTruthy();
  });

  it("未启用 enableImageGallery 的单图不显示添加图片", async () => {
    render(<RichEditor value={ONE_IMAGE} onChange={vi.fn()} onInsertImage={vi.fn()} />);
    await waitFor(() => {
      expect(document.querySelector(".ProseMirror")).toBeTruthy();
    });
    expect(screen.queryByLabelText("添加图片")).toBeNull();
  });

  it("gallery 内的 slide 不重复渲染添加图片按钮", async () => {
    render(
      <RichEditor
        value={TWO_IMAGES}
        onChange={vi.fn()}
        enableImageGallery
        onInsertImage={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("下一张")).toBeTruthy();
    });
    expect(screen.getAllByLabelText("添加图片")).toHaveLength(1);
  });

  it("chrome 层贴合当前 slide 的真实渲染框，而非 track 的最大高度（回归：宽高比不同的图会让按钮飘出）", async () => {
    const resizeCallbacks: ResizeObserverCallback[] = [];
    class FakeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);

    try {
      render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery />);
      await waitFor(() => {
        expect(screen.getByLabelText("下一张")).toBeTruthy();
      });

      const track = document.querySelector<HTMLElement>("[data-node-view-content-react]");
      if (!track) throw new Error("[data-node-view-content-react] 不存在");
      const [slideA, slideB] = Array.from(track.children) as HTMLElement[];
      if (!slideA || !slideB) throw new Error("slide 不足两个");
      const imgA = slideA.querySelector("img");
      const imgB = slideB.querySelector("img");
      if (!imgA || !imgB) throw new Error("slide 内没有 img");

      // 模拟两张宽高比差异很大的图：track（由最高的 slideB 撑起）高 400，
      // 当前可见的 slideA 图片只有 160 —— 这正是复现问题的场景
      stubRectHeight(track, 400);
      stubRectHeight(imgA, 160);
      stubRectHeight(imgB, 400);

      // 触发最近注册的 ResizeObserver 回调，模拟图片尺寸就绪/窗口 resize
      act(() => {
        resizeCallbacks[resizeCallbacks.length - 1]?.([], {} as ResizeObserver);
      });

      // chrome 容器（翻页/指示点/计数/添加图片的公共父级）应跟随 slideA 的框：
      // 居中偏移 top = (400-160)/2 = 120，height = 160
      const chrome = screen.getByLabelText("上一张").parentElement;
      if (!chrome) throw new Error("chrome 容器不存在");
      expect(chrome.style.height).toBe("160px");
      expect(chrome.style.top).toBe("120px");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("翻页立即用新页码对应 slide 的尺寸重算，不依赖 ResizeObserver 回调触发（回归：曾因每次同步都重建 observer 而错过图片解码完成的通知，chrome 层停在旧尺寸上）", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery />);
    await waitFor(() => {
      expect(screen.getByLabelText("下一张")).toBeTruthy();
    });

    const track = document.querySelector<HTMLElement>("[data-node-view-content-react]");
    if (!track) throw new Error("[data-node-view-content-react] 不存在");
    const [slideA, slideB] = Array.from(track.children) as HTMLElement[];
    if (!slideA || !slideB) throw new Error("slide 不足两个");
    const imgA = slideA.querySelector("img");
    const imgB = slideB.querySelector("img");
    if (!imgA || !imgB) throw new Error("slide 内没有 img");

    stubRectHeight(track, 400);
    stubRectHeight(imgA, 160);
    stubRectHeight(imgB, 400);

    // 补齐 jsdom 缺失的滚动能力：scrollTo 生效并派发 scroll 事件，
    // 使点击「下一张」真的驱动 index 从 0 变为 1（同 markdown 包的测试手法）
    Object.defineProperty(track, "clientWidth", { value: 600, configurable: true });
    let scrollLeft = 0;
    Object.defineProperty(track, "scrollLeft", {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value;
      },
    });
    Object.defineProperty(track, "scrollTo", {
      configurable: true,
      value: (options: ScrollToOptions) => {
        scrollLeft = options.left ?? 0;
        track.dispatchEvent(new Event("scroll"));
      },
    });

    const chrome = screen.getByLabelText("上一张").parentElement;
    if (!chrome) throw new Error("chrome 容器不存在");

    // 点击翻到 slideB（更高的那张），完全不触发任何 resize 回调
    await userEvent.click(screen.getByLabelText("下一张"));
    await waitFor(() => {
      expect(chrome.style.height).toBe("400px");
    });
    expect(chrome.style.top).toBe("0px");
  });

  it("顶层单图仍保留 my-6（非 gallery 场景的正常间距不受影响）", async () => {
    render(
      <RichEditor value={ONE_IMAGE} onChange={vi.fn()} enableImageGallery onInsertImage={vi.fn()} />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("添加图片")).toBeTruthy();
    });
    const figure = document.querySelector("figure");
    expect(figure?.className.split(" ")).toContain("my-6");
  });

  it("gallery 内的 slide 不带自身 my-6（回归：会让覆盖层飘到图片外面）", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery />);
    await waitFor(() => {
      expect(screen.getByLabelText("下一张")).toBeTruthy();
    });
    // ImageNodeView 复用于 gallery slide；slide 自身不应再带 my-6，
    // 否则定位容器比图片本身高出一圈外边距，翻页/指示点/添加图片按钮会飘到图片外
    const figures = document.querySelectorAll("figure");
    expect(figures.length).toBeGreaterThan(0);
    figures.forEach((figure) => {
      expect(figure.className.split(" ")).not.toContain("my-6");
    });
  });

  it("添加图片按钮 hover/active 态文字仍是白色（回归：ghost 变体会把文字盖成不可见）", async () => {
    render(
      <RichEditor
        value={ONE_IMAGE}
        onChange={vi.fn()}
        enableImageGallery
        onInsertImage={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("添加图片")).toBeTruthy();
    });
    const className = screen.getByLabelText("添加图片").className;
    // ghost 变体自带 hover/active:text-accent-foreground（深色），twMerge 需要
    // 被我们显式的 hover/active:text-white 覆盖，否则悬停时白字会消失在深色背景上
    expect(className).not.toContain("text-accent-foreground");
    expect(className).toContain("hover:text-white");
    expect(className).toContain("active:text-white");
  });

  it("注入 onInsertImage 后显示添加图片按钮", async () => {
    render(
      <RichEditor
        value={TWO_IMAGES}
        onChange={vi.fn()}
        enableImageGallery
        onInsertImage={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("添加图片")).toBeTruthy();
    });
  });
});
