// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { FriendLinkPageResp } from "@repo/api";

const linkResp: FriendLinkPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 50,
  list: [
    {
      id: 1,
      name: "YEVPT Blog",
      site: "https://www.yevpt.com",
      seq: 0,
      status: 1,
      created_at: "",
      updated_at: "",
    },
  ],
};

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn().mockResolvedValue({
    friendLinks: {
      listPublic: vi.fn().mockResolvedValue(linkResp),
    },
  }),
}));

vi.mock("@/components/friend-links", () => ({
  FriendLinksPage: ({ links }: { links: typeof linkResp.list }) => (
    <main data-testid="friend-links-page">
      {links.map((l) => (
        <span key={l.id}>{l.name}</span>
      ))}
    </main>
  ),
}));

describe("FriendLinksPageRoute", () => {
  it("渲染不崩溃并传入友链数据", async () => {
    const { default: FriendLinksPageRoute } = await import("./page");
    const element = await FriendLinksPageRoute();
    render(element);
    expect(screen.getByTestId("friend-links-page")).toBeTruthy();
    expect(screen.getByText("YEVPT Blog")).toBeTruthy();
  });

  it("API 失败时降级渲染空列表", async () => {
    const { createServerApiClient } = await import("@/lib/server-api");
    vi.mocked(createServerApiClient).mockResolvedValueOnce({
      friendLinks: {
        listPublic: vi.fn().mockRejectedValue(new Error("network error")),
      },
    } as never);

    const { default: FriendLinksPageRoute } = await import("./page");
    const element = await FriendLinksPageRoute();
    render(element);
    expect(screen.getByTestId("friend-links-page")).toBeTruthy();
  });
});
