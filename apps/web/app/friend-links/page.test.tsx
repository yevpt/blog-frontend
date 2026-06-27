// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { FriendLinkItemResp, FriendLinkPageResp } from "@repo/api";
import FriendLinksPageRoute from "./page";

const linkList: FriendLinkItemResp[] = [
  {
    id: 1,
    name: "YEVPT Blog",
    site: "https://www.yevpt.com",
    seq: 0,
    status: 1,
    created_at: "",
    updated_at: "",
  },
];

const linkResp: FriendLinkPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 50,
  list: linkList,
};

const mockListPublic = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn(async () => ({
    friendLinks: {
      listPublic: mockListPublic,
    },
  })),
}));

vi.mock("@/components/common/page-container", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/friend-links", () => ({
  FriendLinksPage: ({ links }: { links: FriendLinkItemResp[] }) => (
    <main data-testid="friend-links-page">
      {links.map((l) => (
        <span key={l.id}>{l.name}</span>
      ))}
    </main>
  ),
}));

describe("FriendLinksPageRoute", () => {
  beforeEach(() => {
    mockListPublic.mockReset();
    mockListPublic.mockResolvedValue(linkResp);
  });

  it("渲染不崩溃并传入友链数据", async () => {
    const element = await FriendLinksPageRoute();
    render(element);
    expect(screen.getByTestId("friend-links-page")).toBeTruthy();
    expect(screen.getByText("YEVPT Blog")).toBeTruthy();
  });

  it("API 失败时降级渲染空列表", async () => {
    mockListPublic.mockRejectedValueOnce(new Error("network error"));
    const element = await FriendLinksPageRoute();
    render(element);
    expect(screen.getByTestId("friend-links-page")).toBeTruthy();
    expect(screen.queryByText("YEVPT Blog")).toBeNull();
  });
});
