import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleEditorTopBar } from "./ArticleEditorTopBar";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("ArticleEditorTopBar", () => {
  it("新建页展示标题与保存按钮", () => {
    const { container } = render(
      <ArticleEditorTopBar
        isEditing={false}
        statusLabel="草稿"
        isSaving={false}
        disabledReason={null}
        onBack={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "新建文章" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回文章列表" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
    const header = container.querySelector("header");
    expect(header).toHaveClass("grid", "gap-3", "sm:grid-cols-[minmax(0,1fr)_auto]");
    expect(header).not.toHaveClass("-mx-3");
  });

  it("保存加载时保持按钮文案与宽度占位", () => {
    render(
      <ArticleEditorTopBar
        isEditing={true}
        statusLabel="草稿"
        isSaving={true}
        disabledReason="正在保存中..."
        onBack={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "保存" })).toHaveAttribute("data-pending", "true");
    expect(screen.queryByRole("button", { name: "保存中…" })).not.toBeInTheDocument();
  });
});
