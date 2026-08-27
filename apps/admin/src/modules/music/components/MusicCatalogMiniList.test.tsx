import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MusicCatalogMiniList } from "./MusicCatalogMiniList";

describe("MusicCatalogMiniList", () => {
  it("详情弹窗提供统一信息层级与关闭动作", async () => {
    const user = userEvent.setup();
    render(
      <MusicCatalogMiniList
        tab="artists"
        rows={[]}
        artists={[
          {
            id: 1,
            name: "Aimer",
            display_name: "Aimer",
            description: "日本歌手",
          },
        ]}
        albums={[]}
        isLoading={false}
        onEditArtist={vi.fn()}
        onEditAlbum={vi.fn()}
        deletingKey={null}
        onConfirmDeleteArtist={vi.fn().mockResolvedValue(undefined)}
        onConfirmDeleteAlbum={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "查看 Aimer 详情" }));

    expect(screen.getByText("歌手详情")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭音乐详情" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭" }).closest("footer")).toHaveClass(
      "bg-muted/15",
    );
  });
});
