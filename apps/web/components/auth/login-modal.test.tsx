import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { LoginModal } from "./login-modal";
import { useLoginModal } from "@/store/use-login-modal";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

describe("LoginModal", () => {
  beforeEach(() => {
    useLoginModal.setState({ isOpen: false });
  });

  it("关闭时不渲染弹窗", () => {
    render(<LoginModal />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("打开时显示占位登录内容", () => {
    useLoginModal.setState({ isOpen: true });

    render(<LoginModal />);

    expect(screen.getByRole("dialog", { name: "登录" })).toBeTruthy();
    expect(screen.getByText("登录功能即将上线，敬请期待。")).toBeTruthy();
  });

  it("点击关闭按钮关闭弹窗", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true });

    render(<LoginModal />);
    await user.click(screen.getByLabelText("关闭登录弹窗"));

    expect(useLoginModal.getState().isOpen).toBe(false);
  });
});
