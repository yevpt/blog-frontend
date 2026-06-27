import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArticleHero } from "./article-hero";
import { useImageViewer } from "@/store/use-image-viewer";
import type { ArticleDetailResp, MusicItemResp } from "@repo/api";
import type * as RepoHooks from "@repo/hooks";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    sizes,
  }: {
    src: string;
    alt: string;
    className?: string;
    sizes?: string;
  }) => <img src={src} alt={alt} className={className} sizes={sizes} />,
}));

const deferredMediaMock = vi.hoisted(() => ({
  useDeferredMediaActivation: vi.fn(() => true),
}));

vi.mock("@repo/hooks", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof RepoHooks;
  return {
    ...actual,
    useDeferredMediaActivation: deferredMediaMock.useDeferredMediaActivation,
  };
});

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

  it("有封面图时渲染 img 并使用 alt 文字", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: "https://example.com/img.jpg" }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("img.jpg"));
    expect(img).toHaveAttribute("alt", "Rust Web 框架");
  });

  it("封面 fill 图片带响应式 sizes，避免 Next Image 告警", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: "https://example.com/img.jpg" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("sizes", "(max-width: 768px) 100vw, 720px");
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
    render(<ArticleHero article={{ ...base, cover_img_url: "https://example.com/img.jpg" }} />);
    fireEvent.click(screen.getByRole("button", { name: "查看封面大图" }));
    const state = useImageViewer.getState();
    expect(state.isOpen).toBe(true);
    expect(state.images).toEqual([{ src: "https://example.com/img.jpg", alt: "Rust Web 框架" }]);
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
