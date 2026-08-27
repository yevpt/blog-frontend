import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MusicSongFormDialog } from "./MusicSongFormDialog";

describe("MusicSongFormDialog", () => {
  it("展示完整的统一音乐表单骨架", () => {
    render(
      <MusicSongFormDialog
        mode="create"
        open
        row={null}
        artists={[]}
        albums={[]}
        nextSeq={0}
        isSubmitting={false}
        onClose={vi.fn()}
        onUploadAudio={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const heading = screen.getByRole("heading", { name: "新建音乐" });
    expect(screen.getByText("音乐资料库")).toBeInTheDocument();
    expect(heading.closest("header")).toHaveClass("sm:px-6", "bg-card/95");
    expect(screen.getByRole("button", { name: "关闭音乐表单" })).toBeInTheDocument();
    expect(screen.getByLabelText("歌词")).toHaveClass("min-h-28", "shadow-xs");
    expect(screen.getByRole("button", { name: "创建" }).closest("footer")).toHaveClass(
      "bg-muted/15",
    );
  });
});
