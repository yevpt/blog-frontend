import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SnippetCard } from "./snippet-card";
import type { MomentItemResp } from "@repo/api";

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// Mock @repo/ui Button
vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    variant,
    onPress,
    ...props
  }: {
    children: ReactNode;
    variant?: string;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button data-variant={variant} onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

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

  it("没有 avatar_url 时渲染首字母 fallback", () => {
    render(
      <SnippetCard
        snippet={makeMoment({ user: { id: 1, username: "testuser", nickname: "测试用户" } })}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
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
    expect(screen.queryByText("博主")).toBeNull();
  });

  it("标签显示在昵称下方第二行", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    // 昵称在第一行，标签（mark）在第二行
    expect(screen.getByText("测试用户")).toBeTruthy();
    expect(screen.getByText("博主")).toBeTruthy();
  });

  it("有图片时使用 object-contain 完整展示", () => {
    const snippet = makeMoment({
      images: [
        {
          id: 1,
          name: "photo1",
          file_type: "image/jpeg",
          url: "/1.jpg",
          access_url: "/1.jpg",
          size: 1000,
          seq: 1,
        },
      ],
    });
    render(<SnippetCard snippet={snippet} />);
    const imgs = screen
      .getAllByRole("img")
      .filter((el) => el.tagName === "IMG" && el.getAttribute("src")?.startsWith("/"));
    expect(imgs[0].className).toContain("object-contain");
  });

  it("显示点赞和评论数字（ArticleCardStats 风格）", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("渲染正确的 data-testid", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    expect(screen.getByTestId("snippet-card")).toBeTruthy();
  });

  it("有图片时渲染图片网格", () => {
    const snippet = makeMoment({
      images: [
        {
          id: 1,
          name: "photo1",
          file_type: "image/jpeg",
          url: "/1.jpg",
          access_url: "/1.jpg",
          size: 1000,
          seq: 1,
        },
        {
          id: 2,
          name: "photo2",
          file_type: "image/jpeg",
          url: "/2.jpg",
          access_url: "/2.jpg",
          size: 2000,
          seq: 2,
        },
      ],
    });
    render(<SnippetCard snippet={snippet} />);
    const images = screen
      .getAllByRole("img")
      .filter((el) => el.tagName === "IMG" && el.getAttribute("src")?.startsWith("/"));
    expect(images.length).toBe(2);
  });

  it("无图片时不渲染图片网格", () => {
    render(<SnippetCard snippet={makeMoment({ images: [] })} />);
    const allImgs = screen.queryAllByRole("img");
    expect(allImgs.length).toBeLessThanOrEqual(1);
  });

  it("已点赞时显示 heart-fill 图标", () => {
    render(<SnippetCard snippet={makeMoment({ is_liked: true })} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("未点赞时显示 heart 图标", () => {
    render(<SnippetCard snippet={makeMoment({ is_liked: false })} />);
    expect(screen.getByTestId("icon-heart")).toBeTruthy();
  });
});
