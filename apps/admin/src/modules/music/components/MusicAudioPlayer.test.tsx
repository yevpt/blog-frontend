import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicAudioPlayer } from "./MusicAudioPlayer";

describe("MusicAudioPlayer", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("完整模式展示文件摘要并隐藏 URL", () => {
    render(
      <MusicAudioPlayer
        variant="full"
        title="Ref:rain"
        url="https://cdn.example.com/ref.mp3?token=secret"
        fileName="ref.mp3"
        mime="audio/mpeg"
        size={3_145_728}
        fallbackDuration={270}
      />,
    );

    expect(screen.getByText("ref.mp3")).toBeInTheDocument();
    expect(screen.getByText(/audio\/mpeg/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.0 MB/)).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Ref:rain 播放进度" })).toBeInTheDocument();
    expect(screen.queryByText(/cdn\.example\.com/)).not.toBeInTheDocument();
  });

  it("播放、更新时间并跳转进度", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MusicAudioPlayer
        variant="full"
        title="Ref:rain"
        url="/ref.mp3"
        fallbackDuration={100}
      />,
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    Object.defineProperty(audio, "duration", { configurable: true, value: 100 });
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      writable: true,
      value: 0,
    });

    await user.click(screen.getByRole("button", { name: "播放 Ref:rain" }));
    expect(audio?.play).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "暂停 Ref:rain" })).toBeInTheDocument();

    act(() => {
      if (audio) audio.currentTime = 25;
      if (audio) fireEvent.timeUpdate(audio);
    });
    expect(screen.getByText("0:25 / 1:40")).toBeInTheDocument();

    await user.click(screen.getByRole("slider", { name: "Ref:rain 播放进度" }));
    await user.keyboard("{ArrowRight}");
    expect(audio?.currentTime).toBe(26);
  });

  it("URL 变化时暂停旧音频并重置进度", () => {
    const { container, rerender } = render(
      <MusicAudioPlayer
        variant="full"
        title="Ref:rain"
        url="/old.mp3"
        fallbackDuration={100}
      />,
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      writable: true,
      value: 30,
    });
    if (audio) fireEvent.timeUpdate(audio);

    rerender(
      <MusicAudioPlayer
        variant="full"
        title="Ref:rain"
        url="/new.mp3"
        fallbackDuration={100}
      />,
    );

    expect(audio?.pause).toHaveBeenCalled();
    expect(screen.getByText("0:00 / 1:40")).toBeInTheDocument();
  });

  it("播放被拒绝时恢复为停止状态", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("blocked"));
    render(<MusicAudioPlayer title="Ref:rain" url="/ref.mp3" />);

    await userEvent.setup().click(screen.getByRole("button", { name: "播放 Ref:rain" }));

    expect(screen.getByRole("button", { name: "播放 Ref:rain" })).toBeInTheDocument();
  });
});
