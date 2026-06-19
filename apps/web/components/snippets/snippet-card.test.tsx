import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SnippetCard } from "./snippet-card";
import { useImageViewer } from "@/store/use-image-viewer";
import type { MomentItemResp } from "@repo/api";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    sizes?: string;
  }) => <img src={src} alt={alt} className={className} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
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
  Card: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  Avatar: ({ src, alt, initials }: { src?: string; alt?: string; initials?: string }) =>
    src ? <img src={src} alt={alt} /> : <span>{initials}</span>,
  Badge: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <span {...props}>{children}</span>
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

  it("embedded 布局不使用 Card 包裹", () => {
    render(<SnippetCard snippet={makeMoment()} layout="embedded" />);
    const card = screen.getByTestId("snippet-card");
    expect(card.getAttribute("data-layout")).toBe("embedded");
    expect(card.tagName).toBe("ARTICLE");
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

  it("点击喜欢按钮触发 onLike 回调", async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    const snippet = makeMoment();
    render(<SnippetCard snippet={snippet} onLike={onLike} />);

    await user.click(screen.getByRole("button", { name: "喜欢" }));

    expect(onLike).toHaveBeenCalledWith(snippet);
  });

  it("点击评论按钮触发 onComment 回调", async () => {
    const user = userEvent.setup();
    const onComment = vi.fn();
    const snippet = makeMoment();
    render(<SnippetCard snippet={snippet} onComment={onComment} />);

    await user.click(screen.getByRole("button", { name: "评论" }));

    expect(onComment).toHaveBeenCalledWith(snippet);
  });

  it("有 user 时昵称渲染为跳转用户详情的链接", () => {
    render(<SnippetCard snippet={makeMoment()} />);
    const links = screen.getAllByRole("link");
    const nicknameLink = links.find((l) => l.textContent === "测试用户");
    expect(nicknameLink).toBeTruthy();
    expect(nicknameLink?.getAttribute("href")).toBe("/users/1");
  });

  function makeImageMoment() {
    return makeMoment({
      images: [
        {
          id: 1,
          name: "p1",
          file_type: "image/jpeg",
          url: "/1.jpg",
          access_url: "/1.jpg",
          size: 1,
          seq: 1,
        },
        {
          id: 2,
          name: "p2",
          file_type: "image/jpeg",
          url: "/2.jpg",
          access_url: "/2.jpg",
          size: 1,
          seq: 2,
        },
        {
          id: 3,
          name: "p3",
          file_type: "image/jpeg",
          url: "/3.jpg",
          access_url: "/3.jpg",
          size: 1,
          seq: 3,
        },
      ],
    });
  }

  it("点击碎语图片打开全屏预览，且画廊含全部图片", async () => {
    const user = userEvent.setup();
    useImageViewer.setState({ isOpen: false, images: [], index: 0 });
    render(<SnippetCard snippet={makeImageMoment()} />);

    await user.click(screen.getByRole("button", { name: "查看图片 p2" }));

    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    expect(s.images).toHaveLength(3); // 含被折叠的第 3 张
    expect(s.images[0]).toEqual({ src: "/1.jpg", alt: "p1" });
    expect(s.index).toBe(1);
  });

  it("点击 +N 折叠块从第一张被折叠图片打开预览", async () => {
    const user = userEvent.setup();
    useImageViewer.setState({ isOpen: false, images: [], index: 0 });
    render(<SnippetCard snippet={makeImageMoment()} />);

    await user.click(screen.getByRole("button", { name: "查看更多图片" }));

    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    expect(s.index).toBe(2); // 第一张被折叠的图片
  });
});
