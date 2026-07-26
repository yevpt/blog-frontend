import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { TagItemResp } from "@repo/api";
import { TagDetailHeader } from "./tag-detail-header";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(" "),
  FadeInUp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const base: TagItemResp = {
  id: 2,
  name: "React",
  description: "前端框架相关笔记",
  seq: 0,
  article_count: 25,
};

describe("TagDetailHeader", () => {
  it("渲染 # 前缀标签名、描述与文章数", () => {
    render(<TagDetailHeader tag={base} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("#React");
    expect(screen.getByText("前端框架相关笔记")).toBeTruthy();
    expect(screen.getByText("25 篇")).toBeTruthy();
  });

  it("渲染返回全部标签链接", () => {
    render(<TagDetailHeader tag={base} />);
    expect(screen.getByRole("link", { name: /全部标签/ }).getAttribute("href")).toBe("/tags");
  });

  it("渲染该标签的 RSS 订阅链接", () => {
    render(<TagDetailHeader tag={base} />);
    const rss = screen.getByRole("link", { name: /订阅/ });
    expect(rss.getAttribute("href")).toBe("/tags/2/feed.xml");
    expect(rss.getAttribute("target")).toBe("_blank");
  });

  it("无描述时不渲染描述段落", () => {
    render(<TagDetailHeader tag={{ ...base, description: undefined }} />);
    expect(screen.queryByText("前端框架相关笔记")).toBeNull();
  });
});
