import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryFormDialog } from "./CategoryFormDialog";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("CategoryFormDialog", () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("新建模式展示默认排序", () => {
    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={3}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  it("展示视觉素材开发中占位", () => {
    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("开发中")).toBeInTheDocument();
    expect(screen.getByText(/图标与封面尚未开放配置/)).toBeInTheDocument();
  });

  it("缺少必填项时不提交", async () => {
    const user = userEvent.setup();
    render(
      <CategoryFormDialog
        mode="create"
        open
        category={null}
        nextSeq={0}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "创建" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("请输入分类名称")).toBeInTheDocument();
  });
});
