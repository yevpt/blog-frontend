import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MusicAlbumFormDialog } from "./MusicAlbumFormDialog";

describe("MusicAlbumFormDialog", () => {
  it("使用统一标题、正文和底部操作区", () => {
    render(
      <MusicAlbumFormDialog
        mode="create"
        open
        album={null}
        artists={[]}
        isSubmitting={false}
        onClose={vi.fn()}
        onUploadCover={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText("音乐资料库")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭专辑表单" })).toBeInTheDocument();
    expect(screen.getByLabelText("专辑简介")).toHaveClass("min-h-28", "shadow-xs");
    expect(screen.getByRole("button", { name: "创建" }).closest("footer")).toHaveClass(
      "bg-muted/15",
    );
  });
});
