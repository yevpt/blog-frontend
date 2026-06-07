import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import Page from "./page";

const mockState = vi.hoisted(() => {
  const listPublic = vi.fn();
  return { listPublic };
});

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    moments: { listPublic: mockState.listPublic },
  }),
}));

vi.mock("@/components/snippets/snippets-list", () => ({
  SnippetsList: ({
    initialPage,
  }: {
    initialPage: { list: Array<{ id: number; content: string }> };
  }) => (
    <div data-testid="snippets-list">
      {initialPage.list.map((snippet) => (
        <div key={snippet.id} data-testid="snippet-card">
          {snippet.content}
        </div>
      ))}
    </div>
  ),
}));

const MOCK_SNIPPET = {
  id: 1,
  content: "测试碎语内容",
  created_at: "2026-06-03T00:00:00Z",
  like_count: 5,
  comment_count: 2,
  user: { nickname: "测试用户", avatar_url: "", username: "test", mark: "" },
};

describe("SnippetsPage", () => {
  beforeEach(() => {
    mockState.listPublic.mockReset();
    mockState.listPublic.mockResolvedValue({
      total: 0,
      pages: 0,
      page: 1,
      page_size: 20,
      list: [],
    });
  });

  it("渲染不崩溃", async () => {
    expect(() => render).not.toThrow();
    const element = await Page();
    expect(() => render(element)).not.toThrow();
  });

  it("包含碎语页面标题", async () => {
    render(await Page());
    expect(screen.getByRole("heading", { name: "碎语" })).toBeInTheDocument();
  });

  it("有碎语时渲染 SnippetsList", async () => {
    mockState.listPublic.mockResolvedValue({
      total: 1,
      pages: 1,
      page: 1,
      page_size: 20,
      list: [MOCK_SNIPPET],
    });
    render(await Page());
    expect(screen.getByTestId("snippets-list")).toBeInTheDocument();
    expect(screen.getByText("测试碎语内容")).toBeInTheDocument();
  });

  it("无碎语时仍渲染 SnippetsList", async () => {
    render(await Page());
    expect(screen.getByTestId("snippets-list")).toBeInTheDocument();
  });

  it("请求时传入 page_size=20", async () => {
    render(await Page());
    expect(mockState.listPublic).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 20 }),
    );
  });
});
