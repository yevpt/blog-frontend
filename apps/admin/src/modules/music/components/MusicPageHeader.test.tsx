import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MusicPageHeader } from "./MusicPageHeader";

const defaultProps = {
  activeTab: "songs" as const,
  onTabChange: vi.fn(),
  onCreateSong: vi.fn(),
  onCreateArtist: vi.fn(),
  onCreateAlbum: vi.fn(),
};

describe("MusicPageHeader", () => {
  it("用语义化页签渲染资料库分组并切换", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();

    render(<MusicPageHeader {...defaultProps} onTabChange={onTabChange} />);

    expect(screen.getByRole("tablist", { name: "音乐管理分组" })).toHaveClass("border-b", "w-full");
    expect(screen.getByRole("tab", { name: "歌曲" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "歌手" }));

    expect(onTabChange).toHaveBeenCalledWith("artists");
  });

  it("新建按钮跟随当前分组调用对应操作", async () => {
    const user = userEvent.setup();
    const onCreateAlbum = vi.fn();

    render(<MusicPageHeader {...defaultProps} activeTab="albums" onCreateAlbum={onCreateAlbum} />);

    await user.click(screen.getByRole("button", { name: "新建专辑" }));

    expect(onCreateAlbum).toHaveBeenCalledTimes(1);
  });
});
