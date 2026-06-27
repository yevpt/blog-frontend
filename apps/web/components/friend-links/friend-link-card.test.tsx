import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { FriendLinkItemResp } from "@repo/api";
import { FriendLinkCard } from "./friend-link-card";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    sizes,
    fill,
  }: {
    src: string;
    alt: string;
    className?: string;
    sizes?: string;
    fill?: boolean;
  }) => <img src={src} alt={alt} className={className} sizes={sizes} data-fill={fill} />,
}));

vi.mock("@repo/hooks", () => ({
  useDeferredMediaActivation: () => true,
  useImageLoadPlaceholder: () => ({
    isLoading: false,
    state: undefined,
    hideImage: false,
    renderPlaceholder: false,
    placeholderOpaque: false,
    animateImage: false,
  }),
  shouldDeferRemoteMediaSrc: () => false,
}));

vi.mock("@/hooks/use-deferred-media-activation", () => ({
  useDeferredMediaActivation: () => true,
}));

const base: FriendLinkItemResp = {
  id: 1,
  name: "YEVPT Blog",
  description: "浮墨几许，落于此刻",
  site: "https://www.yevpt.com",
  seq: 0,
  status: 1,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("FriendLinkCard", () => {
  it("渲染名称和简介", () => {
    render(<FriendLinkCard link={base} />);
    expect(screen.getByText("YEVPT Blog")).toBeTruthy();
    expect(screen.getByText("浮墨几许，落于此刻")).toBeTruthy();
  });

  it("status=1 渲染为可点击链接，href 为 site", () => {
    render(<FriendLinkCard link={base} />);
    const anchor = screen.getByRole("link");
    expect(anchor.getAttribute("href")).toBe("https://www.yevpt.com");
    expect(anchor.getAttribute("target")).toBe("_blank");
  });

  it("status=2 仍渲染为可点击链接，href 为 site", () => {
    render(<FriendLinkCard link={{ ...base, status: 2 }} />);
    const anchor = screen.getByRole("link");
    expect(anchor.getAttribute("href")).toBe("https://www.yevpt.com");
    expect(anchor.getAttribute("target")).toBe("_blank");
  });

  it("status=2 不显示「失联」badge，也不使用禁用光标", () => {
    const { container } = render(<FriendLinkCard link={{ ...base, status: 2 }} />);
    const anchor = container.firstChild as HTMLElement;
    expect(screen.queryByText("失联")).toBeNull();
    expect(anchor.className).not.toContain("cursor-not-allowed");
  });

  it("无 description 时不渲染简介行", () => {
    render(<FriendLinkCard link={{ ...base, description: undefined }} />);
    expect(screen.queryByText("浮墨几许，落于此刻")).toBeNull();
  });

  it("无 avatar_url 时渲染首字母占位", () => {
    render(<FriendLinkCard link={{ ...base, avatar_url: undefined }} />);
    expect(screen.getByText("Y")).toBeTruthy();
  });

  it("头像 fill 图片带固定尺寸 sizes，避免 Next Image 告警", () => {
    render(<FriendLinkCard link={{ ...base, avatar_url: "https://example.com/avatar.png" }} />);
    expect(screen.getByRole("img", { name: "YEVPT Blog" })).toHaveAttribute("sizes", "44px");
  });

  it("status=0 不渲染任何内容", () => {
    const { container } = render(<FriendLinkCard link={{ ...base, status: 0 }} />);
    expect(container.firstChild).toBeNull();
  });
});
