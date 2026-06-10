import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastQueue } from "./toast";
import { ToastRegion, type ToastContent } from "./toast";

function makeQueue(...items: ToastContent[]) {
  const q = new ToastQueue<ToastContent>({ maxVisibleToasts: 5 });
  items.forEach((item) => q.add(item));
  return q;
}

describe("ToastRegion", () => {
  it("没有 toast 时不渲染任何消息文字", () => {
    const queue = makeQueue();
    render(<ToastRegion queue={queue} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("渲染 success toast 消息文字", () => {
    const queue = makeQueue({ message: "登录成功", type: "success" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("登录成功")).toBeInTheDocument();
  });

  it("渲染 error toast 消息文字", () => {
    const queue = makeQueue({ message: "操作失败", type: "error" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("操作失败")).toBeInTheDocument();
  });

  it("点击关闭按钮后 toast 消失", async () => {
    const user = userEvent.setup();
    const queue = makeQueue({ message: "测试通知", type: "info" });
    render(<ToastRegion queue={queue} />);
    expect(screen.getByText("测试通知")).toBeInTheDocument();
    await user.click(screen.getByLabelText("关闭通知"));
    expect(screen.queryByText("测试通知")).not.toBeInTheDocument();
  });
});
