import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginModal } from "./login-modal";
import { useLoginModal } from "@/store/use-login-modal";

beforeEach(() => {
  useLoginModal.setState({ isOpen: false, view: "login" });
});

describe("LoginModal", () => {
  it("isOpen=false 时不渲染 dialog", () => {
    render(<LoginModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("isOpen=true 时渲染弹窗并显示登录视图", () => {
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("欢迎回来")).toBeInTheDocument();
  });

  it("isOpen=true, view=register 时显示注册视图", () => {
    useLoginModal.setState({ isOpen: true, view: "register" });
    render(<LoginModal />);
    expect(screen.getByRole("heading", { name: "创建账号" })).toBeInTheDocument();
  });

  it("登录视图：返回按钮点击关闭弹窗", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    await user.click(screen.getByLabelText("关闭登录弹窗"));
    expect(useLoginModal.getState().isOpen).toBe(false);
  });

  it("注册视图：返回按钮点击切回登录视图", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "register" });
    render(<LoginModal />);
    await user.click(screen.getByLabelText("返回登录视图"));
    expect(useLoginModal.getState().view).toBe("login");
    expect(useLoginModal.getState().isOpen).toBe(true);
  });

  it("点击遮罩不关闭弹窗", () => {
    useLoginModal.setState({ isOpen: true, view: "login" });
    const { container } = render(<LoginModal />);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(useLoginModal.getState().isOpen).toBe(true);
  });

  it("点击「注册」标签切换到注册视图", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    await user.click(screen.getByRole("button", { name: "注册" }));
    expect(useLoginModal.getState().view).toBe("register");
  });
});
