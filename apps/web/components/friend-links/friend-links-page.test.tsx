import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import type { FriendLinkItemResp } from "@repo/api";
import { FriendLinksPage } from "./friend-links-page";

vi.mock("./friend-links-rules-card", () => ({
  FriendLinksRulesCard: () => <div data-testid="rules-card" />,
}));

vi.mock("./friend-links-list", () => ({
  FriendLinksList: ({ links }: { links: FriendLinkItemResp[] }) => (
    <div data-testid="links-list" data-count={links.length} />
  ),
}));

vi.mock("@repo/ui", () => ({
  FadeInUp: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("FriendLinksPage", () => {
  it("渲染页面标题「一些有趣的友邻」", () => {
    render(<FriendLinksPage links={[]} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText("一些有趣的友邻")).toBeTruthy();
  });

  it("渲染副标题「友情链接」", () => {
    render(<FriendLinksPage links={[]} />);
    expect(screen.getByText("友情链接")).toBeTruthy();
  });

  it("渲染规则卡片和链接列表", () => {
    render(<FriendLinksPage links={[]} />);
    expect(screen.getByTestId("rules-card")).toBeTruthy();
    expect(screen.getByTestId("links-list")).toBeTruthy();
  });

  it("将 links 传递给 FriendLinksList", () => {
    const links: FriendLinkItemResp[] = [
      {
        id: 1,
        name: "Blog A",
        site: "https://a.com",
        seq: 0,
        status: 1,
        created_at: "",
        updated_at: "",
      },
    ];
    render(<FriendLinksPage links={links} />);
    const listEl = screen.getByTestId("links-list");
    expect(listEl.getAttribute("data-count")).toBe("1");
  });
});
