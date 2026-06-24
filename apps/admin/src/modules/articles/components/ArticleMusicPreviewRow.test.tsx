import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleMusicPreviewRow } from "./ArticleMusicPreviewRow";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("ArticleMusicPreviewRow", () => {
  const playMock = vi.fn();
  const pauseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    playMock.mockResolvedValue(undefined);
    HTMLAudioElement.prototype.play = playMock;
    HTMLAudioElement.prototype.pause = pauseMock;
  });

  it("展示曲名与歌手信息", () => {
    render(
      <ArticleMusicPreviewRow
        trackId={1}
        title="Midnight Drafts"
        artist="Luma"
        durationSeconds={222}
        url="https://cdn.example.com/a.mp3"
        actions={<button type="button">操作</button>}
      />,
    );

    expect(screen.getByText("Midnight Drafts")).toBeInTheDocument();
    expect(screen.getByText("Luma · 03:42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "播放 Midnight Drafts" })).toBeEnabled();
  });

  it("无 url 时禁用播放按钮", () => {
    render(
      <ArticleMusicPreviewRow
        trackId={1}
        title="Midnight Drafts"
        artist="Luma"
        durationSeconds={222}
        actions={null}
      />,
    );

    expect(screen.getByRole("button", { name: "播放 Midnight Drafts" })).toBeDisabled();
  });

  it("播放后展示进度区域", async () => {
    const user = userEvent.setup();

    render(
      <ArticleMusicPreviewRow
        trackId={1}
        title="Midnight Drafts"
        artist="Luma"
        durationSeconds={222}
        url="https://cdn.example.com/a.mp3"
        actions={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "播放 Midnight Drafts" }));

    expect(playMock).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "暂停 Midnight Drafts" })).toBeInTheDocument();
    expect(screen.getByLabelText("播放进度")).toBeInTheDocument();
    expect(screen.getByText(/0:00 \/ 03:42/)).toBeInTheDocument();
  });
});
