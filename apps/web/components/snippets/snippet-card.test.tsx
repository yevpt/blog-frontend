import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SnippetCard } from "./snippet-card";
import type { MomentItemResp } from "@repo/api";

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// Mock @repo/hooks useLocale
vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    locale: "zh",
    setLocale: () => undefined,
    t: (key: string) => {
      const messages: Record<string, string> = {
        "snippet.like": "喜欢",
        "snippet.comment": "评论",
      };
      return messages[key] ?? key;
    },
  }),
}));

// 基础测试用 MomentItemResp（含 user）
function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 1,
    content: "这是测试内容",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 5,
    comment_count: 2,
    is_liked: false,
    user: {
      id: 1,
      username: "testuser",
      nickname: "测试用户",
      mark: "博主",
      avatar_url: "https://example.com/avatar.jpg",
    },
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

describe("SnippetCard", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<SnippetCard snippet={makeMoment()} />)).not.toThrow();
  });

  it("显示 nickname 作为作者名（优先于 username）", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByText("测试用户")).toBeTruthy();
    expect(screen.queryByText("testuser")).toBeNull();
  });

  it("没有 nickname 时显示 username", () => {
    render(<SnippetCard snippet={makeMoment({ user: { id: 1, username: "testuser" } })} />);
    expect(screen.getByText("testuser")).toBeTruthy();
  });

  it('没有 user 时显示"匿名"', () => {
    render(<SnippetCard snippet={makeMoment({ user: undefined })} />);
    expect(screen.getByText("匿名")).toBeTruthy();
  });

  it("有 avatar_url 时渲染 img 标签", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.jpg");
  });

  it("没有 avatar_url 时渲染首字母 fallback，不渲染 img", () => {
    render(
      <SnippetCard
        snippet={makeMoment({ user: { id: 1, username: "testuser", nickname: "测试用户" } })}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    // 首字母 fallback
    expect(screen.getByText("测")).toBeTruthy();
  });

  it("显示 mark 作为徽章", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByText("博主")).toBeTruthy();
  });

  it("没有 mark 时不显示徽章", () => {
    render(
      <SnippetCard
        snippet={makeMoment({ user: { id: 1, username: "testuser", nickname: "测试用户" } })}
      />,
    );
    // 没有 mark，不应该渲染徽章 span
    expect(screen.queryByText("博主")).toBeNull();
  });

  it("显示 like_count 和 comment_count", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByText("5 喜欢")).toBeTruthy();
    expect(screen.getByText("2 评论")).toBeTruthy();
  });

  it("渲染正确的 data-testid", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByTestId("snippet-card")).toBeTruthy();
  });
});
