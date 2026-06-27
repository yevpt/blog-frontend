import { beforeEach, describe, expect, it, vi, beforeAll } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleMusicBar } from "./article-music-bar";
import { useArticleMusic } from "@/store/use-article-music";

const hydratedMock = vi.hoisted(() => ({
  useHydrated: vi.fn(() => true),
}));

vi.mock("@repo/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/hooks")>();
  return {
    ...actual,
    useHydrated: hydratedMock.useHydrated,
  };
});

const { useHydrated } = hydratedMock;

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

function readVisualizerScales() {
  return screen
    .getAllByTestId("article-music-visualizer-bar")
    .map((bar) => Number(bar.style.transform.match(/scaleY\(([^)]+)\)/)?.[1] ?? 0));
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
    vi.mocked(useHydrated).mockReturnValue(true);
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

  it("未 hydration 时播放按钮显示骨架且不可点击", () => {
    vi.mocked(useHydrated).mockReturnValue(false);

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

    expect(screen.getByTestId("music-play-button-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /播放 春夏秋冬/ })).not.toBeInTheDocument();
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

  it("频谱播放时读取真实音频数据，暂停后保留最后一帧", () => {
    const frequencyData = new Uint8Array(256);
    frequencyData[1] = 120;
    frequencyData[4] = 100;
    frequencyData[12] = 90;
    frequencyData[40] = 80;
    const getByteFrequencyData = vi.fn((target: Uint8Array) => target.set(frequencyData));
    const connect = vi.fn();
    const resume = vi.fn(() => Promise.resolve());
    const audioEl = document.createElement("audio");
    audioEl.crossOrigin = "anonymous";
    audioEl.pause = vi.fn();
    let rafCallback: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);

    class MockAnalyserNode {
      fftSize = 0;
      frequencyBinCount = frequencyData.length;
      smoothingTimeConstant = 0;
      connect = connect;
      getByteFrequencyData = getByteFrequencyData;
    }

    class MockAudioContext {
      state = "running";
      destination = {};
      sampleRate = 48000;
      resume = resume;
      createAnalyser = vi.fn(() => new MockAnalyserNode());
      createMediaElementSource = vi.fn(() => ({ connect }));
    }

    vi.stubGlobal("AudioContext", MockAudioContext);
    useArticleMusic.setState({
      track: {
        url: "https://example.com/a.mp3",
        name: "春夏秋冬",
        durationSeconds: 100,
      },
      playbackState: "playing",
      progress: 0,
      audioEl,
    });

    const { rerender } = render(<ArticleMusicBar />);
    act(() => {
      rafCallback?.(0);
    });

    expect(getByteFrequencyData).toHaveBeenCalled();
    const firstScales = readVisualizerScales();

    act(() => {
      rafCallback?.(16);
    });

    const secondScales = readVisualizerScales();
    expect(Math.abs(secondScales[0] - firstScales[0])).toBeLessThan(0.12);
    expect(Math.abs(secondScales[1] - firstScales[1])).toBeLessThan(0.12);
    expect(Math.abs(secondScales[2] - firstScales[2])).toBeLessThan(0.12);
    expect(Math.abs(secondScales[3] - firstScales[3])).toBeLessThan(0.12);

    frequencyData[1] = 240;
    frequencyData[4] = 220;
    frequencyData[12] = 210;
    frequencyData[40] = 200;
    act(() => {
      rafCallback?.(32);
    });

    const highScales = readVisualizerScales();
    expect(highScales[0]).toBeGreaterThan(secondScales[0]);
    expect(highScales[1]).toBeGreaterThan(secondScales[1]);
    expect(highScales[2]).toBeGreaterThan(secondScales[2]);
    expect(highScales[3]).toBeGreaterThan(secondScales[3]);
    expect(highScales[0]).toBeGreaterThan(0.8);
    expect(highScales[1]).toBeGreaterThan(0.6);
    expect(highScales[2]).toBeGreaterThan(0.75);
    expect(highScales[3]).toBeGreaterThan(0.8);

    frequencyData[1] = 20;
    frequencyData[4] = 18;
    frequencyData[12] = 16;
    frequencyData[40] = 14;
    act(() => {
      rafCallback?.(48);
    });

    const lowScales = readVisualizerScales();
    expect(lowScales[0]).toBeLessThan(highScales[0] - 0.2);
    expect(lowScales[1]).toBeLessThan(highScales[1] - 0.2);
    expect(lowScales[2]).toBeLessThan(highScales[2] - 0.2);
    expect(lowScales[3]).toBeLessThan(highScales[3] - 0.2);

    useArticleMusic.setState({ playbackState: "paused" });
    rerender(<ArticleMusicBar />);

    expect(cancelSpy).toHaveBeenCalled();
    expect(readVisualizerScales()).toEqual(lowScales);

    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it("兜底策略启用时，非 CORS 采样模式的音频使用 CSS 动效", () => {
    const createMediaElementSource = vi.fn();
    const audioEl = document.createElement("audio");
    audioEl.pause = vi.fn();

    class MockAudioContext {
      state = "running";
      destination = {};
      resume = vi.fn(() => Promise.resolve());
      createAnalyser = vi.fn();
      createMediaElementSource = createMediaElementSource;
    }

    vi.stubGlobal("AudioContext", MockAudioContext);
    useArticleMusic.setState({
      track: {
        url: "https://example.com/a.mp3",
        name: "春夏秋冬",
        durationSeconds: 100,
      },
      playbackState: "playing",
      progress: 0,
      audioEl,
    });

    render(<ArticleMusicBar />);

    expect(createMediaElementSource).not.toHaveBeenCalled();
    const bars = screen.getAllByTestId("article-music-visualizer-bar");
    expect(bars.map((bar) => bar.style.animation)).toEqual([
      "equalize 900ms ease-in-out 0ms infinite",
      "equalize 1300ms ease-in-out 120ms infinite",
      "equalize 1000ms ease-in-out 60ms infinite",
      "equalize 1500ms ease-in-out 200ms infinite",
    ]);
    expect(bars.map((bar) => bar.style.transform)).toEqual([
      "scaleY(0.4)",
      "scaleY(0.85)",
      "scaleY(0.55)",
      "scaleY(0.7)",
    ]);
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
