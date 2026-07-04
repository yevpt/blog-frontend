// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RichEditor } from "../RichEditor";
import type { ImageInsertHandlers } from "../types";

const ONE_IMAGE = "![一](https://e.com/1.png)";
const TWO_IMAGES = "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)";

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
