import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

const mockState = vi.hoisted(() => {
  const feed = vi.fn();
  const renderMomentsList = vi.fn();
  return { feed, renderMomentsList };
});

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    moments: { feed: mockState.feed },
  }),
}));

vi.mock("@/components/moments/moments-list-loader", () => ({
  MomentsListLoader: (props: { initialPage: { list: Array<{ id: number; content: string }> } }) => {
    mockState.renderMomentsList(props);
    return (
      <div data-testid="moments-list">
        {props.initialPage.list.map((moment) => (
          <div key={moment.id} data-testid="moment-card">
            {moment.content}
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

describe("MomentsPage", () => {
  beforeEach(() => {
    mockState.feed.mockReset();
    mockState.renderMomentsList.mockReset();
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

  it("有碎语时渲染 MomentsList", async () => {
    mockState.feed.mockResolvedValue({
      total: 1,
      pages: 1,
      page: 1,
      page_size: 20,
      list: [MOCK_SNIPPET],
    });
    render(await Page());
    expect(screen.getByTestId("moments-list")).toBeInTheDocument();
    expect(screen.getByText("测试碎语内容")).toBeInTheDocument();
  });

  it("无碎语时仍渲染 MomentsList", async () => {
    render(await Page());
    expect(screen.getByTestId("moments-list")).toBeInTheDocument();
  });

  it("首屏请求 feed 接口且 scope=all、sort=latest", async () => {
    render(await Page());
    expect(mockState.feed).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "all", sort: "latest", page: 1, page_size: 20 }),
    );
  });
});
