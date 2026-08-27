import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MusicArtistFormDialog } from "./MusicArtistFormDialog";

describe("MusicArtistFormDialog", () => {
  it("使用统一标题、正文和底部操作区", () => {
    render(
      <MusicArtistFormDialog
        mode="create"
        open
        artist={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onUploadAvatar={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText("音乐资料库")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭歌手表单" })).toBeInTheDocument();
    expect(screen.getByLabelText("歌手简介")).toHaveClass("min-h-28", "shadow-xs");
    expect(screen.getByRole("button", { name: "创建" }).closest("footer")).toHaveClass(
      "bg-muted/15",
    );
  });
});
