import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@repo/ui";
import { AdminConfirmPopover } from "./AdminConfirmPopover";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("AdminConfirmPopover", () => {
  const onConfirm = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("点击触发器后展示确认浮层", async () => {
    const user = userEvent.setup();
    render(
      <AdminConfirmPopover
        ariaLabel="确认删除测试项"
        message="确定删除吗？"
        confirmLabel="删除"
        onConfirm={onConfirm}
        destructive
      >
        <Button>删除</Button>
      </AdminConfirmPopover>,
    );

    await user.click(screen.getByRole("button", { name: "删除" }));
    const dialog = screen.getByRole("dialog", { name: "确认删除测试项" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("确定删除吗？")).toBeInTheDocument();
    expect(screen.getByTestId("icon-alert-circle")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "删除" })).toHaveClass("bg-destructive");
    expect(within(dialog).getByRole("button", { name: "取消" }).parentElement).toHaveClass(
      "border-t",
      "bg-muted/20",
    );
  });

  it("确认后调用 onConfirm 并关闭浮层", async () => {
    const user = userEvent.setup();
    render(
      <AdminConfirmPopover
        ariaLabel="确认操作"
        message="确定继续吗？"
        confirmLabel="确认"
        onConfirm={onConfirm}
      >
        <Button>操作</Button>
      </AdminConfirmPopover>,
    );

    await user.click(screen.getByRole("button", { name: "操作" }));
    await user.click(screen.getByRole("button", { name: "确认" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "确认操作" })).not.toBeInTheDocument();
  });
});
