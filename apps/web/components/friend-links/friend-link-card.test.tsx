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
  }: {
    src: string;
    alt: string;
    className?: string;
    sizes?: string;
  }) => <img src={src} alt={alt} className={className} sizes={sizes} />,
}));

const base: FriendLinkItemResp = {
  id: 1,
  name: "YEVPT Blog",
  description: "我喜欢要么极度悲伤要么淡淡温暖。",
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
    expect(screen.getByText("我喜欢要么极度悲伤要么淡淡温暖。")).toBeTruthy();
  });

  it("status=1 渲染为可点击链接，href 为 site", () => {
    render(<FriendLinkCard link={base} />);
    const anchor = screen.getByRole("link");
    expect(anchor.getAttribute("href")).toBe("https://www.yevpt.com");
    expect(anchor.getAttribute("target")).toBe("_blank");
  });

  it("status=2 不渲染链接，显示「失联」badge", () => {
    render(<FriendLinkCard link={{ ...base, status: 2 }} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("失联")).toBeTruthy();
  });

  it("status=2 卡片带 cursor-not-allowed class", () => {
    const { container } = render(<FriendLinkCard link={{ ...base, status: 2 }} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("cursor-not-allowed");
  });

  it("无 description 时不渲染简介行", () => {
    render(<FriendLinkCard link={{ ...base, description: undefined }} />);
    expect(screen.queryByText("我喜欢要么极度悲伤要么淡淡温暖。")).toBeNull();
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
