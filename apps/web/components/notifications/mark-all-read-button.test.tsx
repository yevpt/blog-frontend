import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkAllReadButton } from "./mark-all-read-button";

describe("MarkAllReadButton", () => {
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("无未读时禁用触发按钮", () => {
    render(<MarkAllReadButton unreadCount={0} onConfirm={onConfirm} />);
    expect(screen.getByRole("button", { name: "全部已读" })).toBeDisabled();
  });

  it("点击后弹出确认框，确认才调用 onConfirm", async () => {
    const user = userEvent.setup();
    render(<MarkAllReadButton unreadCount={3} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "全部已读" }));
    expect(screen.getByRole("dialog", { name: "确认全部已读" })).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "确认" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("点击取消不调用 onConfirm", async () => {
    const user = userEvent.setup();
    render(<MarkAllReadButton unreadCount={2} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "全部已读" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "确认全部已读" })).not.toBeInTheDocument();
  });
});
