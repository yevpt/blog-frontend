import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

vi.mock("../tooltip/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("渲染不崩溃（无 src）", () => {
    const { container } = render(<Avatar />);
    expect(container.firstChild).toBeTruthy();
  });

  it("渲染图片时显示 img 元素", () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="用户头像" />);
    expect(screen.getByRole("img", { name: "用户头像" })).toBeTruthy();
  });

  it("无 src 时显示 fallback 图标（user）", () => {
    render(<Avatar />);
    expect(screen.getByTestId("icon-user")).toBeTruthy();
  });

  it("有 initials 时显示首字母", () => {
    render(<Avatar initials="AB" />);
    expect(screen.getByText("AB")).toBeTruthy();
  });

  it("size 变体渲染不崩溃", () => {
    const sizes = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
    sizes.forEach((size) => {
      const { unmount } = render(<Avatar size={size} />);
      unmount();
    });
  });

  it("status=online 时渲染在线指示器（span 元素）", () => {
    const { container } = render(<Avatar status="online" />);
    expect(container.querySelector("span")).toBeTruthy();
  });

  it("src 变化后重新尝试加载图片", () => {
    const { rerender } = render(<Avatar src="https://bad.example/a.png" alt="头像" />);
    fireEvent.error(screen.getByRole("img", { name: "头像" }));
    expect(screen.queryByRole("img", { name: "头像" })).toBeNull();

    rerender(<Avatar src="https://good.example/b.png" alt="头像" />);
    expect(screen.getByRole("img", { name: "头像" })).toHaveAttribute(
      "src",
      "https://good.example/b.png",
    );
  });
});
