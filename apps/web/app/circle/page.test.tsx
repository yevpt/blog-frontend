import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import CirclePage from "./page";

vi.mock("react-virtuoso", () => ({
  VirtuosoGrid: ({
    data,
    itemContent,
  }: {
    data: Array<{ id: number }>;
    itemContent: (index: number, item: { id: number }) => ReactNode;
  }) => <div data-testid="virtuoso-grid">{data.map((item, i) => itemContent(i, item))}</div>,
}));

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn().mockResolvedValue({
    users: {
      listPublic: vi.fn().mockResolvedValue({
        list: [
          { id: 1, nickname: "Regular User", avatar_url: "", roles: [], last_login_at: null },
          { id: 2, nickname: "Admin User", avatar_url: "", roles: ["admin"], last_login_at: null },
          { id: 3, nickname: "VIP User", avatar_url: "", roles: ["vip"], last_login_at: null },
        ],
        total: 3,
        pages: 1,
        page: 1,
        page_size: 40,
      }),
    },
  }),
}));

test("CirclePage renders header and sorts users by role", async () => {
  const jsx = await CirclePage();
  render(jsx);

  // 标题
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("圈子成员");

  // 用户卡片，排序 Admin > VIP > Regular
  const headings = await screen.findAllByRole("heading", { level: 3 });
  expect(headings).toHaveLength(3);
  expect(headings[0]).toHaveTextContent("Admin User");
  expect(headings[1]).toHaveTextContent("VIP User");
  expect(headings[2]).toHaveTextContent("Regular User");
});
