import { beforeEach, describe, expect, it, vi, beforeAll } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleMusicBar } from "./article-music-bar";
import { useArticleMusic } from "@/store/use-article-music";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) {}
  // 测试环境无布局，挂载时主动触发一次测量
  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

let resizeObserver: ResizeObserverMock | undefined;

let ioCallback:
  | ((entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void)
  | null = null;
const ioObserve = vi.fn();
const ioDisconnect = vi.fn();

function fireIntersection(isIntersecting: boolean) {
  act(() => {
    ioCallback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
}

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(function ResizeObserver(this: ResizeObserverMock, callback: ResizeObserverCallback) {
      resizeObserver = new ResizeObserverMock(callback);
      return resizeObserver;
    }),
  );
});

describe("ArticleMusicBar", () => {
  beforeEach(() => {
    resizeObserver = undefined;
    ioCallback = null;
    useArticleMusic.getState().clear();
    vi.clearAllMocks();

    class MockIntersectionObserver {
      constructor(
        cb: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void,
      ) {
        ioCallback = cb;
      }
      observe = ioObserve;
      disconnect = ioDisconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("无曲目且无 preview 时不渲染", () => {
    const { container } = render(<ArticleMusicBar />);
    expect(container.firstChild).toBeNull();
  });

  it("有 preview 但 store 未 init 时直接渲染配乐条", () => {
    render(
      <ArticleMusicBar
        preview={{
          musicUrl: "https://example.com/a.mp3",
          musicName: "春夏秋冬",
          musicArtist: "GILLE",
          musicDurationSeconds: 222,
        }}
      />,
    );
    resizeObserver?.trigger();

    expect(screen.getByTestId("article-music-bar")).toBeInTheDocument();
    expect(screen.getByTestId("article-music-track-name")).toHaveTextContent("春夏秋冬");
    expect(screen.getByTestId("article-music-track-artist")).toHaveTextContent("· GILLE");
    expect(screen.getByText("00:00 / 03:42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /播放 春夏秋冬/ })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "播放进度" })).toBeInTheDocument();
  });

  it("桌面端：标签、曲名、总时长与频谱", () => {
    useArticleMusic.getState().init({
      url: "https://example.com/a.mp3",
      name: "春夏秋冬",
      artist: "GILLE",
      durationSeconds: 222,
    });

    render(<ArticleMusicBar />);
    resizeObserver?.trigger();

    expect(screen.getByLabelText("文章配乐")).toHaveClass("h-16", "rounded-2xl");
    expect(screen.getByText("随文配乐")).toBeInTheDocument();
    expect(screen.getByTestId("article-music-track-name")).toHaveTextContent("春夏秋冬");
    expect(screen.getByTestId("article-music-track-artist")).toHaveTextContent("· GILLE");
    expect(screen.getByText("00:00 / 03:42")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "播放进度" })).toBeInTheDocument();
  });

  it("移动端保留标签、仅总时长按断点切换", () => {
    useArticleMusic.getState().init({
      url: "https://example.com/a.mp3",
      name: "春夏秋冬",
      artist: "GILLE",
      durationSeconds: 222,
    });

    render(<ArticleMusicBar />);
    resizeObserver?.trigger();

    // 标签在移动端也展示（不再 max-sm:hidden）
    expect(screen.getByText("随文配乐")).not.toHaveClass("max-sm:hidden");
    // 移动端只显示当前时间，桌面端显示「当前 / 总时长」
    expect(screen.getByText("00:00", { selector: ".sm\\:hidden" })).toBeInTheDocument();
    expect(screen.getByText("00:00 / 03:42")).toHaveClass("hidden", "sm:inline");
  });

  it("点击播放按钮调用 toggle", async () => {
    const toggle = vi.fn();
    useArticleMusic.setState({
      track: {
        url: "https://example.com/a.mp3",
        name: "春夏秋冬",
        artist: "GILLE",
        durationSeconds: 222,
      },
      playbackState: "idle",
      progress: 0,
      audioEl: null,
      toggle,
    });

    render(<ArticleMusicBar />);
    resizeObserver?.trigger();
    await userEvent.click(screen.getByRole("button", { name: /播放 春夏秋冬/ }));

    expect(toggle).toHaveBeenCalledOnce();
  });

  it("进度条位于文字与时长列内", () => {
    useArticleMusic.getState().init({
      url: "https://example.com/a.mp3",
      name: "春夏秋冬",
      durationSeconds: 222,
    });

    render(<ArticleMusicBar />);
    resizeObserver?.trigger();

    const content = screen.getByTestId("article-music-content");
    const seek = screen.getByRole("slider", { name: "播放进度" });
    expect(content).toContainElement(seek);
    expect(content).toHaveClass("justify-center");
  });

  it("歌名被截断时不显示歌手名", () => {
    useArticleMusic.getState().init({
      url: "https://example.com/a.mp3",
      name: "这是一首非常非常长的歌名用来测试截断",
      artist: "GILLE",
      durationSeconds: 222,
    });

    render(<ArticleMusicBar />);
    const nameOnlyMeasure = screen.getByTestId("article-music-track-name-measure-only");
    vi.spyOn(nameOnlyMeasure, "scrollWidth", "get").mockReturnValue(200);
    vi.spyOn(nameOnlyMeasure, "clientWidth", "get").mockReturnValue(100);

    act(() => {
      resizeObserver?.trigger();
    });

    expect(screen.queryByTestId("article-music-track-artist")).not.toBeInTheDocument();
  });

  it("歌名完整但加入歌手后会截断时不显示歌手名", () => {
    useArticleMusic.getState().init({
      url: "https://example.com/a.mp3",
      name: "中等长度歌名",
      artist: "GILLE",
      durationSeconds: 222,
    });

    render(<ArticleMusicBar />);
    const nameOnlyMeasure = screen.getByTestId("article-music-track-name-measure-only");
    const withArtistMeasure = screen.getByTestId("article-music-track-name-measure-with-artist");
    vi.spyOn(nameOnlyMeasure, "scrollWidth", "get").mockReturnValue(80);
    vi.spyOn(nameOnlyMeasure, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(withArtistMeasure, "scrollWidth", "get").mockReturnValue(150);
    vi.spyOn(withArtistMeasure, "clientWidth", "get").mockReturnValue(100);

    act(() => {
      resizeObserver?.trigger();
    });

    expect(screen.queryByTestId("article-music-track-artist")).not.toBeInTheDocument();
  });

  it("播放中更新当前时间", () => {
    useArticleMusic.setState({
      track: {
        url: "https://example.com/a.mp3",
        name: "春夏秋冬",
        durationSeconds: 100,
      },
      playbackState: "playing",
      progress: 0.5,
      audioEl: null,
    });

    render(<ArticleMusicBar />);
    resizeObserver?.trigger();

    expect(screen.getByText("00:50 / 01:40")).toBeInTheDocument();
    expect(screen.getByTestId("icon-pause")).toBeInTheDocument();
  });

  it("加载失败时展示不可用态与重试", async () => {
    const retry = vi.fn();
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "春夏秋冬" },
      playbackState: "error",
      progress: 0,
      audioEl: null,
      retry,
    });

    render(<ArticleMusicBar />);

    expect(screen.getByText("随文配乐暂时不可用")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "重试播放配乐" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("配乐条进出视口时同步 isMusicBarInView", () => {
    useArticleMusic.getState().init({ url: "https://example.com/a.mp3", name: "雨夜" });

    render(<ArticleMusicBar />);

    expect(ioObserve).toHaveBeenCalled();
    expect(useArticleMusic.getState().isMusicBarInView).toBe(true);

    fireIntersection(false);
    expect(useArticleMusic.getState().isMusicBarInView).toBe(false);

    fireIntersection(true);
    expect(useArticleMusic.getState().isMusicBarInView).toBe(true);
  });
});
