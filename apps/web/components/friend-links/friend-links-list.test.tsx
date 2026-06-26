import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { FriendLinkItemResp } from "@repo/api";
import { FriendLinksList } from "./friend-links-list";

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
  {
    id: 2,
    name: "Blog B",
    site: "https://b.com",
    seq: 1,
    status: 2,
    created_at: "",
    updated_at: "",
  },
];

describe("FriendLinksList", () => {
  it("渲染传入的友链卡片", () => {
    render(<FriendLinksList links={[links[0]]} />);
    expect(screen.getByText("Blog A")).toBeTruthy();
    expect(screen.queryByText("Blog B")).toBeNull();
  });

  it("空列表不崩溃", () => {
    const { container } = render(<FriendLinksList links={[]} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("暂别友链不显示「失联」badge", () => {
    render(<FriendLinksList links={links} />);
    expect(screen.queryByText("失联")).toBeNull();
  });
});
