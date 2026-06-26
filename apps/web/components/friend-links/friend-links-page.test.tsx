import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { FriendLinkItemResp } from "@repo/api";
import { FriendLinksPage } from "./friend-links-page";

vi.mock("./friend-links-rules-card", () => ({
  FriendLinksRulesCard: () => <div data-testid="rules-card" />,
}));

vi.mock("./friend-links-list", () => ({
  FriendLinksList: ({ links }: { links: FriendLinkItemResp[] }) => (
    <div data-testid="links-list" data-count={links.length}>
      {links.map((link) => (
        <div key={link.id}>{link.name}</div>
      ))}
    </div>
  ),
}));

vi.mock("@repo/ui", () => ({
  FadeInUp: ({ children }: { children: ReactNode }) => <>{children}</>,
  Button: ({
    children,
    onPress,
    type = "button",
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    onPress?: () => void;
    variant?: string;
  }) => (
    <button {...props} type={type} onClick={onPress}>
      {children}
    </button>
  ),
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

describe("FriendLinksPage", () => {
  const activeLink: FriendLinkItemResp = {
    id: 1,
    name: "Blog A",
    site: "https://a.com",
    seq: 0,
    status: 1,
    created_at: "",
    updated_at: "",
  };

  const pausedLink: FriendLinkItemResp = {
    id: 2,
    name: "Blog B",
    site: "https://b.com",
    seq: 1,
    status: 2,
    created_at: "",
    updated_at: "",
  };

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
    render(<FriendLinksPage links={[activeLink]} />);
    const listEl = screen.getByTestId("links-list");
    expect(listEl.getAttribute("data-count")).toBe("1");
  });

  it("主列表只展示正常友链", () => {
    render(<FriendLinksPage links={[activeLink, pausedLink]} />);
    const listEl = screen.getByTestId("links-list");
    expect(listEl.getAttribute("data-count")).toBe("1");
    expect(screen.getByText("Blog A")).toBeTruthy();
    expect(screen.queryByText("Blog B")).toBeNull();
  });

  it("暂别友邻默认收起，点击后才渲染", async () => {
    const user = userEvent.setup();
    render(<FriendLinksPage links={[activeLink, pausedLink]} />);

    const toggle = screen.getByRole("button", { name: "展开暂别友邻 · 1" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("暂别友邻 · 1")).toBeTruthy();
    expect(screen.queryByText("Blog B")).toBeNull();

    await user.click(toggle);

    expect(screen.getByRole("button", { name: "收起暂别友邻 · 1" })).toBeTruthy();
    expect(screen.getByText("暂别友邻 · 1")).toBeTruthy();
    expect(screen.getByText("Blog B")).toBeTruthy();
  });
});
