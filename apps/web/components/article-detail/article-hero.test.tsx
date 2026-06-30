import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { activateDeferredMediaForTests, resetDeferredMediaActivationForTests } from "@repo/hooks";
import { ArticleHero } from "./article-hero";
import { useImageViewer } from "@/store/use-image-viewer";
import type { ArticleDetailResp, MusicItemResp } from "@repo/api";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    sizes,
    priority,
  }: {
    src: string;
    alt: string;
    className?: string;
    sizes?: string;
    priority?: boolean;
  }) => (
    <img
      src={src}
      alt={alt}
      className={className}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      data-priority={priority ?? false}
    />
  ),
}));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(function ResizeObserver() {
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
        unobserve: vi.fn(),
      };
    }),
  );
});

beforeEach(() => {
  activateDeferredMediaForTests();
});

const base: ArticleDetailResp = {
  id: 1,
  title: "Rust Web 框架",
  content: "# Hello",
  user_id: 1,
  status: 1,
  comment_status: 1,
  read_count: 1234,
  like_count: 88,
  comment_count: 12,
  is_recommended: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const COVER_SRC = "https://blog-dev-oss.yevpt.com/blog/articles/1/cover/test.png?a=sign&b=nonce";

describe("ArticleHero", () => {
  it("渲染文章标题", () => {
    render(<ArticleHero article={base} />);
    expect(screen.getByRole("heading", { name: "Rust Web 框架" })).toBeInTheDocument();
  });

  it("显示阅读数与桌面端点赞数", () => {
    render(<ArticleHero article={base} />);
    expect(screen.getByText("1234 阅读")).toBeInTheDocument();
    expect(screen.getByText("88 点赞")).toHaveClass("hidden", "md:inline");
  });

  it("无封面图时不渲染 img", () => {
    render(<ArticleHero article={base} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("页面未就绪时封面仅骨架、不挂载图片", () => {
    resetDeferredMediaActivationForTests();

    render(<ArticleHero article={{ ...base, cover_img_url: COVER_SRC }} />);

    expect(screen.getByTestId("cdn-responsive-image-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Rust Web 框架" })).not.toBeInTheDocument();
  });

  it("有封面图时渲染 img 并使用 alt 文字", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: COVER_SRC }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("cover/test.png"));
    expect(img).toHaveAttribute("alt", "Rust Web 框架");
  });

  it("封面使用 article-cover 固定宽度 CDN 变换，避免 src+srcset 重复请求", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: COVER_SRC }} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toContain("w=1080");
    expect(img).not.toHaveAttribute("srcset");
  });

  it("首屏封面以 priority 立即 eager 加载，避免 LCP 告警", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: COVER_SRC }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("显示分类标签", () => {
    render(<ArticleHero article={{ ...base, category: { id: 1, name: "Technology" } }} />);
    expect(screen.getByText("Technology")).toBeInTheDocument();
  });

  it("显示预计阅读时长", () => {
    render(<ArticleHero article={base} />);
    expect(screen.getByText(/分钟阅读/)).toBeInTheDocument();
  });

  it("有 user 时显示作者头像", () => {
    const user = {
      id: 1,
      username: "vpt940417",
      nickname: "Vpt",
      avatar_url: "https://example.com/avatar.jpg",
    };
    render(<ArticleHero article={{ ...base, user }} />);
    const avatar = screen.getByAltText("Vpt");
    expect(avatar).toHaveAttribute("src", expect.stringContaining("avatar.jpg"));
  });

  it("有 user 时显示作者昵称", () => {
    const user = {
      id: 1,
      username: "vpt940417",
      nickname: "Vpt",
      avatar_url: "https://example.com/avatar.jpg",
      mark: "博主、前端攻城狮",
    };
    render(<ArticleHero article={{ ...base, user }} />);
    expect(screen.getByText("Vpt")).toBeInTheDocument();
    expect(screen.getByText("博主、前端攻城狮")).toBeInTheDocument();
  });

  it("作者头像和昵称链接到个人主页", () => {
    const user = {
      id: 42,
      username: "vpt940417",
      nickname: "Vpt",
      avatar_url: "https://example.com/avatar.jpg",
    };
    render(<ArticleHero article={{ ...base, user }} />);

    expect(screen.getByRole("link", { name: "查看Vpt的主页" })).toHaveAttribute(
      "href",
      "/users/42",
    );
    expect(screen.getByRole("link", { name: "Vpt" })).toHaveAttribute("href", "/users/42");
  });

  it("无 user 时不渲染作者区块", () => {
    render(<ArticleHero article={base} />);
    expect(screen.queryByText(/博主/)).not.toBeInTheDocument();
  });

  it("点击封面打开图片查看器", () => {
    useImageViewer.setState({ isOpen: false, images: [], index: 0 });
    render(<ArticleHero article={{ ...base, cover_img_url: COVER_SRC }} />);
    fireEvent.click(screen.getByRole("button", { name: "查看封面大图" }));
    const state = useImageViewer.getState();
    expect(state.isOpen).toBe(true);
    expect(state.images).toEqual([{ src: COVER_SRC, alt: "Rust Web 框架" }]);
    expect(state.index).toBe(0);
  });

  it("有配乐时首屏直接渲染配乐条", () => {
    const music: MusicItemResp = {
      id: 1,
      name: "春夏秋冬",
      artist_display_name: "GILLE",
      audio_url: "https://example.com/a.mp3",
      duration: 222,
      seq: 0,
    };

    render(<ArticleHero article={{ ...base, music: [music] }} />);

    expect(screen.getByTestId("article-music-bar")).toBeInTheDocument();
    expect(screen.getByTestId("article-music-track-name")).toHaveTextContent("春夏秋冬");
  });
});
