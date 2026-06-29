// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReplyBanner } from "./reply-banner";

describe("ReplyBanner", () => {
  it("展示被回复的用户名", () => {
    render(<ReplyBanner toUsername="alice" onCancel={() => {}} />);
    expect(screen.getByText("回复")).toBeTruthy();
    expect(screen.getByText("@alice")).toBeTruthy();
  });

  it("点击 × 触发 onCancel", async () => {
    const onCancel = vi.fn();
    render(<ReplyBanner toUsername="alice" onCancel={onCancel} />);
    await userEvent.click(screen.getByLabelText("取消回复"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("editing 模式展示「编辑中」而非 @username", () => {
    render(<ReplyBanner toUsername="anything" onCancel={() => {}} editing />);
    expect(screen.getByText("编辑中")).toBeTruthy();
    expect(screen.queryByText("@anything")).toBeNull();
    expect(screen.getByLabelText("取消编辑")).toBeTruthy();
  });

  it("editing 模式点击 × 触发 onCancel", async () => {
    const onCancel = vi.fn();
    render(<ReplyBanner toUsername="anything" onCancel={onCancel} editing />);
    await userEvent.click(screen.getByLabelText("取消编辑"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("待审版本编辑时明确提示内容正在审核", () => {
    render(<ReplyBanner toUsername="anything" onCancel={() => {}} editing pendingReview />);

    expect(screen.getByText("编辑中 · 内容正在审核")).toBeTruthy();
  });
});
