import { beforeEach, describe, expect, it, vi } from "vitest";
import { useArticleMusic } from "./use-article-music";

describe("useArticleMusic", () => {
  beforeEach(() => {
    useArticleMusic.getState().clear();
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
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "playing",
      progress: 0.4,
      audioEl: { pause, currentTime: 10 } as unknown as HTMLAudioElement,
    });

    useArticleMusic.getState().clear();

    expect(pause).toHaveBeenCalled();
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
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "playing",
      audioEl: { pause, play, currentTime: 0 } as unknown as HTMLAudioElement,
    });

    await useArticleMusic.getState().toggle();
    expect(pause).toHaveBeenCalled();
    expect(useArticleMusic.getState().playbackState).toBe("paused");

    await useArticleMusic.getState().toggle();
    expect(play).toHaveBeenCalled();
    expect(useArticleMusic.getState().playbackState).toBe("playing");
  });

  it("toggle 首次播放成功后标记 hasPlayedOnce", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "idle",
      hasPlayedOnce: false,
      audioEl: { pause: vi.fn(), play, currentTime: 0 } as unknown as HTMLAudioElement,
    });

    await useArticleMusic.getState().toggle();

    expect(play).toHaveBeenCalledOnce();
    expect(useArticleMusic.getState().playbackState).toBe("playing");
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(true);
  });

  it("toggle 播放失败时不标记 hasPlayedOnce", async () => {
    const play = vi.fn().mockRejectedValue(new Error("blocked"));
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "idle",
      hasPlayedOnce: false,
      audioEl: { pause: vi.fn(), play, currentTime: 0 } as unknown as HTMLAudioElement,
    });

    await useArticleMusic.getState().toggle();

    expect(useArticleMusic.getState().playbackState).toBe("error");
    expect(useArticleMusic.getState().hasPlayedOnce).toBe(false);
    expect(useArticleMusic.getState().isMusicBarInView).toBe(true);
  });
});
