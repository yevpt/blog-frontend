import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MusicPlayer } from "./music-player";

describe("MusicPlayer", () => {
  it("无 url 时不渲染任何内容", () => {
    const { container } = render(<MusicPlayer url={undefined} name={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("有 url 时渲染音乐图标按钮", () => {
    render(<MusicPlayer url="https://example.com/music.mp3" name="雨の音" />);
    expect(screen.getByRole("button", { name: /音乐播放器/ })).toBeInTheDocument();
  });

  it("点击按钮展开播放器，显示曲名", async () => {
    render(<MusicPlayer url="https://example.com/music.mp3" name="雨の音" />);
    await userEvent.click(screen.getByRole("button", { name: /音乐播放器/ }));
    expect(screen.getByText("雨の音")).toBeInTheDocument();
  });
});
