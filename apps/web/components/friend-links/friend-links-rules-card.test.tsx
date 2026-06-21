import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FRIEND_LINK_TEMPLATE, FriendLinksRulesCard } from "./friend-links-rules-card";

describe("FriendLinksRulesCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("默认展开，渲染申请规则内容", () => {
    render(<FriendLinksRulesCard />);
    expect(screen.getByText(/vpt940417@gmail\.com/)).toBeTruthy();
    expect(screen.getByText(/YEVPT/)).toBeTruthy();
    expect(screen.getByText(/注①/)).toBeTruthy();
  });

  it("点击复制按钮将友链模板写入剪贴板", async () => {
    render(<FriendLinksRulesCard />);
    await userEvent.click(screen.getByRole("button", { name: "复制模板" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FRIEND_LINK_TEMPLATE);
  });

  it("复制成功后按钮 aria-label 变为「已复制」", async () => {
    render(<FriendLinksRulesCard />);
    await userEvent.click(screen.getByRole("button", { name: "复制模板" }));
    expect(screen.getByRole("button", { name: "已复制" })).toBeTruthy();
  });

  it("点击「收起」后 aria-expanded 变为 false", async () => {
    render(<FriendLinksRulesCard />);
    const toggleBtn = screen.getByRole("button", { name: /收起/ });
    await userEvent.click(toggleBtn);
    // 内容保留在 DOM 中，通过 CSS grid 动画隐藏，以 aria-expanded 验证折叠状态
    expect(screen.getByRole("button", { name: /展开/ }).getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it("折叠后点击「展开」aria-expanded 恢复 true", async () => {
    render(<FriendLinksRulesCard />);
    const toggleBtn = screen.getByRole("button", { name: /收起/ });
    await userEvent.click(toggleBtn);
    const expandBtn = screen.getByRole("button", { name: /展开/ });
    await userEvent.click(expandBtn);
    expect(screen.getByRole("button", { name: /收起/ }).getAttribute("aria-expanded")).toBe("true");
  });
});
