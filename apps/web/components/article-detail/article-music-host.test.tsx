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

  it("首屏不挂 src，preload=none，点击播放前不预拉音频", async () => {
    useArticleMusic.getState().init({
      url: "https://example.com/a.mp3",
      name: "春夏秋冬",
    });

    render(<ArticleMusicHost />);

    const audio = screen.getByTestId("article-music-audio");
    expect(audio).not.toHaveAttribute("src");
    expect(audio).toHaveAttribute("preload", "none");
    expect(audio).not.toHaveAttribute("crossorigin");
    await waitFor(() => expect(useArticleMusic.getState().audioEl).toBe(audio));
  });

  it("无曲目时不渲染 audio", () => {
    render(<ArticleMusicHost />);
    expect(screen.queryByTestId("article-music-audio")).not.toBeInTheDocument();
  });
});
