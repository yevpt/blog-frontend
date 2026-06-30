import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MomentImageGrid } from "./moment-image-grid";
import type { MomentMediaResp } from "@repo/api";

vi.mock("@/components/common/loading-image", () => ({
  DeferredNativeImage: ({
    src,
    alt,
    className,
    defer,
    layout,
  }: {
    src: string;
    alt: string;
    className?: string;
    defer?: boolean;
    layout?: string;
  }) => (
    <img
      data-testid="deferred-native"
      data-defer={defer ?? true}
      data-layout={layout ?? "intrinsic"}
      src={src}
      alt={alt}
      className={className}
    />
  ),
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  CdnResponsiveImage: ({
    src,
    alt,
    fill,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
  }) => (
    <img
      data-testid="cdn-responsive"
      src={src}
      alt={alt}
      data-fill={fill ?? false}
      className={className}
    />
  ),
}));

function makeImage(overrides: Partial<MomentMediaResp> = {}): MomentMediaResp {
  return {
    id: 1,
    name: "photo",
    file_type: "image/jpeg",
    url: "/original.jpg",
    access_url: "/access.jpg",
    display_mode: "original",
    size: 100,
    seq: 0,
    ...overrides,
  };
}

describe("MomentImageGrid display_mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("original 单图使用 access_url 并可进入图片查看器", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<MomentImageGrid images={[makeImage()]} onOpen={onOpen} />);

    const img = screen.getByTestId("cdn-responsive");
    expect(img).toHaveAttribute("src", "/access.jpg");

    await user.click(screen.getByRole("button", { name: "查看图片 photo" }));
    expect(onOpen).toHaveBeenCalledWith(0);
  });

  it("blurred 单图使用模糊 access_url 且不进入图片查看器", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <MomentImageGrid
        images={[makeImage({ access_url: "/blurred.jpg", display_mode: "blurred" })]}
        onOpen={onOpen}
      />,
    );

    // 仍只使用后端返回的 access_url
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/blurred.jpg");

    // 没有可点击的查看图片按钮
    expect(screen.queryByRole("button", { name: "查看图片 photo" })).toBeNull();
    await user.click(img);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("gif_placeholder 使用静态占位 access_url、不加载原 GIF、不进入查看器", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <MomentImageGrid
        images={[
          makeImage({
            name: "motion.gif",
            file_type: "image/gif",
            access_url: "/static-placeholder.jpg",
            display_mode: "gif_placeholder",
          }),
        ]}
        onOpen={onOpen}
      />,
    );

    // 使用后端返回的静态占位 access_url，而非原 GIF
    const img = screen.getByTestId("cdn-responsive");
    expect(img).toHaveAttribute("src", "/static-placeholder.jpg");

    expect(screen.queryByRole("button", { name: "查看图片 motion.gif" })).toBeNull();
    await user.click(img);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("original 多图点击第 2 张以原图索引打开查看器", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <MomentImageGrid
        images={[
          makeImage({ id: 1, name: "a", access_url: "/a.jpg" }),
          makeImage({ id: 2, name: "b", access_url: "/b.jpg" }),
        ]}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole("button", { name: "查看图片 b" }));
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it("混合图片：blurred 不打开查看器，original 以原图索引打开", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <MomentImageGrid
        images={[
          makeImage({
            id: 1,
            name: "blurred",
            access_url: "/blurred.jpg",
            display_mode: "blurred",
          }),
          makeImage({ id: 2, name: "ok", access_url: "/ok.jpg", display_mode: "original" }),
        ]}
        onOpen={onOpen}
      />,
    );

    // blurred 不构成可点击按钮
    expect(screen.queryByRole("button", { name: "查看图片 blurred" })).toBeNull();
    // original 是第 0 张可查看图，点击以索引 0 打开
    await user.click(screen.getByRole("button", { name: "查看图片 ok" }));
    expect(onOpen).toHaveBeenCalledWith(0);
  });

  it("id 均为 0 时多图仍使用唯一 key 渲染", () => {
    render(
      <MomentImageGrid
        images={[
          makeImage({ id: 0, name: "a", access_url: "/a.jpg", seq: 1 }),
          makeImage({ id: 0, name: "b", access_url: "/b.jpg", seq: 2 }),
        ]}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

describe("MomentImageGrid reviewOverlay", () => {
  it("单图审核遮罩展示「审核中」且不可打开查看器", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <MomentImageGrid
        images={[
          makeImage({
            access_url: "https://cdn.example.com/preview.jpg",
            display_mode: "blurred",
          }),
        ]}
        reviewOverlay
        visitorPreviewSizing
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText("审核中")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: "photo" });
    expect(img).toHaveAttribute("src", expect.stringContaining("w=480"));
    expect(img.className).toContain("w-full");
    expect(img.className).toContain("max-h-[320px]");
    expect(img.className).toContain("object-contain");
    expect(screen.queryByRole("button", { name: "查看图片 photo" })).toBeNull();
    await user.click(img);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("多图审核遮罩每张图均展示「审核中」", () => {
    render(
      <MomentImageGrid
        reviewOverlay
        visitorPreviewSizing
        images={[
          makeImage({
            id: 1,
            name: "a",
            access_url: "https://cdn.example.com/a.jpg",
            display_mode: "blurred",
          }),
          makeImage({
            id: 2,
            name: "b",
            access_url: "https://cdn.example.com/b.jpg",
            display_mode: "blurred",
          }),
        ]}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getAllByText("审核中")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /查看图片/ })).toBeNull();
  });
});
