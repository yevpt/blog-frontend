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

  it("渲染申请规则内容", () => {
    render(<FriendLinksRulesCard />);
    expect(screen.getByText(/vpt940417@gmail\.com/)).toBeTruthy();
    expect(screen.getByText(/YEVPT/)).toBeTruthy();
    expect(screen.getByText(/注①/)).toBeTruthy();
  });

  it("不渲染交换友链标题和展开收起按钮", () => {
    render(<FriendLinksRulesCard />);
    expect(screen.queryByText("交换友链")).toBeNull();
    expect(screen.queryByRole("button", { name: /收起/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /展开/ })).toBeNull();
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
});
