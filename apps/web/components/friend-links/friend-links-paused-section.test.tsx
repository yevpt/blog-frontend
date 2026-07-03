import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { FriendLinkItemResp } from "@repo/api";
import { useFriendLinksPausedStore } from "@/store/use-friend-links-paused-store";
import { FriendLinksPausedSection } from "./friend-links-paused-section";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("./friend-links-list", () => ({
  FriendLinksList: ({ links }: { links: FriendLinkItemResp[] }) => (
    <div data-testid="links-list" data-count={links.length} />
  ),
}));

const pausedLink: FriendLinkItemResp = {
  id: 2,
  name: "Blog B",
  site: "https://b.com",
  seq: 1,
  status: 2,
  created_at: "",
  updated_at: "",
};

describe("FriendLinksPausedSection", () => {
  beforeEach(() => {
    useFriendLinksPausedStore.setState({ open: false });
  });

  it("links 为空时不渲染任何内容", () => {
    const { container } = render(<FriendLinksPausedSection links={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("默认收起", () => {
    render(<FriendLinksPausedSection links={[pausedLink]} />);
    expect(screen.getByRole("button", { name: "展开暂别友邻 · 1" })).toBeTruthy();
    expect(screen.queryByTestId("links-list")).toBeNull();
  });

  it("点击后展开，显示链接列表", async () => {
    const user = userEvent.setup();
    render(<FriendLinksPausedSection links={[pausedLink]} />);

    await user.click(screen.getByRole("button", { name: "展开暂别友邻 · 1" }));

    expect(screen.getByRole("button", { name: "收起暂别友邻 · 1" })).toBeTruthy();
    expect(screen.getByTestId("links-list")).toBeTruthy();
  });

  it("store 里 open=true 时挂载即为展开状态", () => {
    useFriendLinksPausedStore.setState({ open: true });
    render(<FriendLinksPausedSection links={[pausedLink]} />);
    expect(screen.getByRole("button", { name: "收起暂别友邻 · 1" })).toBeTruthy();
    expect(screen.getByTestId("links-list")).toBeTruthy();
  });

  it("展开后卸载重新挂载，展开态保留", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<FriendLinksPausedSection links={[pausedLink]} />);

    await user.click(screen.getByRole("button", { name: "展开暂别友邻 · 1" }));
    unmount();

    render(<FriendLinksPausedSection links={[pausedLink]} />);
    expect(screen.getByRole("button", { name: "收起暂别友邻 · 1" })).toBeTruthy();
  });
});
