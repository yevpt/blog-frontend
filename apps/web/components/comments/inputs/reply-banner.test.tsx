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
});
