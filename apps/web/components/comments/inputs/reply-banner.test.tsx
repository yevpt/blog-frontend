// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReplyBanner } from "./reply-banner";

vi.mock("@repo/ui", () => ({
  Button: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <button type="button" onClick={onPress}>
      {children}
    </button>
  ),
}));

describe("ReplyBanner", () => {
  it("展示被回复的用户名", () => {
    render(<ReplyBanner toUsername="alice" onCancel={() => {}} />);
    expect(screen.getByText("@alice")).toBeTruthy();
  });

  it("点击取消触发 onCancel", () => {
    const onCancel = vi.fn();
    render(<ReplyBanner toUsername="alice" onCancel={onCancel} />);
    screen.getByText("取消").click();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
