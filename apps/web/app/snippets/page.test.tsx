import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

const mockState = vi.hoisted(() => {
  const feed = vi.fn();
  const renderSnippetsList = vi.fn();
  return { feed, renderSnippetsList };
});

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    moments: { feed: mockState.feed },
  }),
}));

vi.mock("@/components/snippets/snippets-list-loader", () => ({
  SnippetsListLoader: (props: {
    initialPage: { list: Array<{ id: number; content: string }> };
  }) => {
    mockState.renderSnippetsList(props);
    return (
      <div data-testid="snippets-list">
        {props.initialPage.list.map((snippet) => (
          <div key={snippet.id} data-testid="snippet-card">
            {snippet.content}
          </div>
        ))}
      </div>
    );
  },
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
    mockState.feed.mockReset();
    mockState.renderSnippetsList.mockReset();
    mockState.feed.mockResolvedValue({
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

  it("使用加宽容器（max-w-[960px]）", async () => {
    const { container } = render(await Page());
    const wrapper = container.querySelector(".max-w-\\[960px\\]");
    expect(wrapper).toBeInTheDocument();
  });

  it("有碎语时渲染 SnippetsList", async () => {
    mockState.feed.mockResolvedValue({
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

  it("首屏请求 feed 接口且 scope=all、sort=latest", async () => {
    render(await Page());
    expect(mockState.feed).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "all", sort: "latest", page: 1, page_size: 20 }),
    );
  });
});
