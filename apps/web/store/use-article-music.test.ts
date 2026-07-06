import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prepare-article-audio", () => ({
  prepareArticleAudioElement: vi.fn().mockResolvedValue(undefined),
  resetArticleAudioElement: vi.fn(),
  reloadArticleAudioElement: vi.fn(),
}));

import {
  prepareArticleAudioElement,
  reloadArticleAudioElement,
  resetArticleAudioElement,
} from "@/lib/prepare-article-audio";
import { useArticleMusic } from "./use-article-music";

describe("useArticleMusic", () => {
  beforeEach(() => {
    useArticleMusic.getState().clear();
    vi.clearAllMocks();
  });

  it("init 写入曲目并重置播放状态", () => {
    useArticleMusic.getState().init({ url: "https://example.com/a.mp3", name: "雨夜" });

    expect(useArticleMusic.getState().track).toEqual({
      url: "https://example.com/a.mp3",
      name: "雨夜",
    });
    expect(useArticleMusic.getState().playbackState).toBe("idle");
    expect(useArticleMusic.getState().progress).toBe(0);
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(false);
    expect(useArticleMusic.getState().isMusicBarInView).toBe(true);
  });

  it("相同曲目重复 init 不重置", () => {
    useArticleMusic.getState().init({ url: "https://example.com/a.mp3", name: "雨夜" });
    useArticleMusic.setState({ playbackState: "playing", progress: 0.5, hasPlayedOnce: true });
    useArticleMusic.getState().init({ url: "https://example.com/a.mp3", name: "雨夜" });

    expect(useArticleMusic.getState().playbackState).toBe("playing");
    expect(useArticleMusic.getState().progress).toBe(0.5);
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(true);
  });

  it("clear 清空曲目与进度", () => {
    const pause = vi.fn();
    const audioEl = { pause, currentTime: 10 } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "playing",
      progress: 0.4,
      audioEl,
    });

    useArticleMusic.getState().clear();

    expect(resetArticleAudioElement).toHaveBeenCalledWith(audioEl);
    expect(useArticleMusic.getState().track).toBeNull();
    expect(useArticleMusic.getState().playbackState).toBe("idle");
    expect(useArticleMusic.getState().progress).toBe(0);
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(false);
    expect(useArticleMusic.getState().isMusicBarInView).toBe(true);
  });

  it("seek 写入 audio.currentTime 并同步进度", () => {
    const audioEl = {
      duration: 200,
      currentTime: 0,
      pause: vi.fn(),
    } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜", durationSeconds: 200 },
      audioEl,
    });

    useArticleMusic.getState().seek(0.25);

    expect(audioEl.currentTime).toBe(50);
    expect(useArticleMusic.getState().progress).toBe(0.25);
  });

  it("seek 在 paused 且 commit 时自动续播", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const audioEl = {
      duration: 200,
      currentTime: 0,
      pause: vi.fn(),
      play,
    } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "paused",
      audioEl,
    });

    await useArticleMusic.getState().seek(0.4, true);

    expect(prepareArticleAudioElement).toHaveBeenCalledWith(audioEl, "https://example.com/a.mp3");
    expect(audioEl.currentTime).toBe(80);
    expect(play).toHaveBeenCalledOnce();
    expect(useArticleMusic.getState().playbackState).toBe("playing");
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(true);
  });

  it("seek 未 commit 时 paused 不自动续播", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const audioEl = {
      duration: 200,
      currentTime: 0,
      pause: vi.fn(),
      play,
    } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "paused",
      audioEl,
    });

    await useArticleMusic.getState().seek(0.4);

    expect(play).not.toHaveBeenCalled();
    expect(useArticleMusic.getState().playbackState).toBe("paused");
  });

  it("seek 比例越界时被夹紧到 0..1", () => {
    const audioEl = {
      duration: 100,
      currentTime: 0,
      pause: vi.fn(),
    } as unknown as HTMLAudioElement;
    useArticleMusic.setState({ track: { url: "x", name: "y" }, audioEl });

    useArticleMusic.getState().seek(1.8);
    expect(audioEl.currentTime).toBe(100);
    expect(useArticleMusic.getState().progress).toBe(1);

    useArticleMusic.getState().seek(-0.5);
    expect(audioEl.currentTime).toBe(0);
    expect(useArticleMusic.getState().progress).toBe(0);
  });

  it("toggle 在 playing 与 paused 间切换", async () => {
    const pause = vi.fn();
    const play = vi.fn().mockResolvedValue(undefined);
    const audioEl = { pause, play, currentTime: 0 } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "playing",
      audioEl,
    });

    await useArticleMusic.getState().toggle();
    expect(pause).toHaveBeenCalled();
    expect(useArticleMusic.getState().playbackState).toBe("paused");

    await useArticleMusic.getState().toggle();
    expect(prepareArticleAudioElement).toHaveBeenCalledWith(audioEl, "https://example.com/a.mp3");
    expect(play).toHaveBeenCalled();
    expect(useArticleMusic.getState().playbackState).toBe("playing");
  });

  it("toggle 首次播放成功后标记 hasPlayedOnce", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const audioEl = { pause: vi.fn(), play, currentTime: 0 } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "idle",
      hasPlayedOnce: false,
      audioEl,
    });

    await useArticleMusic.getState().toggle();

    expect(prepareArticleAudioElement).toHaveBeenCalledWith(audioEl, "https://example.com/a.mp3");
    expect(play).toHaveBeenCalledOnce();
    expect(useArticleMusic.getState().playbackState).toBe("playing");
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(true);
  });

  it("toggle 播放失败时保持加载态并自动重试", async () => {
    vi.useFakeTimers();
    const play = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);
    const audioEl = { pause: vi.fn(), play, currentTime: 0 } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "idle",
      hasPlayedOnce: false,
      audioEl,
    });

    const togglePromise = useArticleMusic.getState().toggle();
    await togglePromise;

    expect(useArticleMusic.getState().playbackState).toBe("loading");
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(false);

    await vi.advanceTimersByTimeAsync(1500);

    expect(play).toHaveBeenCalledTimes(2);
    // 重试只 reload（不 pause/不清 src），避免打断回源与污染 loading 态
    expect(reloadArticleAudioElement).toHaveBeenCalledWith(audioEl);
    expect(resetArticleAudioElement).not.toHaveBeenCalled();
    expect(useArticleMusic.getState().playbackState).toBe("playing");
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(true);

    vi.useRealTimers();
  });

  it("toggle 多次重试仍失败后才进入 error", async () => {
    vi.useFakeTimers();
    const play = vi.fn().mockRejectedValue(new Error("network"));
    const audioEl = { pause: vi.fn(), play, currentTime: 0 } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "idle",
      audioEl,
    });

    const togglePromise = useArticleMusic.getState().toggle();

    // 指数退避：1500 → 3000 → 6000
    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(6000);
    await togglePromise;

    expect(play).toHaveBeenCalledTimes(4);
    expect(useArticleMusic.getState().playbackState).toBe("error");
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(false);

    vi.useRealTimers();
  });

  it("重试间隔为指数退避（1500 → 3000 → 6000）", async () => {
    vi.useFakeTimers();
    const play = vi.fn().mockRejectedValue(new Error("network"));
    const audioEl = { pause: vi.fn(), play, currentTime: 0 } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "idle",
      audioEl,
    });

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const togglePromise = useArticleMusic.getState().toggle();
    await togglePromise;

    // 每次推进触发重试失败后，才安排下一次重试；逐次收集 delay
    const retryDelays: number[] = [];
    retryDelays.push(setTimeoutSpy.mock.calls.at(-1)?.[1] as number);
    await vi.advanceTimersByTimeAsync(retryDelays[0]!);
    retryDelays.push(setTimeoutSpy.mock.calls.at(-1)?.[1] as number);
    await vi.advanceTimersByTimeAsync(retryDelays[1]!);
    retryDelays.push(setTimeoutSpy.mock.calls.at(-1)?.[1] as number);
    await vi.advanceTimersByTimeAsync(retryDelays[2]!);

    expect(retryDelays).toEqual([1500, 3000, 6000]);
    expect(play).toHaveBeenCalledTimes(4);

    setTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it("重试期间 playbackState 始终为 loading（pause 事件不污染）", async () => {
    vi.useFakeTimers();
    const play = vi.fn().mockRejectedValue(new Error("network"));
    // 模拟 reloadArticleAudioElement 内部触发 pause 事件的行为不会发生（reload 不 pause），
    // 但即便外部其它原因触发 audio.pause()，重试路径本身不应主动 pause 产生事件污染。
    const audioEl = { pause: vi.fn(), play, currentTime: 0 } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "idle",
      audioEl,
    });

    const togglePromise = useArticleMusic.getState().toggle();
    await togglePromise;

    // 整个重试过程中状态恒为 loading，不闪成 paused（Bug 2 回归保护）
    await vi.advanceTimersByTimeAsync(1500);
    expect(useArticleMusic.getState().playbackState).toBe("loading");
    await vi.advanceTimersByTimeAsync(3000);
    expect(useArticleMusic.getState().playbackState).toBe("loading");
    await vi.advanceTimersByTimeAsync(6000);
    expect(useArticleMusic.getState().playbackState).toBe("error");

    // 重试路径调 reload（不 pause），不调 reset
    expect(reloadArticleAudioElement).toHaveBeenCalled();
    expect(resetArticleAudioElement).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("handleAudioError 在 loading 时触发自动重试", async () => {
    vi.useFakeTimers();
    const play = vi.fn().mockResolvedValue(undefined);
    const audioEl = { pause: vi.fn(), play, currentTime: 0 } as unknown as HTMLAudioElement;
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "loading",
      audioEl,
    });

    useArticleMusic.getState().handleAudioError();

    expect(useArticleMusic.getState().playbackState).toBe("loading");

    await vi.advanceTimersByTimeAsync(1500);

    expect(play).toHaveBeenCalledOnce();
    expect(useArticleMusic.getState().playbackState).toBe("playing");

    vi.useRealTimers();
  });

  it("handleAudioError 在 idle 时不触发重试", () => {
    useArticleMusic.setState({ playbackState: "idle" });

    useArticleMusic.getState().handleAudioError();

    expect(useArticleMusic.getState().playbackState).toBe("idle");
  });
});
