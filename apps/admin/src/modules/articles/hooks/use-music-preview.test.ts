import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMusicPreview } from "./use-music-preview";

describe("useMusicPreview", () => {
  const playMock = vi.fn();
  const pauseMock = vi.fn();

  beforeEach(() => {
    playMock.mockResolvedValue(undefined);
    HTMLAudioElement.prototype.play = playMock;
    HTMLAudioElement.prototype.pause = pauseMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初始为 idle，无 url 时不可播放", () => {
    const { result } = renderHook(() => useMusicPreview({ trackId: 1, durationSeconds: 180 }));

    expect(result.current.state).toBe("idle");
    expect(result.current.canPreview).toBe(false);
    expect(result.current.progressLabel).toBe("0:00 / 03:00");
  });

  it("点击播放进入 playing", async () => {
    const { result } = renderHook(() =>
      useMusicPreview({
        trackId: 1,
        url: "https://cdn.example.com/a.mp3",
        durationSeconds: 120,
      }),
    );

    act(() => {
      result.current.audioRef.current = document.createElement("audio");
    });

    await act(async () => {
      await result.current.handleTogglePlay();
    });

    expect(playMock).toHaveBeenCalled();
    expect(result.current.state).toBe("playing");
    expect(result.current.hasStarted).toBe(true);
  });

  it("播放中再次点击暂停", async () => {
    const { result } = renderHook(() =>
      useMusicPreview({
        trackId: 1,
        url: "https://cdn.example.com/a.mp3",
        durationSeconds: 120,
      }),
    );

    act(() => {
      result.current.audioRef.current = document.createElement("audio");
    });

    await act(async () => {
      await result.current.handleTogglePlay();
    });

    act(() => {
      void result.current.handleTogglePlay();
    });

    expect(pauseMock).toHaveBeenCalled();
    expect(result.current.state).toBe("paused");
  });

  it("切换 trackId 时重置状态", async () => {
    const { result, rerender } = renderHook(
      ({ trackId }: { trackId: number }) =>
        useMusicPreview({
          trackId,
          url: "https://cdn.example.com/a.mp3",
          durationSeconds: 120,
        }),
      { initialProps: { trackId: 1 } },
    );

    await act(async () => {
      await result.current.handleTogglePlay();
    });

    rerender({ trackId: 2 });

    await waitFor(() => {
      expect(result.current.state).toBe("idle");
      expect(result.current.progress).toBe(0);
      expect(result.current.hasStarted).toBe(false);
    });
  });

  it("seek 更新进度", () => {
    const audio = document.createElement("audio");
    Object.defineProperty(audio, "duration", { value: 100, configurable: true });

    const { result } = renderHook(() =>
      useMusicPreview({
        trackId: 1,
        url: "https://cdn.example.com/a.mp3",
        durationSeconds: 100,
      }),
    );

    act(() => {
      result.current.audioRef.current = audio;
      result.current.handleSeek(0.5);
    });

    expect(audio.currentTime).toBe(50);
    expect(result.current.progress).toBe(0.5);
    expect(result.current.hasStarted).toBe(true);
  });
});
