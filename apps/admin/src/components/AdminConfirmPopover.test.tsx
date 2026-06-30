import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@repo/ui";
import { AdminConfirmPopover } from "./AdminConfirmPopover";

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
    expect(screen.getByRole("dialog", { name: "确认删除测试项" })).toBeInTheDocument();
    expect(screen.getByText("确定删除吗？")).toBeInTheDocument();
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
