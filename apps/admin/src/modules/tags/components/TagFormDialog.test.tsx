import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagFormDialog } from "./TagFormDialog";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("TagFormDialog", () => {
  it("展示展示设置开发中标记", () => {
    render(
      <TagFormDialog
        mode="create"
        open
        tag={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={() => {}}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("开发中")).toBeInTheDocument();
    expect(screen.getByText(/图标、封面与描述尚未开放配置/)).toBeInTheDocument();
    expect(screen.getByText("内容组织")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭标签表单" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建" }).closest("footer")).toHaveClass(
      "bg-muted/15",
    );
  });

  it("展开后展示占位内容", async () => {
    const user = userEvent.setup();

    render(
      <TagFormDialog
        mode="edit"
        open
        tag={{
          id: "1",
          name: "Go",
          description: "Go 语言",
          seq: 0,
          articleCount: 2,
        }}
        nextSeq={1}
        isSubmitting={false}
        onClose={() => {}}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("Go 语言")).toBeInTheDocument();
    expect(screen.getByText(/已有历史数据，待功能完善后可编辑/)).toBeInTheDocument();
  });
});
