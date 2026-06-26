import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ArticleMusicHost } from "./article-music-host";
import { useArticleMusic } from "@/store/use-article-music";

describe("ArticleMusicHost", () => {
  beforeEach(() => {
    useArticleMusic.setState({ audioEl: null });
    useArticleMusic.getState().clear();
    vi.clearAllMocks();
  });

  it("跨域 audio 设置 crossOrigin 以支持 Web Audio 采样", async () => {
    useArticleMusic.getState().init({
      url: "https://example.com/a.mp3",
      name: "春夏秋冬",
    });

    render(<ArticleMusicHost />);

    const audio = screen.getByTestId("article-music-audio");
    expect(audio).toHaveAttribute("crossorigin", "anonymous");
    expect(audio).toHaveAttribute("src", "https://example.com/a.mp3");
    await waitFor(() => expect(useArticleMusic.getState().audioEl).toBe(audio));
  });

  it("同源 audio 设置 crossOrigin 以支持 Web Audio 采样", async () => {
    useArticleMusic.getState().init({
      url: `${window.location.origin}/music/a.mp3`,
      name: "春夏秋冬",
    });

    render(<ArticleMusicHost />);

    const audio = screen.getByTestId("article-music-audio");
    expect(audio).toHaveAttribute("crossorigin", "anonymous");
  });
});
