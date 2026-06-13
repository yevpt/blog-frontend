import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { FriendLinksRulesCard } from "./friend-links-rules-card";

describe("FriendLinksRulesCard", () => {
  it("默认展开，渲染申请规则内容", () => {
    render(<FriendLinksRulesCard />);
    expect(screen.getByText(/vpt940417@gmail\.com/)).toBeTruthy();
    expect(screen.getByText(/YEVPT/)).toBeTruthy();
    expect(screen.getByText(/注①/)).toBeTruthy();
  });

  it("点击「收起」后隐藏规则内容", async () => {
    render(<FriendLinksRulesCard />);
    const toggleBtn = screen.getByRole("button", { name: /收起/ });
    await userEvent.click(toggleBtn);
    expect(screen.queryByText(/vpt940417@gmail\.com/)).toBeNull();
  });

  it("折叠后点击「展开」重新显示内容", async () => {
    render(<FriendLinksRulesCard />);
    const toggleBtn = screen.getByRole("button", { name: /收起/ });
    await userEvent.click(toggleBtn);
    const expandBtn = screen.getByRole("button", { name: /展开/ });
    await userEvent.click(expandBtn);
    expect(screen.getByText(/vpt940417@gmail\.com/)).toBeTruthy();
  });
});
